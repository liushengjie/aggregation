/**
 * 小红书搜索爬虫
 * 使用Playwright浏览器模拟，监听API响应获取数据
 * 
 * 改进措施：
 * - 自适应频率控制
 * - User-Agent 轮换
 * - 重试机制
 * - 真实请求头
 */

import { chromium, Browser, Cookie } from 'playwright';
import { 
    getRandomUserAgent, 
    AdaptiveRateLimiter, 
    retryWithBackoff 
} from '../utils/scraperUtils.js';

// 创建自适应频率控制器（基础间隔5秒）
const rateLimiter = new AdaptiveRateLimiter(5000, 30000, 2000);

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

export interface XiaohongshuSearchResponse {
    keyword: string;
    page: number;
    results: XiaohongshuSearchResult[];
    hasMore: boolean;
}

export interface XiaohongshuSearchOptions {
    page?: number;
    limit?: number;
}

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

function getCookieFromEnv(): string | null {
    return process.env.XIAOHONGSHU_COOKIE || process.env.XHS_COOKIE || null;
}

function parseNoteItem(item: any): XiaohongshuSearchResult | null {
    try {
        const noteCard = item.note_card || item;
        if (!noteCard) return null;
        
        const user = noteCard.user || {};
        const id = item.id || noteCard.note_id || '';
        
        let cover = '';
        if (noteCard.cover) {
            cover = noteCard.cover.url_default || 
                    noteCard.cover.url_pre || 
                    noteCard.cover.url || 
                    '';
        }
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

export async function scrapeXiaohongshuSearch(
    keyword: string,
    options: XiaohongshuSearchOptions = {}
): Promise<XiaohongshuSearchResponse> {
    const { page: pageNum = 1, limit = 20 } = options;
    
    console.log(`[XiaohongshuSearch] 开始搜索: ${keyword}, 页码: ${pageNum}`);
    
    // 频率控制
    await rateLimiter.wait();
    console.log(`[XiaohongshuSearch] 当前频率控制: ${JSON.stringify(rateLimiter.getStats())}`);
    
    let browser: Browser | null = null;
    const results: XiaohongshuSearchResult[] = [];
    
    try {
        browser = await retryWithBackoff(async () => {
            return await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
            });
        }, { maxRetries: 2, baseDelay: 1000 });
        
        const cookieString = getCookieFromEnv();
        const cookies = cookieString ? parseCookies(cookieString) : [];
        
        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN',
            extraHTTPHeaders: {
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'DNT': '1',
            }
        });
        
        if (cookies.length > 0) {
            await context.addCookies(cookies);
            console.log(`[XiaohongshuSearch] 已加载 ${cookies.length} 个cookie`);
        }
        
        const page = await context.newPage();
        
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
        
        const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`;
        console.log(`[XiaohongshuSearch] 访问: ${searchUrl}`);
        
        await retryWithBackoff(async () => {
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        }, { maxRetries: 2, baseDelay: 2000 });
        
        await page.waitForTimeout(3000);
        
        if (results.length === 0) {
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => window.scrollBy(0, 500));
                await page.waitForTimeout(1000);
            }
            await page.waitForTimeout(2000);
        }
        
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
        
        rateLimiter.onSuccess();
        
        return { keyword, page: pageNum, results, hasMore: results.length >= limit };
        
    } catch (error: any) {
        console.error(`[XiaohongshuSearch] 搜索失败: ${error.message}`);
        rateLimiter.onFailure(error.statusCode);
        return { keyword, page: pageNum, results: [], hasMore: false };
    } finally {
        if (browser) await browser.close();
    }
}
