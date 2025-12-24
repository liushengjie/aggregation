import { accountOps, publicItemOps } from '../database';
import { syncPlatformContent, scrapeAllPlatformsPublicContent } from '../globalFocusService';

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';

interface ScheduledTask {
    accountId: number;
    platform: Platform;
    userId: number;
    lastSync: Date | null;
    isRunning: boolean;
}

// Track running sync tasks to prevent overlapping
// Map<accountId, platform>
const runningTasks = new Map<number, Platform>();

/**
 * Run sync for all connected accounts
 */
async function syncAllConnectedAccounts(): Promise<void> {
    console.log('[Scheduler] Starting scheduled sync for all connected accounts...');

    try {
        // Get all connected accounts
        const accounts = accountOps.findAllConnected.all() as any[];

        if (accounts.length === 0) {
            console.log('[Scheduler] No connected accounts found');
            return;
        }

        console.log(`[Scheduler] Found ${accounts.length} connected accounts to sync`);

        for (const account of accounts) {
            // Double-check: status must be 'connected' and cookies must exist
            if (account.status !== 'connected') {
                console.log(`[Scheduler] Skipping ${account.platform} (status: ${account.status}, expected: connected)`);
                continue;
            }

            if (!account.cookies) {
                console.log(`[Scheduler] Skipping ${account.platform} (no cookies)`);
                continue;
            }

            // Skip if already running
            if (runningTasks.has(account.id)) {
                console.log(`[Scheduler] Skipping ${account.platform} (already syncing)`);
                continue;
            }

            // Mark as running
            runningTasks.set(account.id, account.platform as Platform);

            console.log(`[Scheduler] Starting sync for ${account.platform}...`);

            try {
                const result = await syncPlatformContent(
                    account.id,
                    account.platform as Platform,
                    account.cookies
                );

                if (result.success) {
                    console.log(`[Scheduler] Sync completed for ${account.platform}: ${result.itemCount} items`);
                } else {
                    console.log(`[Scheduler] Sync failed for ${account.platform}: ${result.error}`);
                }
            } catch (error: any) {
                console.error(`[Scheduler] Error syncing ${account.platform}:`, error.message);
            } finally {
                runningTasks.delete(account.id);
            }
        }

        console.log('[Scheduler] Scheduled sync completed');
    } catch (error: any) {
        console.error('[Scheduler] Error in scheduled sync:', error.message);
    }
}

// Sync interval in milliseconds (default: 30 minutes)
let SYNC_INTERVAL = 30 * 60 * 1000;
let INITIAL_DELAY = 1 * 60 * 1000; // Default: 1 minute
let schedulerInterval: NodeJS.Timeout | null = null;
let schedulerTimeout: NodeJS.Timeout | null = null;

/**
 * Set the scheduler interval (in minutes)
 */
export function setSchedulerInterval(intervalMinutes: number): void {
    SYNC_INTERVAL = intervalMinutes * 60 * 1000;
    // Restart scheduler if running
    if (schedulerInterval) {
        stopScheduler();
        startScheduler(intervalMinutes, INITIAL_DELAY / 1000 / 60);
    }
}

/**
 * Set the initial delay (in minutes)
 */
export function setSchedulerInitialDelay(initialDelayMinutes: number): void {
    INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
    // Restart scheduler if running
    if (schedulerInterval) {
        stopScheduler();
        startScheduler(SYNC_INTERVAL / 1000 / 60, initialDelayMinutes);
    }
}

/**
 * Get the current scheduler interval (in minutes)
 */
export function getSchedulerInterval(): number {
    return SYNC_INTERVAL / 1000 / 60;
}

/**
 * Get the current initial delay (in minutes)
 */
export function getSchedulerInitialDelay(): number {
    return INITIAL_DELAY / 1000 / 60;
}

/**
 * Start the scheduler
 */
