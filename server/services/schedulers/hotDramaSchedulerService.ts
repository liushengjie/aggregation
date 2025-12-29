import { scrapeKDocs } from '../scrapers/hotDrama/kdocsScraper.js';
import { MaoyanMovieItem } from '../scrapers/hotDrama/maoyanScraper.js';
import { searchTMDB } from '../hotDramaService.js';
import { hotDramaOps } from '../database.js';

// ==================== KDocs 热剧抓取 ====================

let isKDocsScraping = false;

/**
 * Refresh hot drama data by scraping KDocs and enriching with TMDB
 */
export async function refreshHotDramaData(): Promise<{ success: boolean; count: number; error?: string }> {
    if (isKDocsScraping) {
        console.log('[HotDramaScheduler] KDocs scraping already in progress, skipping...');
        return { success: false, count: 0, error: 'Already scraping' };
    }

    isKDocsScraping = true;

    try {
        console.log('[HotDramaScheduler] Starting hot drama refresh...');

        const kdocsUrls = [
            { url: 'https://www.kdocs.cn/l/co72a28MWkmI', type: 'tv' },
            { url: 'https://kdocs.cn/l/cmbapmIwVsfi', type: 'movie' }
        ];

        let allScrapedItems: Array<{ title: string; download_link: string; baiduUrl?: string; quarkUrl?: string; sourceType?: string }> = [];

        for (const { url, type } of kdocsUrls) {
            try {
                console.log(`[HotDramaScheduler] Scraping ${type} from ${url}...`);
                const scrapedItems = await scrapeKDocs(url);
                const itemsWithType = scrapedItems.map(item => ({ ...item, sourceType: type }));
                allScrapedItems = allScrapedItems.concat(itemsWithType);
                console.log(`[HotDramaScheduler] Scraped ${scrapedItems.length} ${type} items from ${url}`);
            } catch (err: any) {
                console.error(`[HotDramaScheduler] Error scraping ${type} from ${url}:`, err.message);
            }
        }

        console.log(`[HotDramaScheduler] Total scraped ${allScrapedItems.length} items from KDocs`);

        const processItem = async (item: { title: string; download_link: string; baiduUrl?: string; quarkUrl?: string; sourceType?: string }) => {
            try {
                const existing = hotDramaOps.findByTitle.get(item.title) as { title: string; tmdb_id: number | null; poster_path: string | null } | undefined;

                const baiduUrl = item.baiduUrl || null;
                const quarkUrl = item.quarkUrl || null;

                let downloadLink = item.download_link;
                if (baiduUrl) {
                    downloadLink = baiduUrl;
                } else if (quarkUrl) {
                    downloadLink = quarkUrl;
                }

                if (existing && existing.tmdb_id && existing.poster_path) {
                    hotDramaOps.upsert.run(
                        item.title, null, downloadLink, baiduUrl, quarkUrl,
                        null, null, null, null, null, null, item.sourceType || null
                    );
                    return 'skipped';
                }

                const tmdbResult = await searchTMDB(item.title, 8000);

                const dramaData = {
                    title: item.title,
                    original_title: tmdbResult?.original_title || null,
                    download_link: downloadLink,
                    baidu_url: baiduUrl,
                    quark_url: quarkUrl,
                    tmdb_id: tmdbResult?.id ? parseInt(tmdbResult.id) || null : null,
                    poster_path: tmdbResult?.poster_path || null,
                    backdrop_path: tmdbResult?.backdrop_path || null,
                    overview: tmdbResult?.overview || null,
                    release_date: tmdbResult?.release_date || null,
                    vote_average: tmdbResult?.vote_average || null,
                    media_type: (tmdbResult?.media_type as 'movie' | 'tv' | null) || (item.sourceType as 'movie' | 'tv' | undefined) || null
                };

                hotDramaOps.upsert.run(
                    dramaData.title, dramaData.original_title, dramaData.download_link,
                    dramaData.baidu_url, dramaData.quark_url, dramaData.tmdb_id,
                    dramaData.poster_path, dramaData.backdrop_path, dramaData.overview,
                    dramaData.release_date, dramaData.vote_average, dramaData.media_type
                );
                return true;
            } catch (err: any) {
                console.error(`[HotDramaScheduler] Error processing item ${item.title}:`, err.message);
                return false;
            }
        };

        const BATCH_SIZE = 10;
        let updatedCount = 0;
        let skippedCount = 0;
        let newCount = 0;
        const totalBatches = Math.ceil(allScrapedItems.length / BATCH_SIZE);

        for (let i = 0; i < allScrapedItems.length; i += BATCH_SIZE) {
            const batch = allScrapedItems.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            const results = await Promise.allSettled(batch.map(item => processItem(item)));

            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value === 'skipped') {
                        skippedCount++;
                        updatedCount++;
                    } else if (r.value === true) {
                        newCount++;
                        updatedCount++;
                    }
                }
            }

            // 每10批或最后一批输出进度
            if (batchNum % 10 === 0 || batchNum === totalBatches) {
                const progress = Math.round((i + batch.length) / allScrapedItems.length * 100);
                console.log(`[HotDramaScheduler] Progress: ${progress}% (${i + batch.length}/${allScrapedItems.length}) | New: ${newCount} | Skipped: ${skippedCount}`);
            }
        }

        console.log(`[HotDramaScheduler] Done: ${updatedCount} total, ${newCount} new TMDB, ${skippedCount} skipped`);
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error('[HotDramaScheduler] Error refreshing hot dramas:', error.message);
        return { success: false, count: 0, error: error.message };
    } finally {
        isKDocsScraping = false;
    }
}

