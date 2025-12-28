import { chromium, Browser, Page } from 'playwright';

/**
 * 豆瓣电影/电视剧信息接口
 */
export interface DoubanMovieInfo {
    // 基本信息
    title: string;                    // 标题
    originalTitle?: string;           // 原名/又名
    doubanId?: string;                // 豆瓣ID
    doubanUrl?: string;               // 豆瓣链接
    
    // 制作信息
    directors?: string[];             // 导演
    writers?: string[];               // 编剧
    actors?: string[];                // 主演
    genres?: string[];                // 类型
    countries?: string[];             // 制片国家/地区
    languages?: string[];            // 语言
    
    // 发布信息
    releaseDate?: string;             // 首播/上映日期
    episodeCount?: number;            // 集数（电视剧）
    runtime?: string;                 // 单集片长/片长
    imdbId?: string;                  // IMDb ID
    
    // 评分和简介
    doubanRating?: number;            // 豆瓣评分
    ratingCount?: number;              // 评分人数
    summary?: string;                  // 剧情简介
    
    // 媒体
    poster?: string;                   // 海报URL
    backdrop?: string;                 // 背景图URL
    
    // 类型判断
    mediaType?: 'movie' | 'tv';        // 电影或电视剧
}

/**
 * 从豆瓣搜索页面获取第一个电影/电视剧的链接
 * @param page Playwright Page 对象
 * @param searchText 搜索关键词
 * @returns 第一个结果的详情页URL，如果未找到则返回 null
 */
async function searchMovieUrl(page: Page, searchText: string): Promise<string | null> {
    try {
        const encodedText = encodeURIComponent(searchText);
        const searchUrl = `https://search.douban.com/movie/subject_search?search_text=${encodedText}&cat=1002`;
        
        console.log(`[Douban] 搜索: ${searchText}`);
        console.log(`[Douban] 搜索URL: ${searchUrl}`);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // 等待搜索结果加载
        await page.waitForTimeout(2000);
        
        // 尝试多种选择器来获取第一个结果链接
        const movieUrl = await page.evaluate(() => {
            // 选择器1: .item-root 或 .result-item
            const selectors = [
                '.item-root a[href*="/subject/"]',
                '.result-item a[href*="/subject/"]',
                '.item a[href*="/subject/"]',
                'a[href*="/subject/"]'
            ];
            
            for (const selector of selectors) {
                const link = document.querySelector(selector) as HTMLAnchorElement;
                if (link && link.href) {
                    const match = link.href.match(/\/subject\/(\d+)/);
                    if (match) {
                        return link.href.split('?')[0]; // 移除查询参数
                    }
                }
            }
            
            return null;
        });
        
        if (movieUrl) {
            console.log(`[Douban] 找到电影链接: ${movieUrl}`);
            return movieUrl;
        }
        
        console.warn(`[Douban] 未找到搜索结果: ${searchText}`);
        return null;
        
    } catch (error: any) {
        console.error(`[Douban] 搜索失败: ${error.message}`);
        return null;
    }
}

/**
 * 从豆瓣电影详情页提取所有信息
 * @param page Playwright Page 对象
 * @param movieUrl 电影详情页URL
 * @returns 电影信息对象
 */
