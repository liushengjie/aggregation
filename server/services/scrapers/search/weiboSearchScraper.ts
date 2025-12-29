/**
 * 微博搜索爬虫 - 使用移动端API
 * 改用 m.weibo.cn 移动端API，返回JSON数据，更稳定
 * 支持多种备用方案：Cookie模式、游客模式、备用API端点
 * 
 * Cookie配置：
 * - 从 .env 文件中读取 WEIBO_COOKIE 或 WEIBO_SEARCH_COOKIE
 * - 如果未设置，会自动使用游客Cookie
 */

// 确保环境变量已加载（如果dotenv尚未加载，则加载它）
import dotenv from 'dotenv';
import { resolve } from 'path';
if (!process.env.WEIBO_COOKIE && !process.env.WEIBO_SEARCH_COOKIE) {
    // 尝试加载 .env 文件（如果尚未加载）
    try {
        dotenv.config({ path: resolve(process.cwd(), '.env') });
    } catch (error) {
        // dotenv可能已经加载，忽略错误
    }
}

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

// 缓存的游客Cookie（用于无登录状态下访问）
let cachedVisitorCookie: string | null = null;
let visitorCookieExpireTime: number = 0;

/**
 * 从环境变量获取微博cookie
 * 优先从 .env 文件中的 WEIBO_COOKIE 或 WEIBO_SEARCH_COOKIE 读取
 */
function getWeiboCookieFromEnv(): string | null {
    // 优先使用 WEIBO_COOKIE，如果没有则使用 WEIBO_SEARCH_COOKIE
    const cookie = process.env.WEIBO_COOKIE ||
        process.env.WEIBO_SEARCH_COOKIE ||
        null;

    if (cookie) {
        const source = process.env.WEIBO_COOKIE ? 'WEIBO_COOKIE' : 'WEIBO_SEARCH_COOKIE';
        console.log(`[WeiboSearch] 从.env文件读取到cookie (${source})，长度: ${cookie.length}`);
    } else {
        console.log(`[WeiboSearch] .env文件中未找到WEIBO_COOKIE或WEIBO_SEARCH_COOKIE，将使用游客cookie`);
    }

    return cookie;
}

/**
 * 获取游客Cookie（用于未登录状态下的基础访问）
 * 微博移动端会为未登录用户生成临时Cookie
 */
async function getVisitorCookie(): Promise<string | null> {
    // 如果缓存的Cookie还有效（1小时内），直接返回
    if (cachedVisitorCookie && Date.now() < visitorCookieExpireTime) {
        console.log(`[WeiboSearch] 使用缓存的游客Cookie`);
        return cachedVisitorCookie;
    }

    console.log(`[WeiboSearch] 尝试获取游客Cookie...`);

    try {
        // 访问微博移动端首页获取Cookie
        const response = await fetch('https://m.weibo.cn/', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
            },
        });

        // 从响应头中提取Set-Cookie
        const setCookieHeaders = response.headers.getSetCookie?.() || [];

        if (setCookieHeaders.length > 0) {
            // 解析并组合Cookie
            const cookies = setCookieHeaders.map(cookie => {
                return cookie.split(';')[0]; // 只取Cookie名=值部分
            }).filter(Boolean);

            if (cookies.length > 0) {
                cachedVisitorCookie = cookies.join('; ');
                visitorCookieExpireTime = Date.now() + 60 * 60 * 1000; // 1小时后过期
                console.log(`[WeiboSearch] 获取到游客Cookie: ${cachedVisitorCookie.substring(0, 50)}...`);
                return cachedVisitorCookie;
            }
        }

        console.log(`[WeiboSearch] 未能从响应中获取Cookie`);
        return null;
    } catch (error: any) {
        console.error(`[WeiboSearch] 获取游客Cookie失败: ${error.message}`);
        return null;
    }
}

/**
 * 构建移动端搜索API URL
 */