// KDocs Scheduler
let KDOCS_INTERVAL = 1440 * 60 * 1000; // 24 hours
let KDOCS_INITIAL_DELAY = 1 * 60 * 1000; // 1 minute
let kdocsSchedulerInterval: NodeJS.Timeout | null = null;
let kdocsSchedulerTimeout: NodeJS.Timeout | null = null;

export function setHotDramaSchedulerInterval(intervalMinutes: number): void {
    KDOCS_INTERVAL = intervalMinutes * 60 * 1000;
    if (kdocsSchedulerInterval) {
        stopHotDramaScheduler();
        startHotDramaScheduler(intervalMinutes, KDOCS_INITIAL_DELAY / 1000 / 60);
    }
}

export function setHotDramaSchedulerInitialDelay(initialDelayMinutes: number): void {
    KDOCS_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
    if (kdocsSchedulerInterval) {
        stopHotDramaScheduler();
        startHotDramaScheduler(KDOCS_INTERVAL / 1000 / 60, initialDelayMinutes);
    }
}

export function getHotDramaSchedulerInterval(): number {
    return KDOCS_INTERVAL / 1000 / 60;
}

export function getHotDramaSchedulerInitialDelay(): number {
    return KDOCS_INITIAL_DELAY / 1000 / 60;
}

export function startHotDramaScheduler(intervalMinutes?: number, initialDelayMinutes?: number): void {
    // 如果定时器已经在运行，先停止它
    if (kdocsSchedulerInterval || kdocsSchedulerTimeout) {
        console.log('[HotDramaScheduler] Stopping existing KDocs scheduler before restarting');
        stopHotDramaScheduler();
    }

    if (intervalMinutes !== undefined) KDOCS_INTERVAL = intervalMinutes * 60 * 1000;
    if (initialDelayMinutes !== undefined) KDOCS_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;

    console.log(`[HotDramaScheduler] Starting KDocs scheduler (initial delay: ${KDOCS_INITIAL_DELAY / 1000 / 60} min, interval: ${KDOCS_INTERVAL / 1000 / 60} min)`);

    kdocsSchedulerTimeout = setTimeout(() => {
        kdocsSchedulerTimeout = null;
        refreshHotDramaData();
        kdocsSchedulerInterval = setInterval(() => {
            refreshHotDramaData();
        }, KDOCS_INTERVAL);
    }, KDOCS_INITIAL_DELAY);
}

export function stopHotDramaScheduler(): void {
    let wasRunning = false;
    // 清除 setInterval
    if (kdocsSchedulerInterval) {
        clearInterval(kdocsSchedulerInterval);
        kdocsSchedulerInterval = null;
        wasRunning = true;
    }
    // 清除 setTimeout
    if (kdocsSchedulerTimeout) {
        clearTimeout(kdocsSchedulerTimeout);
        kdocsSchedulerTimeout = null;
        wasRunning = true;
    }
    if (wasRunning) {
        console.log('[HotDramaScheduler] KDocs scheduler stopped');
    }
}

export function isHotDramaScraping(): boolean {
    return isKDocsScraping;
}

// ==================== 猫眼排行榜抓取 ====================

let isMaoyanScraping = false;