export function startScheduler(intervalMinutes?: number, initialDelayMinutes?: number): void {
    // 如果定时器已经在运行，先停止它
    if (schedulerInterval || schedulerTimeout) {
        console.log('[Scheduler] Stopping existing scheduler before restarting');
        stopScheduler();
    }

    if (intervalMinutes !== undefined) {
        SYNC_INTERVAL = intervalMinutes * 60 * 1000;
    }

    if (initialDelayMinutes !== undefined) {
        INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
    }

    console.log(`[Scheduler] Starting scheduler (initial delay: ${INITIAL_DELAY / 1000 / 60} minutes, interval: ${SYNC_INTERVAL / 1000 / 60} minutes)`);

    // Schedule first run after initial delay
    schedulerTimeout = setTimeout(() => {
        schedulerTimeout = null;
        syncAllConnectedAccounts();
        
        // Then run every SYNC_INTERVAL
        schedulerInterval = setInterval(() => {
            syncAllConnectedAccounts();
        }, SYNC_INTERVAL);
    }, INITIAL_DELAY);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
    let wasRunning = false;
    // 清除 setInterval
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        wasRunning = true;
    }
    // 清除 setTimeout
    if (schedulerTimeout) {
        clearTimeout(schedulerTimeout);
        schedulerTimeout = null;
        wasRunning = true;
    }
    if (wasRunning) {
        console.log('[Scheduler] Scheduler stopped');
    }
}

/**
 * Manually trigger sync for all accounts
 */
export async function triggerManualSync(): Promise<void> {
    await syncAllConnectedAccounts();
}

/**
 * Trigger sync for a specific user's accounts
 */
export async function triggerSync(userId: number): Promise<void> {
    // For now, sync all connected accounts (can be filtered by userId later if needed)
    await syncAllConnectedAccounts();
}

/**
 * Get current sync status for all platforms
 */
export function getSyncStatus(): Map<Platform, boolean> {
    const status = new Map<Platform, boolean>();
    status.set('Weibo', false);
    status.set('Bilibili', false);
    status.set('Xiaohongshu', false);

    for (const platform of runningTasks.values()) {
        status.set(platform, true);
    }

    return status;
}

/**
 * Set sync as running for an account
 */
export function setSyncRunning(accountId: number, platform: Platform): void {
    runningTasks.set(accountId, platform);
}

/**
 * Clear sync running status for an account
 */
export function clearSyncRunning(accountId: number): void {
    runningTasks.delete(accountId);
}

/**
 * Get sync status for a specific user's platforms
 */
export function getSyncStatusForUser(userId: number): Platform[] {
    // This is a simplified version - in production you might want to track userId too
    const syncingPlatforms: Platform[] = [];
    for (const platform of runningTasks.values()) {
        if (!syncingPlatforms.includes(platform)) {
            syncingPlatforms.push(platform);
        }
    }
    return syncingPlatforms;
}

// Public scraping scheduler
let isPublicScrapingRunning = false;
let publicScrapingIntervalId: NodeJS.Timeout | null = null;
let publicScrapingTimeoutId: NodeJS.Timeout | null = null;

// Public scraping scheduler variables
let PUBLIC_SCRAPING_INTERVAL = 30 * 60 * 1000; // Default: 30 minutes
let PUBLIC_SCRAPING_INITIAL_DELAY = 1 * 60 * 1000; // Default: 1 minute

/**
 * Set the public scraping scheduler interval (in minutes)
 */
export function setPublicScrapingSchedulerInterval(intervalMinutes: number): void {
  PUBLIC_SCRAPING_INTERVAL = intervalMinutes * 60 * 1000;
  // Restart scheduler if running
  if (publicScrapingIntervalId) {
    stopPublicScrapingScheduler();
    startPublicScrapingScheduler(intervalMinutes, PUBLIC_SCRAPING_INITIAL_DELAY / 1000 / 60);
  }
}

/**
 * Set the initial delay (in minutes)
 */