function buildMobileSearchUrl(keyword: string, page: number): string {
    const encodedKeyword = encodeURIComponent(keyword);
    // containerid格式: 100103type%3D1%26q%3D关键词
    const containerid = `100103type%3D1%26q%3D${encodedKeyword}`;
    // 添加时间戳参数，避免缓存
    const timestamp = Date.now();
    return `https://m.weibo.cn/api/container/getIndex?containerid=${containerid}&page_type=searchall&page=${page}&_t=${timestamp}`;
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
 * 从微博搜索并提取结果
 */
export async function scrapeWeiboSearch(
    keyword: string,
    options: WeiboSearchOptions = {}
): Promise<WeiboSearchResponse> {
    const { page: pageNum = 1, limit = 20 } = options;

    console.log(`[WeiboSearch] 开始搜索: ${keyword}, 页码: ${pageNum}`);

    try {
        // 优先使用环境变量cookie，如果没有则使用游客cookie
        let cookieString = getWeiboCookieFromEnv();
        if (!cookieString) {
            console.log(`[WeiboSearch] 环境变量未设置cookie，尝试使用游客cookie`);
            cookieString = await getVisitorCookie();
        }
        
        const apiUrl = buildMobileSearchUrl(keyword, pageNum);

        console.log(`[WeiboSearch] 请求API: ${apiUrl}`);

        // 构建请求头 - 模拟真实浏览器请求
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://m.weibo.cn/search?containerid=100103type%3D1%26q%3D' + encodeURIComponent(keyword),
            'Origin': 'https://m.weibo.cn',
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        };

        if (cookieString) {
            headers['Cookie'] = cookieString;
            console.log(`[WeiboSearch] 使用Cookie: ${cookieString.substring(0, 50)}...`);
        } else {
            console.warn(`[WeiboSearch] 警告：未设置任何Cookie，请求可能失败或被限制`);
        }

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '无法读取错误信息');
            console.error(`[WeiboSearch] API请求失败: ${response.status} ${response.statusText}`);
            console.error(`[WeiboSearch] 响应内容: ${errorText.substring(0, 500)}`);
            return {
                keyword,
                page: pageNum,
                results: [],
                hasMore: false
            };
        }

        let json: any;
        let responseText: string;
        try {
            responseText = await response.text();
            if (!responseText || responseText.trim() === '') {
                console.error(`[WeiboSearch] API返回空响应`);
                return {
                    keyword,
                    page: pageNum,
                    results: [],
                    hasMore: false
                };
            }
            json = JSON.parse(responseText);
        } catch (parseError: any) {
            console.error(`[WeiboSearch] JSON解析失败: ${parseError.message}`);
            console.error(`[WeiboSearch] 响应内容: ${responseText?.substring(0, 500) || '无法读取'}`);
            return {
                keyword,
                page: pageNum,
                results: [],
                hasMore: false
            };
        }

        // 检查API返回状态
        if (json.ok !== 1) {
            const errorMsg = json.msg || json.message || json.error || 'unknown error';
            const errorCode = json.code || json.status || json.ok || 'N/A';
            console.error(`[WeiboSearch] API返回错误: ${errorMsg} (code: ${errorCode})`);
            console.error(`[WeiboSearch] 完整响应: ${JSON.stringify(json).substring(0, 500)}`);

            // 检查是否是验证码要求（ok: -100 且包含 geetest URL）
            if (json.ok === -100) {
                if (json.url?.includes('geetest') || json.url?.includes('api/geetest')) {
                    console.error(`[WeiboSearch] ⚠️ 触发人机验证（Geetest验证码），可能的原因：`);
                    console.error(`  1. Cookie已过期或无效，请更新 .env 文件中的 WEIBO_COOKIE`);
                    console.error(`  2. 请求频率过高，建议增加请求间隔`);
                    console.error(`  3. IP地址被限制，可能需要更换IP或等待一段时间`);
                    console.error(`  4. 建议：在浏览器中登录微博，从开发者工具复制最新的完整Cookie到 .env 文件`);
                    console.error(`  5. 验证码URL: ${json.url}`);
                } else if (json.url?.includes('passport.weibo.com')) {
                    console.warn(`[WeiboSearch] 需要登录认证，可能的原因：`);
                    console.warn(`  1. Cookie已过期，请重新获取最新的Cookie`);
                    console.warn(`  2. Cookie格式不正确，请确保包含 SUB、SUBP、SSOLoginState 等关键字段`);
                    console.warn(`  3. 账号可能被限制，请稍后再试`);
                    console.warn(`  4. 建议：在浏览器中登录微博，然后从开发者工具中复制完整的Cookie字符串到 .env 文件`);
                } else {
                    console.warn(`[WeiboSearch] API返回错误码 -100，可能的原因：`);
                    console.warn(`  1. Cookie已过期或无效`);
                    console.warn(`  2. 需要登录或验证`);
                    console.warn(`  3. 请求被限制`);
                }
            } else if (errorCode === 100000 || errorMsg.includes('登录') || errorMsg.includes('cookie')) {
                console.warn(`[WeiboSearch] 可能是Cookie过期或无效，请检查 .env 文件中的 WEIBO_COOKIE`);
            }

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

        // 如果没有cards，尝试其他数据结构
        if (!cards || cards.length === 0) {
            console.warn(`[WeiboSearch] 未找到cards数据，尝试其他数据结构`);
            console.warn(`[WeiboSearch] 响应数据结构: ${JSON.stringify(Object.keys(json)).substring(0, 200)}`);
        }

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

        return {
            keyword,
            page: pageNum,
            results,
            hasMore
        };

    } catch (error: any) {
        console.error(`[WeiboSearch] 搜索失败: ${error.message}`);
        return {
            keyword,
            page: pageNum,
            results: [],
            hasMore: false
        };
    }
}
