// OpenSource Scheduler Service (GitHub Trending)

import { refreshGitHubTrending } from '../opensourceService.js';

let isScraping = false;
let schedulerInterval: NodeJS.Timeout | null = null;
let SCRAPE_INTERVAL = 60 * 60 * 1000; // Default: 60 minutes
let INITIAL_DELAY = 1 * 60 * 1000; // Default: 1 minute

/**
 * Refresh GitHub Trending data for all periods and languages
 */
export async function refreshOpenSourceData(): Promise<{ success: boolean; count: number; error?: string }> {
  if (isScraping) {
    console.log('[OpenSourceScheduler] Scraping already in progress, skipping...');
    return { success: false, count: 0, error: 'Already scraping' };
  }

  isScraping = true;
  let totalCount = 0;

  try {
    const startTime = Date.now();
    console.log('[OpenSource] 开始定时采集 GitHub Trending...');
    
    const periods: Array<'today' | 'week' | 'month'> = ['today', 'week', 'month'];
    // 抓取6种常用语言
    const languages = ['all', 'javascript', 'typescript', 'python', 'go', 'java'];
    const totalTasks = periods.length * languages.length;
    let completedTasks = 0;
    
    // Refresh for each period and language combination
    for (const period of periods) {
      for (const language of languages) {
        try {
          const result = await refreshGitHubTrending(period, language);
          if (result.success) {
            totalCount += result.count;
          }
          completedTasks++;
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          completedTasks++;
          console.error(`[OpenSource] 采集失败 [${period}/${language}]:`, error.message);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[OpenSource] 定时采集完成: 共 ${totalCount} 个项目，${completedTasks}/${totalTasks} 任务完成，耗时 ${Math.round(duration / 1000)}秒`);
    return { success: true, count: totalCount };
    
  } catch (error: any) {
    console.error('[OpenSourceScheduler] Error refreshing:', error.message);
    return { success: false, count: totalCount, error: error.message };
  } finally {
    isScraping = false;
  }
}

/**
 * Check if scraping is in progress
 */
export function isOpenSourceScraping(): boolean {
  return isScraping;
}

/**
 * Set scheduler interval (in minutes)
 */
export function setOpenSourceSchedulerInterval(intervalMinutes: number): void {
  SCRAPE_INTERVAL = intervalMinutes * 60 * 1000;
  if (schedulerInterval) {
    stopOpenSourceScheduler();
    startOpenSourceScheduler(SCRAPE_INTERVAL, INITIAL_DELAY);
  }
}

/**
 * Get scheduler interval (in minutes)
 */
export function getOpenSourceSchedulerInterval(): number {
  return SCRAPE_INTERVAL / (60 * 1000);
}

/**
 * Set initial delay (in minutes)
 */
export function setOpenSourceSchedulerInitialDelay(delayMinutes: number): void {
  INITIAL_DELAY = delayMinutes * 60 * 1000;
  if (schedulerInterval) {
    stopOpenSourceScheduler();
    startOpenSourceScheduler(SCRAPE_INTERVAL, INITIAL_DELAY);
  }
}

/**
 * Get initial delay (in minutes)
 */
export function getOpenSourceSchedulerInitialDelay(): number {
  return INITIAL_DELAY / (60 * 1000);
}

/**
 * Start the scheduler
 */
export function startOpenSourceScheduler(
  intervalMinutes?: number,
  initialDelayMinutes?: number
): void {
  if (schedulerInterval) {
    console.log('[OpenSourceScheduler] Scheduler already running');
    return;
  }

  if (intervalMinutes !== undefined) {
    SCRAPE_INTERVAL = intervalMinutes * 60 * 1000;
  }
  if (initialDelayMinutes !== undefined) {
    INITIAL_DELAY = initialDelayMinutes * 60 * 1000;
  }

  console.log(`[OpenSourceScheduler] Starting scheduler: interval=${SCRAPE_INTERVAL / 60000}min, initialDelay=${INITIAL_DELAY / 60000}min`);

  // Initial delay
  setTimeout(() => {
    refreshOpenSourceData().catch((error) => {
      console.error('[OpenSourceScheduler] Error in scheduled refresh:', error);
    });

    // Set up interval
    schedulerInterval = setInterval(() => {
      refreshOpenSourceData().catch((error) => {
        console.error('[OpenSourceScheduler] Error in scheduled refresh:', error);
      });
    }, SCRAPE_INTERVAL);
  }, INITIAL_DELAY);
}

/**
 * Stop the scheduler
 */
export function stopOpenSourceScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[OpenSourceScheduler] Scheduler stopped');
  }
}