async function scrapeMovieDetail(page: Page, movieUrl: string): Promise<DoubanMovieInfo | null> {
    try {
        console.log(`[Douban] 访问详情页: ${movieUrl}`);
        
        await page.goto(movieUrl, {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // 等待页面内容加载
        await page.waitForTimeout(2000);
        
        // 提取豆瓣ID
        const doubanIdMatch = movieUrl.match(/\/subject\/(\d+)/);
        const doubanId = doubanIdMatch ? doubanIdMatch[1] : undefined;
        
        // 提取所有信息
        const movieInfo = await page.evaluate((id) => {
            const info: any = {
                doubanId: id,
                doubanUrl: window.location.href.split('?')[0],
            };
            
            // 1. 标题
            const titleEl = document.querySelector('#content h1 span[property="v:itemreviewed"]') as HTMLElement;
            if (titleEl) {
                info.title = titleEl.textContent?.trim() || '';
            } else {
                // 备选：直接从 h1 获取
                const h1 = document.querySelector('#content h1');
                if (h1) {
                    info.title = h1.textContent?.replace(/\s*\(.*?\)\s*$/, '').trim() || '';
                }
            }
            
            // 2. 海报
            const posterEl = document.querySelector('#mainpic img') as HTMLImageElement;
            if (posterEl && posterEl.src) {
                info.poster = posterEl.src.replace(/\/s_ratio_poster\/public\//, '/l/public/'); // 获取大图
            }
            
            // 3. 评分
            const ratingEl = document.querySelector('strong.ll.rating_num') as HTMLElement;
            if (ratingEl) {
                const ratingText = ratingEl.textContent?.trim() || '';
                info.doubanRating = parseFloat(ratingText) || undefined;
            }
            
            // 评分人数
            const ratingCountEl = document.querySelector('.rating_people span') as HTMLElement;
            if (ratingCountEl) {
                const countText = ratingCountEl.textContent?.replace(/[^\d]/g, '') || '';
                info.ratingCount = parseInt(countText) || undefined;
            }
            
            // 4. 从 #info 区域提取信息
            const infoEl = document.querySelector('#info');
            if (infoEl) {
                const infoText = infoEl.textContent || '';
                
                // 导演
                const directorLinks = Array.from(infoEl.querySelectorAll('a[rel="v:directedBy"]'));
                if (directorLinks.length > 0) {
                    info.directors = directorLinks.map(link => link.textContent?.trim() || '').filter(Boolean);
                }
                
                // 编剧
                const writerSection = infoText.match(/编剧[：:]\s*([^\n]+)/);
                if (writerSection) {
                    const writerLinks = Array.from(infoEl.querySelectorAll('a[href*="/celebrity/"]'));
                    const writers: string[] = [];
                    let foundWriterLabel = false;
                    infoEl.querySelectorAll('span, a').forEach((el) => {
                        const text = el.textContent?.trim() || '';
                        if (text === '编剧' || text === '编剧:') {
                            foundWriterLabel = true;
                        } else if (foundWriterLabel && el.tagName === 'A' && el.getAttribute('href')?.includes('/celebrity/')) {
                            const writerName = el.textContent?.trim();
                            if (writerName && !writers.includes(writerName)) {
                                writers.push(writerName);
                            }
                        }
                    });
                    if (writers.length > 0) {
                        info.writers = writers;
                    }
                }
                
                // 主演
                const actorLinks = Array.from(infoEl.querySelectorAll('a[rel="v:starring"]'));
                if (actorLinks.length > 0) {
                    info.actors = actorLinks.map(link => link.textContent?.trim() || '').filter(Boolean);
                }
                
                // 类型
                const genreLinks = Array.from(infoEl.querySelectorAll('span[property="v:genre"]'));
                if (genreLinks.length > 0) {
                    info.genres = genreLinks.map(link => link.textContent?.trim() || '').filter(Boolean);
                }
                
                // 制片国家/地区
                const countryMatch = infoText.match(/制片国家\/地区[：:]\s*([^\n]+)/);
                if (countryMatch) {
                    info.countries = countryMatch[1].split('/').map(c => c.trim()).filter(Boolean);
                }
                
                // 语言
                const languageMatch = infoText.match(/语言[：:]\s*([^\n]+)/);
                if (languageMatch) {
                    info.languages = languageMatch[1].split('/').map(l => l.trim()).filter(Boolean);
                }
                
                // 首播/上映日期
                const releaseDateEls = Array.from(infoEl.querySelectorAll('span[property="v:initialReleaseDate"]'));
                if (releaseDateEls.length > 0) {
                    info.releaseDate = releaseDateEls[0].textContent?.trim() || undefined;
                }
                
                // 集数（电视剧）
                const episodeMatch = infoText.match(/集数[：:]\s*(\d+)/);
                if (episodeMatch) {
                    info.episodeCount = parseInt(episodeMatch[1]) || undefined;
                }
                
                // 片长
                const runtimeEls = Array.from(infoEl.querySelectorAll('span[property="v:runtime"]'));
                if (runtimeEls.length > 0) {
                    info.runtime = runtimeEls[0].textContent?.trim() || undefined;
                }
                
                // 又名
                const alsoKnownMatch = infoText.match(/又名[：:]\s*([^\n]+)/);
                if (alsoKnownMatch) {
                    info.originalTitle = alsoKnownMatch[1].split('/').map(a => a.trim()).filter(Boolean)[0];
                }
                
                // IMDb
                const imdbMatch = infoText.match(/IMDb[：:]\s*([^\s\n]+)/);
                if (imdbMatch) {
                    info.imdbId = imdbMatch[1].trim();
                }
            }
            
            // 5. 剧情简介
            const summaryEl = document.querySelector('#link-report span[property="v:summary"]') as HTMLElement;
            if (summaryEl) {
                info.summary = summaryEl.textContent?.trim() || undefined;
            } else {
                // 备选：尝试获取完整简介
                const allSummaryEl = document.querySelector('#link-report .all.hidden') as HTMLElement;
                if (allSummaryEl) {
                    info.summary = allSummaryEl.textContent?.trim() || undefined;
                } else {
                    const shortSummaryEl = document.querySelector('#link-report .short span') as HTMLElement;
                    if (shortSummaryEl) {
                        info.summary = shortSummaryEl.textContent?.trim() || undefined;
                    }
                }
            }
            
            // 6. 判断类型（电影或电视剧）
            if (info.episodeCount !== undefined) {
                info.mediaType = 'tv';
            } else if (info.genres && info.genres.some(g => ['电影', 'Movie'].includes(g))) {
                info.mediaType = 'movie';
            } else if (info.genres && info.genres.some(g => ['电视剧', 'TV Series', '剧集'].includes(g))) {
                info.mediaType = 'tv';
            } else {
                // 默认根据是否有集数判断
                info.mediaType = info.episodeCount ? 'tv' : 'movie';
            }
            
            return info;
        }, doubanId);
        
        console.log(`[Douban] 成功提取信息: ${movieInfo.title}`);
        return movieInfo as DoubanMovieInfo;
        
    } catch (error: any) {
        console.error(`[Douban] 提取详情失败: ${error.message}`);
        return null;
    }
}

/**
 * 从豆瓣搜索并提取电影/电视剧信息
 * @param title 电影/电视剧标题
 * @returns 电影信息对象，如果未找到则返回 null
 */
export async function scrapeDouban(title: string): Promise<DoubanMovieInfo | null> {
    console.log(`[Douban] 开始爬取: ${title}`);
    
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        // 创建 context 并设置 User-Agent，模拟真实浏览器
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN'
        });
        
        const page = await context.newPage();
        
        // 1. 搜索电影
        const movieUrl = await searchMovieUrl(page, title);
        if (!movieUrl) {
            console.warn(`[Douban] 未找到电影: ${title}`);
            return null;
        }
        
        // 2. 提取详情
        const movieInfo = await scrapeMovieDetail(page, movieUrl);
        
        return movieInfo;
        
    } catch (error: any) {
        console.error(`[Douban] 爬取失败: ${error.message}`);
        return null;
    } finally {
        await browser.close();
    }
}

/**
 * 将豆瓣信息转换为 hot_dramas 表格式
 * @param doubanInfo 豆瓣电影信息
 * @returns 符合 hot_dramas 表结构的数据
 */
export function convertToHotDramaFormat(doubanInfo: DoubanMovieInfo): {
    title: string;
    original_title?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    release_date?: string;
    vote_average?: number;
    media_type?: string;
} {
    return {
        title: doubanInfo.title,
        original_title: doubanInfo.originalTitle,
        poster_path: doubanInfo.poster,
        backdrop_path: doubanInfo.backdrop,
        overview: doubanInfo.summary,
        release_date: doubanInfo.releaseDate,
        vote_average: doubanInfo.doubanRating,
        media_type: doubanInfo.mediaType,
    };
}

