import { scrapeKDocs } from '../scrapers/hotDramaScraper.js';
import { searchTMDB } from '../hotDramaService.js';
import { hotDramaOps } from '../database.js';

// Track if scraping is running
let isScraping = false;

/**
 * Refresh hot drama data by scraping KDocs and enriching with TMDB
 */
export async function refreshHotDramaData(): Promise<{ success: boolean; count: number; error?: string }> {
    if (isScraping) {
        console.log('[HotDramaScheduler] Scraping already in progress, skipping...');
        return { success: false, count: 0, error: 'Already scraping' };
    }

    isScraping = true;

    try {
        console.log('[HotDramaScheduler] Starting hot drama refresh...');
        
        // 1. Scrape KDocs - both TV series and movies
        const kdocsUrls = [
            { url: 'https://www.kdocs.cn/l/co72a28MWkmI', type: 'tv' }, // 电视剧
            { url: 'https://kdocs.cn/l/cmbapmIwVsfi', type: 'movie' }  // 电影
        ];

        let allScrapedItems: Array<{ title: string; download_link: string; baiduUrl?: string; quarkUrl?: string; sourceType?: string }> = [];

        for (const { url, type } of kdocsUrls) {
            try {
                console.log(`[HotDramaScheduler] Scraping ${type} from ${url}...`);
                const scrapedItems = await scrapeKDocs(url);
                // Add source type hint to items
                const itemsWithType = scrapedItems.map(item => ({ ...item, sourceType: type }));
                allScrapedItems = allScrapedItems.concat(itemsWithType);
                console.log(`[HotDramaScheduler] Scraped ${scrapedItems.length} ${type} items from ${url}`);
            } catch (err: any) {
                console.error(`[HotDramaScheduler] Error scraping ${type} from ${url}:`, err.message);
            }
        }

        console.log(`[HotDramaScheduler] Total scraped ${allScrapedItems.length} items from KDocs`);

        // 2. Process items in parallel with concurrency limit to avoid API rate limiting
        const processItem = async (item: { title: string; download_link: string; baiduUrl?: string; quarkUrl?: string; sourceType?: string }) => {
            try {
                // Search TMDB with timeout
                const tmdbPromise = searchTMDB(item.title);
                const timeoutPromise = new Promise<null>((resolve) => 
                    setTimeout(() => resolve(null), 5000) // 5秒超时
                );
                const tmdbResult = await Promise.race([tmdbPromise, timeoutPromise]);

                // Get Baidu and Quark URLs
                const baiduUrl = item.baiduUrl || null;
                const quarkUrl = item.quarkUrl || null;
                
                // Use the first available link as download_link for backward compatibility
                let downloadLink = item.download_link;
                if (baiduUrl) {
                    downloadLink = baiduUrl;
                } else if (quarkUrl) {
                    downloadLink = quarkUrl;
                }

                const dramaData = {
                    title: item.title,
                    original_title: tmdbResult?.original_title || tmdbResult?.original_name || null,
                    download_link: downloadLink,
                    baidu_url: baiduUrl,
                    quark_url: quarkUrl,
                    tmdb_id: tmdbResult?.id || null,
                    poster_path: tmdbResult?.poster_path || null,
                    backdrop_path: tmdbResult?.backdrop_path || null,
                    overview: tmdbResult?.overview || null,
                    release_date: tmdbResult?.release_date || tmdbResult?.first_air_date || null,
                    vote_average: tmdbResult?.vote_average || null,
                    // Use TMDB result if available, otherwise fallback to source type hint
                    media_type: (tmdbResult?.media_type as 'movie' | 'tv' | null) || (item.sourceType as 'movie' | 'tv' | undefined) || null
                };

                hotDramaOps.upsert.run(
                    dramaData.title,
                    dramaData.original_title,
                    dramaData.download_link,
                    dramaData.baidu_url,
                    dramaData.quark_url,
                    dramaData.tmdb_id,
                    dramaData.poster_path,
                    dramaData.backdrop_path,
                    dramaData.overview,
                    dramaData.release_date,
                    dramaData.vote_average,
                    dramaData.media_type
                );
                return true;
            } catch (err: any) {
                console.error(`[HotDramaScheduler] Error processing item ${item.title}:`, err.message);
                return false;
            }
        };

        // Process items in batches with concurrency limit (5 at a time)
        const BATCH_SIZE = 10;
        let updatedCount = 0;
        
        for (let i = 0; i < allScrapedItems.length; i += BATCH_SIZE) {
            const batch = allScrapedItems.slice(i, i + BATCH_SIZE);
            console.log(`[HotDramaScheduler] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allScrapedItems.length / BATCH_SIZE)} (${batch.length} items)...`);
            
            const results = await Promise.allSettled(batch.map(item => processItem(item)));
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            updatedCount += successCount;
        }

        console.log(`[HotDramaScheduler] Successfully processed ${updatedCount} items`);
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error('[HotDramaScheduler] Error refreshing hot dramas:', error.message);
        return { success: false, count: 0, error: error.message };
    } finally {
        isScraping = false;
    }
}

