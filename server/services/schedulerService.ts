import { accountOps } from './database';
import { syncPlatformContent } from './syncService';

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

// Sync interval in milliseconds (10 minutes)
const SYNC_INTERVAL = 10 * 60 * 1000;
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the scheduler
 */
export function startScheduler(): void {
    if (schedulerInterval) {
        console.log('[Scheduler] Scheduler already running');
        return;
    }

    console.log(`[Scheduler] Starting scheduler (interval: ${SYNC_INTERVAL / 1000 / 60} minutes)`);

    // Run immediately on start
    setTimeout(() => {
        syncAllConnectedAccounts();
    }, 30000); // Wait 30 seconds after server start

    // Then run every 10 minutes
    schedulerInterval = setInterval(() => {
        syncAllConnectedAccounts();
    }, SYNC_INTERVAL);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
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
