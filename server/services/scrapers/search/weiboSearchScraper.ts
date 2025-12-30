/**
 * 微博搜索爬虫 - 使用移动端API
 * 改用 m.weibo.cn 移动端API，返回JSON数据，更稳定
 * 
 * 改进措施：
 * - 自适应频率控制
 * - User-Agent 轮换
 * - 重试机制
 * - 真实请求头
 */

import { 
    getRandomUserAgent, 
    getRealisticHeaders, 
    AdaptiveRateLimiter, 
    retryWithBackoff 
} from '../utils/scraperUtils.js';

// 创建自适应频率控制器（基础间隔5秒，最大30秒，最小2秒）
const rateLimiter = new AdaptiveRateLimiter(5000, 30000, 2000);

/**
 * 微博搜索结果接口
 */
export interface WeiboSearchResult {
    id: string;
    text: string;
    author: {
        name: string;
        avatar?: string;
        profileUrl?: string;
    };
    publishTime?: string;
    publishFrom?: string;
    url: string;
    images?: string[];
    video?: {
        cover?: string;
        url?: string;
        duration?: string;
    };
    stats: {
        reposts: number;
        comments: number;
        likes: number;
        views?: number;
    };
    topics?: string[];
    mentions?: string[];
    isRepost?: boolean;
    originalWeibo?: {
        id?: string;
        text?: string;
        author?: string;
    };
}

/**
 * 微博搜索响应接口
 */
export interface WeiboSearchResponse {
    keyword: string;
    total?: number;
    page: number;
    results: WeiboSearchResult[];
    hasMore: boolean;
}

/**
 * 搜索选项
 */
export interface WeiboSearchOptions {
    page?: number;
    limit?: number;
}

/**
 * 从环境变量获取微博cookie
 */
function getWeiboCookieFromEnv(): string | null {
    const cookie = process.env.WEIBO_COOKIE || 
                   process.env.WEIBO_SEARCH_COOKIE || 
                   null;
    
    if (cookie) {
        console.log(`[WeiboSearch] 从环境变量读取到cookie，长度: ${cookie.length}`);
    }
    
    return cookie;
}

/**
 * 构建移动端搜索API URL
 */
function buildMobileSearchUrl(keyword: string, page: number): string {
    const encodedKeyword = encodeURIComponent(keyword);
    const containerid = `100103type%3D1%26q%3D${encodedKeyword}`;
    return `https://m.weibo.cn/api/container/getIndex?containerid=${containerid}&page_type=searchall&page=${page}`;
}

/**
 * 清理HTML标签，保留纯文本
 */
function cleanHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();
}

/**
 * 解析API返回的微博数据
 */