// Scheduler interval - 24 hours (1 day)
let SCRAPE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let SCHEDULE_HOUR = 2; // Default: 2:00 AM
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Set the scheduler schedule hour (0-23)
 */
export function setHotDramaSchedulerHour(hour: number): void {
    if (hour < 0 || hour > 23) {
        throw new Error('Hour must be between 0 and 23');
    }
    SCHEDULE_HOUR = hour;
    // Restart scheduler if running
    if (schedulerInterval) {
        stopHotDramaScheduler();
        startHotDramaScheduler();
    }
}

/**
 * Get the current scheduler schedule hour
 */
export function getHotDramaSchedulerHour(): number {
    return SCHEDULE_HOUR;
}

/**
 * Calculate milliseconds until next scheduled time (e.g., 2:00 AM)
 */
function getMillisecondsUntilNextSchedule(hour: number = 2, minute: number = 0): number {
    const now = new Date();
    const nextSchedule = new Date();
    nextSchedule.setHours(hour, minute, 0, 0);
    
    // If the scheduled time has passed today, schedule for tomorrow
    if (nextSchedule <= now) {
        nextSchedule.setDate(nextSchedule.getDate() + 1);
    }
    
    return nextSchedule.getTime() - now.getTime();
}

/**
 * Start the hot drama scheduler (runs once per day at specified hour)
 */
export function startHotDramaScheduler(scheduleHour?: number): void {
    if (schedulerInterval) {
        console.log('[HotDramaScheduler] Scheduler already running');
        return;
    }

    if (scheduleHour !== undefined) {
        if (scheduleHour < 0 || scheduleHour > 23) {
            throw new Error('Schedule hour must be between 0 and 23');
        }
        SCHEDULE_HOUR = scheduleHour;
    }

    console.log(`[HotDramaScheduler] Starting scheduler (runs once per day at ${SCHEDULE_HOUR}:00)`);

    // Calculate time until next scheduled hour
    const msUntilNext = getMillisecondsUntilNextSchedule(SCHEDULE_HOUR, 0);
    const hoursUntilNext = Math.floor(msUntilNext / (60 * 60 * 1000));
    const minutesUntilNext = Math.floor((msUntilNext % (60 * 60 * 1000)) / (60 * 1000));
    
    console.log(`[HotDramaScheduler] Next scrape scheduled in ${hoursUntilNext} hours ${minutesUntilNext} minutes`);

    // Schedule first run
    setTimeout(() => {
        refreshHotDramaData();
        
        // Then run every 24 hours
        schedulerInterval = setInterval(() => {
            refreshHotDramaData();
        }, SCRAPE_INTERVAL);
    }, msUntilNext);
}

/**
 * Stop the hot drama scheduler
 */
export function stopHotDramaScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[HotDramaScheduler] Scheduler stopped');
    }
}

/**
 * Check if scraping is currently running
 */
export function isHotDramaScraping(): boolean {
    return isScraping;
}

