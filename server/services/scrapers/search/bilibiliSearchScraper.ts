/**
 * B站搜索爬虫 - 使用API方式
 * 参考微博搜索爬虫的实现方式
 */

/**
 * B站搜索结果接口
 */
export interface BilibiliSearchResult {
    id: string;
    title: string;
    desc?: string;
    author: {
        name: string;
        mid?: string;
        avatar?: string;
        profileUrl?: string;
    };
    cover?: string;
    duration?: string;
    publishTime?: string;
    url: string;
    type: 'video' | 'bangumi' | 'article' | 'live';
    stats: {
        views: number;
        danmaku: number;
        likes?: number;
        coins?: number;
        favorites?: number;
        shares?: number;
        replies?: number;
    };
    tags?: string[];
    bvid?: string;
    aid?: string;
}

/**
 * B站搜索响应接口
 */
export interface BilibiliSearchResponse {
    keyword: string;
    total?: number;
    page: number;
    results: BilibiliSearchResult[];
    hasMore: boolean;
}

/**
 * 搜索选项
 */
export interface BilibiliSearchOptions {
    page?: number;
    limit?: number;
    searchType?: 'video' | 'bangumi' | 'article' | 'live';
}

// 上次请求时间（用于限速）
let lastRequestTime: number = 0;
const MIN_REQUEST_INTERVAL = 200; // 最小请求间隔：1秒

/**
 * 延迟函数，控制请求速度
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 请求限速：确保两次请求之间至少间隔指定时间
 */
async function rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - elapsed;
        await delay(waitTime);
    }
    lastRequestTime = Date.now();
}

/**
 * 从环境变量获取B站cookie
 */
function getBilibiliCookieFromEnv(): string | null {
    const cookie = process.env.BILIBILI_COOKIE || 
                   process.env.BILI_COOKIE || 
                   null;
    
    if (cookie) {
        console.log(`[BilibiliSearch] 从环境变量读取到cookie，长度: ${cookie.length}`);
    } else {
        console.warn(`[BilibiliSearch] 未找到cookie，可能无法访问完整搜索结果。请在.env文件中设置 BILIBILI_COOKIE`);
    }
    
    return cookie;
}

/**
 * 构建搜索API URL
 */
