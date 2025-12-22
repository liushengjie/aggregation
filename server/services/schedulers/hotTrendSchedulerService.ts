import { Cookie } from 'playwright';
import { hotTrendOps, accountOps } from '../database';
import { HotTrendBaseScraper, HotTrendScrapedItem } from '../scrapers/hotTrend/hotTrendBase';
import { WeiboHotTrendsScraper } from '../scrapers/hotTrend/weiboHotTrends';
import { DouyinHotTrendsScraper } from '../scrapers/hotTrend/douyinHotTrends';
import { BaiduHotTrendsScraper } from '../scrapers/hotTrend/baiduHotTrends';
import { BilibiliHotTrendsScraper } from '../scrapers/hotTrend/bilibiliHotTrends';

type HotTrendPlatform = 'Weibo' | 'Douyin' | 'Baidu' | 'Bilibili';

// Track running scrape tasks
const runningTasks = new Map<string, boolean>();

// Platform to scraper mapping
function getScraperForPlatform(platform: HotTrendPlatform): HotTrendBaseScraper {
    switch (platform) {
        case 'Weibo':
            return new WeiboHotTrendsScraper();
        case 'Douyin':
            return new DouyinHotTrendsScraper();
        case 'Baidu':
            return new BaiduHotTrendsScraper();
        case 'Bilibili':
            return new BilibiliHotTrendsScraper();
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

// Get cookies for a platform from the database
function getCookiesForPlatform(platform: string): Cookie[] | null {
    try {
        // Find any connected account with cookies for this platform
        const accounts = accountOps.findAllConnected.all() as any[];
        const account = accounts.find(a => a.platform === platform && a.cookies);

        if (account && account.cookies) {
            return JSON.parse(account.cookies);
        }
    } catch (error) {
        console.error(`[HotTrendScheduler] Error getting cookies for ${platform}:`, error);
    }
    return null;
}

/**
 * Scrape hot trends for a single platform
 */
export async function scrapePlatform(platform: HotTrendPlatform): Promise<{ success: boolean; itemCount: number; error?: string }> {
    const taskKey = `hottrend-${platform}`;

    // Check if already running
    if (runningTasks.get(taskKey)) {
        return { success: false, itemCount: 0, error: 'Already scraping this platform' };
    }

    runningTasks.set(taskKey, true);
    let scraper: HotTrendBaseScraper | null = null;

    try {
        console.log(`[HotTrendScheduler] Starting scrape for ${platform}...`);

        scraper = getScraperForPlatform(platform);
        const cookies = getCookiesForPlatform(platform);

        // Initialize browser with cookies if available
        await scraper.init(cookies || undefined);

        // Scrape all categories
        const results = await scraper.scrapeAll();
        let totalItems = 0;

        // Save to database
        for (const [categoryId, items] of results) {
            if (items.length > 0) {
                // Delete old data for this platform/category
                hotTrendOps.deleteByPlatformCategory.run(platform, categoryId);

                // Insert new items
                for (const item of items) {
                    hotTrendOps.insert.run(
                        platform,
                        categoryId,
                        item.rank,
                        item.title,
                        item.hotness,
                        item.url,
                        item.extraData ? JSON.stringify(item.extraData) : null
                    );
                    totalItems++;
                }
            }
        }

        console.log(`[HotTrendScheduler] Completed scrape for ${platform}: ${totalItems} items`);
        return { success: true, itemCount: totalItems };

    } catch (error: any) {
        console.error(`[HotTrendScheduler] Error scraping ${platform}:`, error.message);
        return { success: false, itemCount: 0, error: error.message };
    } finally {
        if (scraper) {
            await scraper.close();
        }
        runningTasks.delete(taskKey);
    }
}

/**
 * Scrape all platforms
 */
export async function scrapeAllPlatforms(): Promise<void> {
    console.log('[HotTrendScheduler] Starting scheduled hot trend scrape for all platforms...');

    const platforms: HotTrendPlatform[] = ['Weibo', 'Douyin', 'Baidu', 'Bilibili'];

    for (const platform of platforms) {
        try {
            await scrapePlatform(platform);
            // Delay between platforms
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
            console.error(`[HotTrendScheduler] Failed to scrape ${platform}:`, error.message);
        }
    }

    // Clean up old data
    try {
        hotTrendOps.deleteOld.run();
        console.log('[HotTrendScheduler] Cleaned up old hot trend data');
    } catch (error) {
        console.error('[HotTrendScheduler] Failed to clean up old data:', error);
    }

    console.log('[HotTrendScheduler] All platform scrapes completed');
}

// Scheduler interval (default: 60 minutes)
let SCRAPE_INTERVAL = 60 * 60 * 1000; // 60 minutes
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Set the scheduler interval (in minutes)
 */
export function setHotTrendSchedulerInterval(intervalMinutes: number): void {
    SCRAPE_INTERVAL = intervalMinutes * 60 * 1000;
    // Restart scheduler if running
    if (schedulerInterval) {
        stopHotTrendScheduler();
        startHotTrendScheduler();
    }
}

/**
 * Get the current scheduler interval (in minutes)
 */
export function getHotTrendSchedulerInterval(): number {
    return SCRAPE_INTERVAL / 1000 / 60;
}

/**
 * Start the hot trend scheduler
 */
export function startHotTrendScheduler(intervalMinutes?: number): void {
    if (schedulerInterval) {
        console.log('[HotTrendScheduler] Scheduler already running');
        return;
    }

    if (intervalMinutes !== undefined) {
        SCRAPE_INTERVAL = intervalMinutes * 60 * 1000;
    }

    console.log(`[HotTrendScheduler] Starting scheduler (interval: ${SCRAPE_INTERVAL / 1000 / 60} minutes)`);

    // Run first scrape after 60 seconds (give server time to start)
    setTimeout(() => {
        scrapeAllPlatforms();
    }, 60000);

    // Then run at specified interval
    schedulerInterval = setInterval(() => {
        scrapeAllPlatforms();
    }, SCRAPE_INTERVAL);
}

/**
 * Stop the hot trend scheduler
 */
export function stopHotTrendScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[HotTrendScheduler] Scheduler stopped');
    }
}

/**
 * Check if a platform is currently being scraped
 */
export function isScraping(platform: HotTrendPlatform): boolean {
    return runningTasks.get(`hottrend-${platform}`) || false;
}

/**
 * Get all currently scraping platforms
 */
export function getScrapingPlatforms(): HotTrendPlatform[] {
    const platforms: HotTrendPlatform[] = [];
    for (const [key, value] of runningTasks) {
        if (value && key.startsWith('hottrend-')) {
            platforms.push(key.replace('hottrend-', '') as HotTrendPlatform);
        }
    }
    return platforms;
}