function parseWeiboCard(card: any): WeiboSearchResult | null {
    try {
        const mblog = card.mblog;
        if (!mblog) return null;
        
        const user = mblog.user || {};
        
        // 提取图片
        const images: string[] = [];
        if (mblog.pics && Array.isArray(mblog.pics)) {
            mblog.pics.forEach((pic: any) => {
                const imgUrl = pic.large?.url || pic.url || '';
                if (imgUrl) images.push(imgUrl);
            });
        }
        
        // 提取视频
        let video: WeiboSearchResult['video'] = undefined;
        if (mblog.page_info?.type === 'video') {
            video = {
                cover: mblog.page_info.page_pic?.url || '',
                url: mblog.page_info.urls?.mp4_720p_mp4 || 
                     mblog.page_info.urls?.mp4_hd_mp4 || 
                     mblog.page_info.urls?.mp4_ld_mp4 || '',
                duration: mblog.page_info.play_count ? `${mblog.page_info.play_count}次播放` : ''
            };
        }
        
        // 清理文本
        const text = cleanHtml(mblog.text || '');
        
        // 提取话题和@提及
        const topics = text.match(/#[^#]+#/g) || [];
        const mentions = text.match(/@[^\s@]+/g) || [];
        
        // 处理转发
        let isRepost = false;
        let originalWeibo: WeiboSearchResult['originalWeibo'] = undefined;
        if (mblog.retweeted_status) {
            isRepost = true;
            const orig = mblog.retweeted_status;
            originalWeibo = {
                id: orig.id?.toString() || '',
                text: cleanHtml(orig.text || ''),
                author: orig.user?.screen_name || ''
            };
        }
        
        return {
            id: mblog.id?.toString() || mblog.mid?.toString() || '',
            text,
            author: {
                name: user.screen_name || '',
                avatar: user.profile_image_url || user.avatar_hd || '',
                profileUrl: user.id ? `https://weibo.com/u/${user.id}` : ''
            },
            publishTime: mblog.created_at || '',
            publishFrom: mblog.source || '',
            url: mblog.id ? `https://weibo.com/${user.id}/${mblog.bid || mblog.id}` : '',
            images: images.length > 0 ? images : undefined,
            video,
            stats: {
                reposts: mblog.reposts_count || 0,
                comments: mblog.comments_count || 0,
                likes: mblog.attitudes_count || 0,
                views: mblog.reads_count || undefined
            },
            topics: topics.length > 0 ? topics : undefined,
            mentions: mentions.length > 0 ? mentions : undefined,
            isRepost,
            originalWeibo
        };
    } catch (error) {
        console.error('[WeiboSearch] 解析微博数据失败:', error);
        return null;
    }
}

/**
 * 执行搜索请求（带重试）
 */
async function performSearch(apiUrl: string, cookieString: string | null): Promise<any> {
    return retryWithBackoff(async () => {
        // 构建请求头（使用随机UA和真实请求头）
        const headers: Record<string, string> = {
            ...getRealisticHeaders('weibo'),
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
        };
        
        if (cookieString) {
            headers['Cookie'] = cookieString;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers,
        });
        
        if (!response.ok) {
            const error: any = new Error(`API请求失败: ${response.status} ${response.statusText}`);
            error.statusCode = response.status;
            throw error;
        }
        
        return await response.json();
    }, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
    });
}

/**
 * 从微博搜索并提取结果
 */
export async function scrapeWeiboSearch(
    keyword: string,
    options: WeiboSearchOptions = {}
): Promise<WeiboSearchResponse> {
    const { page: pageNum = 1, limit = 20 } = options;
    
    console.log(`[WeiboSearch] 开始搜索: ${keyword}, 页码: ${pageNum}`);
    
    try {
        // 频率控制
        await rateLimiter.wait();
        
        const cookieString = getWeiboCookieFromEnv();
        const apiUrl = buildMobileSearchUrl(keyword, pageNum);
        
        console.log(`[WeiboSearch] 请求API: ${apiUrl}`);
        console.log(`[WeiboSearch] 当前频率控制: ${JSON.stringify(rateLimiter.getStats())}`);
        
        // 执行搜索（带重试）
        const json = await performSearch(apiUrl, cookieString);
        
        // 检查API返回状态
        if (json.ok !== 1) {
            console.error(`[WeiboSearch] API返回错误: ${json.msg || 'unknown error'}`);
            rateLimiter.onFailure();
            return {
                keyword,
                page: pageNum,
                results: [],
                hasMore: false
            };
        }
        
        // 解析搜索结果
        const results: WeiboSearchResult[] = [];
        const cards = json.data?.cards || [];
        
        for (const card of cards) {
            // card_type 9 是普通微博，11 是卡片组
            if (card.card_type === 9) {
                const result = parseWeiboCard(card);
                if (result && results.length < limit) {
                    results.push(result);
                }
            } else if (card.card_type === 11 && card.card_group) {
                // 卡片组，遍历内部卡片
                for (const innerCard of card.card_group) {
                    if (innerCard.card_type === 9) {
                        const result = parseWeiboCard(innerCard);
                        if (result && results.length < limit) {
                            results.push(result);
                        }
                    }
                }
            }
            
            if (results.length >= limit) break;
        }
        
        // 判断是否还有更多
        const hasMore = cards.length > 0 && results.length >= limit;
        
        console.log(`[WeiboSearch] 找到 ${results.length} 条结果`);
        
        // 记录成功
        rateLimiter.onSuccess();
        
        return {
            keyword,
            page: pageNum,
            results,
            hasMore
        };
        
    } catch (error: any) {
        console.error(`[WeiboSearch] 搜索失败: ${error.message}`);
        
        // 记录失败
        rateLimiter.onFailure(error.statusCode);
        
        return {
            keyword,
            page: pageNum,
            results: [],
            hasMore: false
        };
    }
}