function buildSearchUrl(keyword: string, searchType: string, page: number, pageSize: number): string {
    const encodedKeyword = encodeURIComponent(keyword);
    const baseUrl = 'https://api.bilibili.com/x/web-interface/search/type';
    
    // 搜索类型映射
    const typeMap: Record<string, string> = {
        'video': 'video',
        'bangumi': 'media_bangumi',
        'article': 'article',
        'live': 'live'
    };
    
    const type = typeMap[searchType] || 'video';
    
    return `${baseUrl}?keyword=${encodedKeyword}&search_type=${type}&page=${page}&page_size=${pageSize}`;
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
 * 格式化时长（秒转 mm:ss）
 */
function formatDuration(seconds: number): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 解析视频搜索结果
 */
function parseVideoResult(item: any): BilibiliSearchResult | null {
    try {
        const bvid = item.bvid || '';
        const aid = item.aid?.toString() || '';
        const id = bvid || aid || '';
        
        if (!id) return null;
        
        return {
            id,
            bvid,
            aid,
            title: cleanHtml(item.title || ''),
            desc: cleanHtml(item.description || ''),
            author: {
                name: item.author || '',
                mid: item.mid?.toString() || '',
                avatar: item.pic || '',
                profileUrl: item.mid ? `https://space.bilibili.com/${item.mid}` : ''
            },
            cover: item.pic || '',
            duration: formatDuration(item.duration || 0),
            publishTime: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : '',
            url: bvid ? `https://www.bilibili.com/video/${bvid}` : `https://www.bilibili.com/video/av${aid}`,
            type: 'video',
            stats: {
                views: parseInt(item.play || '0') || 0,
                danmaku: parseInt(item.video_review || '0') || 0,
                likes: parseInt(item.like || '0') || 0,
                coins: parseInt(item.coins || '0') || 0,
                favorites: parseInt(item.favorites || '0') || 0,
                shares: parseInt(item.share || '0') || 0,
                replies: parseInt(item.review || '0') || 0
            },
            tags: item.tag ? item.tag.split(',') : undefined
        };
    } catch (error) {
        console.error('[BilibiliSearch] 解析视频数据失败:', error);
        return null;
    }
}

/**
 * 解析番剧搜索结果
 */
function parseBangumiResult(item: any): BilibiliSearchResult | null {
    try {
        const mediaId = item.media_id?.toString() || '';
        if (!mediaId) return null;
        
        return {
            id: mediaId,
            title: cleanHtml(item.title || ''),
            desc: cleanHtml(item.media_type_name || ''),
            author: {
                name: item.staff || '',
                avatar: item.cover || ''
            },
            cover: item.cover || '',
            url: `https://www.bilibili.com/bangumi/media/md${mediaId}`,
            type: 'bangumi',
            stats: {
                views: parseInt(item.cv || '0') || 0,
                danmaku: 0
            }
        };
    } catch (error) {
        console.error('[BilibiliSearch] 解析番剧数据失败:', error);
        return null;
    }
}

/**
 * 解析文章搜索结果
 */
function parseArticleResult(item: any): BilibiliSearchResult | null {
    try {
        const id = item.id?.toString() || '';
        if (!id) return null;
        
        return {
            id,
            title: cleanHtml(item.title || ''),
            desc: cleanHtml(item.summary || ''),
            author: {
                name: item.author || '',
                mid: item.mid?.toString() || '',
                profileUrl: item.mid ? `https://space.bilibili.com/${item.mid}` : ''
            },
            cover: item.image_urls?.[0] || '',
            publishTime: item.publish_time ? new Date(item.publish_time * 1000).toISOString() : '',
            url: `https://www.bilibili.com/read/cv${id}`,
            type: 'article',
            stats: {
                views: parseInt(item.view || '0') || 0,
                danmaku: parseInt(item.reply || '0') || 0,
                likes: parseInt(item.like || '0') || 0,
                coins: parseInt(item.coin || '0') || 0,
                favorites: parseInt(item.favorite || '0') || 0
            }
        };
    } catch (error) {
        console.error('[BilibiliSearch] 解析文章数据失败:', error);
        return null;
    }
}

/**
 * 解析直播搜索结果
 */
function parseLiveResult(item: any): BilibiliSearchResult | null {
    try {
        const roomId = item.roomid?.toString() || '';
        if (!roomId) return null;
        
        return {
            id: roomId,
            title: cleanHtml(item.title || ''),
            desc: cleanHtml(item.tags || ''),
            author: {
                name: item.uname || '',
                mid: item.uid?.toString() || '',
                avatar: item.user_cover || '',
                profileUrl: item.uid ? `https://space.bilibili.com/${item.uid}` : ''
            },
            cover: item.user_cover || item.cover || '',
            url: `https://live.bilibili.com/${roomId}`,
            type: 'live',
            stats: {
                views: parseInt(item.online || '0') || 0,
                danmaku: 0
            }
        };
    } catch (error) {
        console.error('[BilibiliSearch] 解析直播数据失败:', error);
        return null;
    }
}

/**
 * 从B站搜索并提取结果
 */
export async function scrapeBilibiliSearch(
    keyword: string,
    options: BilibiliSearchOptions = {}
): Promise<BilibiliSearchResponse> {
    const { page: pageNum = 1, limit = 20, searchType = 'video' } = options;
    
    console.log(`[BilibiliSearch] 开始搜索: ${keyword}, 类型: ${searchType}, 页码: ${pageNum}`);
    
    try {
        // 请求限速
        await rateLimit();
        
        const cookieString = getBilibiliCookieFromEnv();
        const apiUrl = buildSearchUrl(keyword, searchType, pageNum, limit);
        
        console.log(`[BilibiliSearch] 请求API: ${apiUrl}`);
        
        // 构建请求头
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.bilibili.com/',
            'Origin': 'https://www.bilibili.com'
        };
        
        if (cookieString) {
            headers['Cookie'] = cookieString;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers,
        });
        
        if (!response.ok) {
            console.error(`[BilibiliSearch] API请求失败: ${response.status} ${response.statusText}`);
            return {
                keyword,
                page: pageNum,
                results: [],
                hasMore: false
            };
        }
        
        const json = await response.json();
        
        // 检查API返回状态
        if (json.code !== 0) {
            console.error(`[BilibiliSearch] API返回错误: ${json.message || json.msg || 'unknown error'}, code: ${json.code}`);
            return {
                keyword,
                page: pageNum,
                results: [],
                hasMore: false
            };
        }
        
        // 解析搜索结果
        const results: BilibiliSearchResult[] = [];
        const data = json.data || {};
        const resultList = data.result || [];
        
        // 根据搜索类型选择解析函数
        let parseFunction: (item: any) => BilibiliSearchResult | null;
        switch (searchType) {
            case 'video':
                parseFunction = parseVideoResult;
                break;
            case 'bangumi':
                parseFunction = parseBangumiResult;
                break;
            case 'article':
                parseFunction = parseArticleResult;
                break;
            case 'live':
                parseFunction = parseLiveResult;
                break;
            default:
                parseFunction = parseVideoResult;
        }
        
        for (const item of resultList) {
            if (results.length >= limit) break;
            const result = parseFunction(item);
            if (result) {
                results.push(result);
            }
        }
        
        // 判断是否还有更多
        const total = data.numResults || data.numPages || 0;
        const hasMore = resultList.length > 0 && results.length >= limit;
        
        console.log(`[BilibiliSearch] 找到 ${results.length} 条结果，总计: ${total}`);
        
        return {
            keyword,
            total,
            page: pageNum,
            results,
            hasMore
        };
        
    } catch (error: any) {
        console.error(`[BilibiliSearch] 搜索失败: ${error.message}`);
        return {
            keyword,
            page: pageNum,
            results: [],
            hasMore: false
        };
    }
}