// 注意:数据保存逻辑已移至 hotDramaService.ts 中的 refreshAndSaveMaoyanData 函数

/**
 * Refresh Maoyan movie list data and save to database
 * 该方法现在委托给 hotDramaService 的 refreshAndSaveMaoyanData
 */
export async function refreshMaoyanData(): Promise<{ success: boolean; data: { movies: MaoyanMovieItem[]; total: number } | null; error?: string }> {
    if (isMaoyanScraping) {
        console.log('[MaoyanScheduler] Scraping already in progress, skipping...');
        return { success: false, data: null, error: 'Already scraping' };
    }

    isMaoyanScraping = true;

    try {
        console.log('[MaoyanScheduler] Starting Maoyan movie list refresh...');

        // 调用 hotDramaService 中的刷新和保存方法
        const { refreshAndSaveMaoyanData } = await import('../hotDramaService.js');
        const result = await refreshAndSaveMaoyanData();

        if (result.success) {
            console.log(`[MaoyanScheduler] Successfully refreshed ${result.total} movies`);
            return {
                success: true,
                data: { movies: result.movies, total: result.total }
            };
        } else {
            console.log('[MaoyanScheduler] Refresh failed:', result.error);
            return {
                success: false,
                data: null,
                error: result.error
            };
        }
    } catch (error: any) {
        console.error('[MaoyanScheduler] Error refreshing Maoyan movie list:', error.message);
        return { success: false, data: null, error: error.message };
    } finally {
        isMaoyanScraping = false;
    }
}


// Maoyan Scheduler
let MAOYAN_INTERVAL = 5 * 60 * 1000; // 5 minutes (猫眼数据更新频繁)
let MAOYAN_INITIAL_DELAY = 0.5 * 60 * 1000; // 30 seconds
let maoyanSchedulerInterval: NodeJS.Timeout | null = null;
let maoyanSchedulerTimeout: NodeJS.Timeout | null = null;

export function setMaoyanSchedulerInterval(intervalMinutes: number): void {
    MAOYAN_INTERVAL = intervalMinutes * 60 * 1000;
    if (maoyanSchedulerInterval) {
        stopMaoyanScheduler();
        startMaoyanScheduler(intervalMinutes, MAOYAN_INITIAL_DELAY / 1000 / 60);
    }
}

export function setMaoyanSchedulerInitialDelay(initialDelayMinutes: number): void {
    MAOYAN_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
    if (maoyanSchedulerInterval) {
        stopMaoyanScheduler();
        startMaoyanScheduler(MAOYAN_INTERVAL / 1000 / 60, initialDelayMinutes);
    }
}

export function getMaoyanSchedulerInterval(): number {
    return MAOYAN_INTERVAL / 1000 / 60;
}

export function getMaoyanSchedulerInitialDelay(): number {
    return MAOYAN_INITIAL_DELAY / 1000 / 60;
}

export function startMaoyanScheduler(intervalMinutes?: number, initialDelayMinutes?: number): void {
    if (intervalMinutes !== undefined) MAOYAN_INTERVAL = intervalMinutes * 60 * 1000;
    if (initialDelayMinutes !== undefined) MAOYAN_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;

    console.log(`[MaoyanScheduler] Starting scheduler (initial delay: ${MAOYAN_INITIAL_DELAY / 1000 / 60} min, interval: ${MAOYAN_INTERVAL / 1000 / 60} min)`);

    // 保存 setTimeout 的引用，以便后续可以清除
    maoyanSchedulerTimeout = setTimeout(() => {
        maoyanSchedulerTimeout = null;
        refreshMaoyanData();
        maoyanSchedulerInterval = setInterval(() => {
            refreshMaoyanData();
        }, MAOYAN_INTERVAL);
    }, MAOYAN_INITIAL_DELAY);
}

export function stopMaoyanScheduler(): void {
    let wasRunning = false;
    // 清除 setInterval
    if (maoyanSchedulerInterval) {
        clearInterval(maoyanSchedulerInterval);
        maoyanSchedulerInterval = null;
        wasRunning = true;
    }
    // 清除 setTimeout
    if (maoyanSchedulerTimeout) {
        clearTimeout(maoyanSchedulerTimeout);
        maoyanSchedulerTimeout = null;
        wasRunning = true;
    }
    if (wasRunning) {
        console.log('[MaoyanScheduler] Scheduler stopped');
    }
}

export function isMaoyanScrapingNow(): boolean {
    return isMaoyanScraping;
}