export function setPublicScrapingSchedulerInitialDelay(initialDelayMinutes: number): void {
  PUBLIC_SCRAPING_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
  // Restart scheduler if running
  if (publicScrapingIntervalId) {
    stopPublicScrapingScheduler();
    startPublicScrapingScheduler(PUBLIC_SCRAPING_INTERVAL / 1000 / 60, initialDelayMinutes);
  }
}

/**
 * Get the current interval (in minutes)
 */
export function getPublicScrapingSchedulerInterval(): number {
  return PUBLIC_SCRAPING_INTERVAL / 1000 / 60;
}

/**
 * Get the current initial delay (in minutes)
 */
export function getPublicScrapingSchedulerInitialDelay(): number {
  return PUBLIC_SCRAPING_INITIAL_DELAY / 1000 / 60;
}

/**
 * Start the public scraping scheduler
 * @param intervalMinutes - Interval in minutes (default: 30)
 * @param initialDelayMinutes - Initial delay in minutes (default: 1)
 */
export function startPublicScrapingScheduler(intervalMinutes: number = 30, initialDelayMinutes: number = 1) {
  // 如果定时器已经在运行，先停止它
  if (publicScrapingIntervalId || publicScrapingTimeoutId) {
    console.log('[Public Scraping Scheduler] Stopping existing scheduler before restarting');
    stopPublicScrapingScheduler();
  }

  PUBLIC_SCRAPING_INTERVAL = intervalMinutes * 60 * 1000;
  PUBLIC_SCRAPING_INITIAL_DELAY = initialDelayMinutes * 60 * 1000;

  console.log(`[Public Scraping Scheduler] Starting scheduler (initial delay: ${initialDelayMinutes} minutes, interval: ${intervalMinutes} minutes)`);

  // Schedule first run after initial delay
  publicScrapingTimeoutId = setTimeout(() => {
    publicScrapingTimeoutId = null;
    runPublicScraping();
    
    // Then run on interval
    publicScrapingIntervalId = setInterval(() => {
      runPublicScraping();
    }, PUBLIC_SCRAPING_INTERVAL);
  }, PUBLIC_SCRAPING_INITIAL_DELAY);
}

/**
 * Stop the public scraping scheduler
 */
export function stopPublicScrapingScheduler() {
  let wasRunning = false;
  // 清除 setInterval
  if (publicScrapingIntervalId) {
    clearInterval(publicScrapingIntervalId);
    publicScrapingIntervalId = null;
    wasRunning = true;
  }
  // 清除 setTimeout
  if (publicScrapingTimeoutId) {
    clearTimeout(publicScrapingTimeoutId);
    publicScrapingTimeoutId = null;
    wasRunning = true;
  }
  if (wasRunning) {
    console.log('[Public Scraping Scheduler] Stopped');
  }
}

/**
 * Run public scraping for all platforms
 */
async function runPublicScraping() {
  if (isPublicScrapingRunning) {
    console.log('[Public Scraping Scheduler] Already running, skipping...');
    return;
  }

  isPublicScrapingRunning = true;
  const startTime = Date.now();
  console.log('[Public Scraping Scheduler] Starting public content scraping...');

  try {
    // Clean up old items (older than 7 days)
    try {
      publicItemOps.deleteOld.run();
      console.log('[Public Scraping Scheduler] Cleaned up old items');
    } catch (cleanupError: any) {
      console.error('[Public Scraping Scheduler] Error cleaning up old items:', cleanupError.message);
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
      }, 30 * 60 * 1000);
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
    isPublicScrapingRunning = false;
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Public Scraping Scheduler] Finished. Total time: ${totalElapsed}s`);
  }
}

/**
 * Manually trigger public scraping (for testing or API calls)
 */
export async function triggerPublicScraping(): Promise<{ success: boolean; results: any }> {
  if (isPublicScrapingRunning) {
    return { success: false, results: { error: 'Scraping is already running' } };
  }

  try {
    const result = await scrapeAllPlatformsPublicContent();
    return result;
  } catch (error: any) {
    return { success: false, results: { error: error.message } };
  }
}
