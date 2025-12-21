import { scrapeAllPlatformsPublicContent } from '../publicScrapingService';
import { publicItemOps } from '../database';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the public scraping scheduler
 * @param intervalMinutes - Interval in minutes (default: 30)
 */
export function startPublicScrapingScheduler(intervalMinutes: number = 30) {
  if (intervalId) {
    console.log('[Public Scraping Scheduler] Already running');
    return;
  }

  console.log(`[Public Scraping Scheduler] Starting scheduler (interval: ${intervalMinutes} minutes)`);

  // Run immediately on start
  runPublicScraping();

  // Then run on interval
  intervalId = setInterval(() => {
    runPublicScraping();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the public scraping scheduler
 */
export function stopPublicScrapingScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Public Scraping Scheduler] Stopped');
  }
}

/**
 * Run public scraping for all platforms
 */
async function runPublicScraping() {
  if (isRunning) {
    console.log('[Public Scraping Scheduler] Already running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log('[Public Scraping Scheduler] Starting public content scraping...');

  try {
    // Clean up old items (older than 7 days)
    try {
      publicItemOps.deleteOld.run();
      console.log('[Public Scraping Scheduler] Cleaned up old items');
    } catch (cleanupError: any) {
      console.error('[Public Scraping Scheduler] Error cleaning up old items:', cleanupError.message);
      // Continue even if cleanup fails
    }

    // Scrape all platforms with overall timeout (30 minutes max for all platforms)
    const scrapingPromise = scrapeAllPlatformsPublicContent();
    const overallTimeoutPromise = new Promise<{ success: boolean; results: Record<string, { totalItems: number; error?: string }> }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          results: {
            Weibo: { totalItems: 0, error: 'Overall scraping timeout' },
            Bilibili: { totalItems: 0, error: 'Overall scraping timeout' },
            Xiaohongshu: { totalItems: 0, error: 'Overall scraping timeout' },
            Douyin: { totalItems: 0, error: 'Overall scraping timeout' },
          },
        });
      }, 30 * 60 * 1000); // 30 minutes overall timeout
    });

    const result = await Promise.race([scrapingPromise, overallTimeoutPromise]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (result.success) {
      console.log(`[Public Scraping Scheduler] Scraping completed successfully in ${elapsed}s`);
      Object.entries(result.results).forEach(([platform, data]) => {
        console.log(`[Public Scraping Scheduler] ${platform}: ${data.totalItems} items${data.error ? ` (error: ${data.error})` : ''}`);
      });
    } else {
      console.error(`[Public Scraping Scheduler] Scraping completed with errors in ${elapsed}s`);
      Object.entries(result.results).forEach(([platform, data]) => {
        if (data.error) {
          console.error(`[Public Scraping Scheduler] ${platform} error: ${data.error}`);
        } else {
          console.log(`[Public Scraping Scheduler] ${platform}: ${data.totalItems} items`);
        }
      });
    }
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Public Scraping Scheduler] Fatal error after ${elapsed}s:`, error.message);
    console.error('[Public Scraping Scheduler] Error stack:', error.stack);
  } finally {
    isRunning = false;
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Public Scraping Scheduler] Finished. Total time: ${totalElapsed}s`);
  }
}

/**
 * Manually trigger public scraping (for testing or API calls)
 */
export async function triggerPublicScraping(): Promise<{ success: boolean; results: any }> {
  if (isRunning) {
    return { success: false, results: { error: 'Scraping is already running' } };
  }

  try {
    const result = await scrapeAllPlatformsPublicContent();
    return result;
  } catch (error: any) {
    return { success: false, results: { error: error.message } };
  }
}

