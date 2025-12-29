/**
 * 小红书搜索爬虫
 * 使用Playwright浏览器模拟，监听API响应获取数据
 */

import { chromium, Browser, Cookie } from 'playwright';

/**
 * 小红书搜索结果接口
 */
export interface XiaohongshuSearchResult {
    id: string;
    title: string;
    desc?: string;
    author: {
        name: string;
        avatar?: string;
        userId?: string;
    };
    cover?: string;
    stats: {
        likes: number;
        comments?: number;
        collects?: number;
    };
    type: 'normal' | 'video';
    url: string;
}

/**
 * 小红书搜索响应接口
 */
export interface XiaohongshuSearchResponse {
    keyword: string;
    page: number;
    results: XiaohongshuSearchResult[];
    hasMore: boolean;
}

/**
 * 搜索选项
 */
export interface XiaohongshuSearchOptions {
    page?: number;
    limit?: number;
}

// 上次请求时间（用于限速）
let lastRequestTime: number = 0;
const MIN_REQUEST_INTERVAL = 200; // 最小请求间隔：2秒（小红书更严格）

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
 * 解析cookie字符串
 */
function parseCookies(cookieString: string, domain: string = 'xiaohongshu.com'): Cookie[] {
    if (!cookieString?.trim()) return [];
    
    const cookies: Cookie[] = [];
    for (const pair of cookieString.split(';')) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const [name, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (name && value) {
            cookies.push({
                name: name.trim(),
                value: value.trim(),
                domain: `.${domain}`,
                path: '/',
                expires: -1,
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            });
        }
    }
    return cookies;
}

/**
 * 从环境变量获取cookie
 */
function getCookieFromEnv(): string | null {
    return process.env.XIAOHONGSHU_COOKIE || process.env.XHS_COOKIE || null;
}


/**
 * 解析API返回的笔记数据
 */
function parseNoteItem(item: any): XiaohongshuSearchResult | null {
    try {
        const noteCard = item.note_card || item;
        if (!noteCard) return null;
        
        const user = noteCard.user || {};
        const id = item.id || noteCard.note_id || '';
        
        // 封面图：优先 url_default，其次 url_pre
        let cover = '';
        if (noteCard.cover) {
            cover = noteCard.cover.url_default || 
                    noteCard.cover.url_pre || 
                    noteCard.cover.url || 
                    '';
        }
        // 备用：从图片列表获取
        if (!cover && noteCard.image_list?.length > 0) {
            const img = noteCard.image_list[0];
            cover = img.url_default || img.url_pre || img.url || '';
        }
        
        return {
            id,
            title: noteCard.display_title || noteCard.title || '',
            desc: noteCard.desc || '',
            author: {
                name: user.nickname || user.nick_name || '',
                avatar: user.avatar || '',
                userId: user.user_id || ''
            },
            cover,
            stats: {
                likes: parseInt(noteCard.interact_info?.liked_count || '0') || 0,
                comments: parseInt(noteCard.interact_info?.comment_count || '0') || 0,
                collects: parseInt(noteCard.interact_info?.collected_count || '0') || 0
            },
            type: noteCard.type === 'video' ? 'video' : 'normal',
            url: `https://www.xiaohongshu.com/explore/${id}`
        };
    } catch {
        return null;
    }
}

/**
 * 小红书搜索主函数
 */
export async function scrapeXiaohongshuSearch(
    keyword: string,
    options: XiaohongshuSearchOptions = {}
): Promise<XiaohongshuSearchResponse> {
    const { page: pageNum = 1, limit = 20 } = options;
    
    console.log(`[XiaohongshuSearch] 开始搜索: ${keyword}, 页码: ${pageNum}`);
    
    // 请求限速
    await rateLimit();
    
    let browser: Browser | null = null;
    const results: XiaohongshuSearchResult[] = [];
    
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });
        
        const cookieString = getCookieFromEnv();
        const cookies = cookieString ? parseCookies(cookieString) : [];
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN'
        });
        
        if (cookies.length > 0) {
            await context.addCookies(cookies);
            console.log(`[XiaohongshuSearch] 已加载 ${cookies.length} 个cookie`);
        }
        
        const page = await context.newPage();
        
        // 监听API响应
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/sns/web/v1/search/notes') || url.includes('/api/sns/web/v2/search/notes')) {
                try {
                    const json = await response.json();
                    if (json.success && json.data?.items) {
                        for (const item of json.data.items) {
                            if (results.length >= limit) break;
                            const parsed = parseNoteItem(item);
                            if (parsed) results.push(parsed);
                        }
                        console.log(`[XiaohongshuSearch] API返回 ${json.data.items.length} 条`);
                    }
                } catch { /* ignore */ }
            }
        });
        
        // 访问搜索页面
        const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`;
        console.log(`[XiaohongshuSearch] 访问: ${searchUrl}`);
        
        try {
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (e: any) {
            console.warn(`[XiaohongshuSearch] 页面加载: ${e.message}`);
        }
        
        // 增加等待时间，避免请求过快
        await page.waitForTimeout(3000);
        
        // 滚动触发加载
        if (results.length === 0) {
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => window.scrollBy(0, 500));
                // 增加滚动间隔，降低请求频率
                await page.waitForTimeout(2000);
            }
            await page.waitForTimeout(3000);
        }
        
        // DOM解析备用
        if (results.length === 0) {
            console.log('[XiaohongshuSearch] 尝试DOM解析...');
            const domResults = await page.evaluate((maxLimit: number) => {
                const items: any[] = [];
                const cards = document.querySelectorAll('section.note-item, a[href*="/explore/"]');
                
                cards.forEach((card) => {
                    if (items.length >= maxLimit) return;
                    try {
                        const link = card.querySelector('a[href*="/explore/"]') as HTMLAnchorElement;
                        const href = link?.href || (card as HTMLAnchorElement).href || '';
                        const match = href.match(/\/explore\/([a-zA-Z0-9]+)/);
                        const id = match ? match[1] : '';
                        if (!id) return;
                        
                        const title = card.querySelector('.title, [class*="title"]')?.textContent?.trim() || '';
                        const author = card.querySelector('.author-name, .name')?.textContent?.trim() || '';
                        const img = card.querySelector('img') as HTMLImageElement;
                        
                        if (title || img?.src) {
                            items.push({
                                id,
                                title: title || '无标题',
                                author: { name: author },
                                cover: img?.src || '',
                                stats: { likes: 0 },
                                type: 'normal',
                                url: `https://www.xiaohongshu.com/explore/${id}`
                            });
                        }
                    } catch { /* ignore */ }
                });
                return items;
            }, limit);
            results.push(...domResults);
        }
        
        await context.close();
        console.log(`[XiaohongshuSearch] 最终找到 ${results.length} 条结果`);
        
        return { keyword, page: pageNum, results, hasMore: results.length >= limit };
        
    } catch (error: any) {
        console.error(`[XiaohongshuSearch] 搜索失败: ${error.message}`);
        return { keyword, page: pageNum, results: [], hasMore: false };
    } finally {
        if (browser) await browser.close();
    }
}
