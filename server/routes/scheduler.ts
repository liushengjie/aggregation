import express from 'express';
import { requireAuth } from '../services/auth.js';
import { schedulerConfigOps } from '../services/database.js';
import {
    triggerSync,
    triggerPublicScraping,
    getSyncStatusForUser,
    startScheduler,
    stopScheduler,
    setSchedulerInterval,
    getSchedulerInterval,
    setSchedulerInitialDelay,
    getSchedulerInitialDelay,
    startPublicScrapingScheduler,
    stopPublicScrapingScheduler,
    setPublicScrapingSchedulerInterval,
    getPublicScrapingSchedulerInterval,
    setPublicScrapingSchedulerInitialDelay,
    getPublicScrapingSchedulerInitialDelay
} from '../services/schedulers/globalFocusSchedulerService.js';
import {
    scrapeAllPlatforms as scrapeHotTrends,
    startHotTrendScheduler,
    stopHotTrendScheduler,
    getScrapingPlatforms as getHotTrendScrapingPlatforms,
    setHotTrendSchedulerInterval,
    getHotTrendSchedulerInterval,
    setHotTrendSchedulerInitialDelay,
    getHotTrendSchedulerInitialDelay
} from '../services/schedulers/hotTrendSchedulerService.js';
import {
    refreshHotDramaData,
    startHotDramaScheduler,
    stopHotDramaScheduler,
    isHotDramaScraping,
    setHotDramaSchedulerInterval,
    getHotDramaSchedulerInterval,
    setHotDramaSchedulerInitialDelay,
    getHotDramaSchedulerInitialDelay,
    // 猫眼相关
    refreshMaoyanData,
    startMaoyanScheduler,
    stopMaoyanScheduler,
    isMaoyanScrapingNow,
    setMaoyanSchedulerInterval,
    getMaoyanSchedulerInterval,
    setMaoyanSchedulerInitialDelay,
    getMaoyanSchedulerInitialDelay
} from '../services/schedulers/hotDramaSchedulerService.js';
import {
    refreshOpenSourceData,
    startOpenSourceScheduler,
    stopOpenSourceScheduler,
    isOpenSourceScraping,
    setOpenSourceSchedulerInterval,
    getOpenSourceSchedulerInterval,
    setOpenSourceSchedulerInitialDelay,
    getOpenSourceSchedulerInitialDelay
} from '../services/schedulers/opensourceSchedulerService.js';

const router = express.Router();

// Scheduler configurations
interface SchedulerConfig {
    globalFocus: { enabled: boolean; interval: number; initialDelay: number };
    publicScraping: { enabled: boolean; interval: number; initialDelay: number };
    hotTrends: { enabled: boolean; interval: number; initialDelay: number };
    hotDrama: { enabled: boolean; interval: number; initialDelay: number };
    maoyan: { enabled: boolean; interval: number; initialDelay: number };
    opensource: { enabled: boolean; interval: number; initialDelay: number };
}

// Default configuration
const defaultConfig: SchedulerConfig = {
    globalFocus: { enabled: false, interval: 30, initialDelay: 1 },
    publicScraping: { enabled: false, interval: 30, initialDelay: 1 },
    hotTrends: { enabled: false, interval: 60, initialDelay: 1 },
    hotDrama: { enabled: false, interval: 1440, initialDelay: 1 },
    maoyan: { enabled: false, interval: 5, initialDelay: 0.5 },
    opensource: { enabled: false, interval: 60, initialDelay: 1 },
};

// Load configuration from database
function loadSchedulerConfig(): SchedulerConfig {
    try {
        const configs = schedulerConfigOps.getAll.all() as Array<{
            scheduler_name: string;
            enabled: number;
            interval_minutes: number;
            initial_delay_minutes: number;
        }>;

        const config: SchedulerConfig = { ...defaultConfig };

        for (const row of configs) {
            const schedulerConfig = {
                enabled: row.enabled === 1,
                interval: row.interval_minutes,
                initialDelay: row.initial_delay_minutes,
            };

            switch (row.scheduler_name) {
                case 'globalFocus':
                    config.globalFocus = schedulerConfig;
                    break;
                case 'publicScraping':
                    config.publicScraping = schedulerConfig;
                    break;
                case 'hotTrends':
                    config.hotTrends = schedulerConfig;
                    break;
                case 'hotDrama':
                    config.hotDrama = schedulerConfig;
                    break;
                case 'maoyan':
                    config.maoyan = schedulerConfig;
                    break;
                case 'opensource':
                    config.opensource = schedulerConfig;
                    break;
            }
        }

        return config;
    } catch (error) {
        console.error('[Scheduler] Error loading config from database, using defaults:', error);
        return defaultConfig;
    }
}

// Save a scheduler configuration to database
function saveSchedulerConfig(schedulerName: string, config: { enabled: boolean; interval: number; initialDelay: number }) {
    try {
        schedulerConfigOps.upsert.run(
            schedulerName,
            config.enabled ? 1 : 0,
            config.interval,
            config.initialDelay
        );
    } catch (error) {
        console.error(`[Scheduler] Error saving config for ${schedulerName}:`, error);
        throw error;
    }
}

// Initialize scheduler configuration from database
let schedulerConfig: SchedulerConfig = loadSchedulerConfig();

// Start schedulers based on loaded configuration
function startSchedulersFromConfig() {
    console.log('[Scheduler] Starting schedulers from saved configuration...');

    if (schedulerConfig.globalFocus.enabled) {
        setSchedulerInterval(schedulerConfig.globalFocus.interval);
        setSchedulerInitialDelay(schedulerConfig.globalFocus.initialDelay);
        startScheduler(schedulerConfig.globalFocus.interval, schedulerConfig.globalFocus.initialDelay);
        console.log(`[Scheduler] GlobalFocus scheduler started (interval: ${schedulerConfig.globalFocus.interval}min)`);
    }

    if (schedulerConfig.publicScraping.enabled) {
        setPublicScrapingSchedulerInterval(schedulerConfig.publicScraping.interval);
        setPublicScrapingSchedulerInitialDelay(schedulerConfig.publicScraping.initialDelay);
        startPublicScrapingScheduler(schedulerConfig.publicScraping.interval, schedulerConfig.publicScraping.initialDelay);
        console.log(`[Scheduler] PublicScraping scheduler started (interval: ${schedulerConfig.publicScraping.interval}min)`);
    }

    if (schedulerConfig.hotTrends.enabled) {
        setHotTrendSchedulerInterval(schedulerConfig.hotTrends.interval);
        setHotTrendSchedulerInitialDelay(schedulerConfig.hotTrends.initialDelay);
        startHotTrendScheduler(schedulerConfig.hotTrends.interval, schedulerConfig.hotTrends.initialDelay);
        console.log(`[Scheduler] HotTrends scheduler started (interval: ${schedulerConfig.hotTrends.interval}min)`);
    }

    if (schedulerConfig.hotDrama.enabled) {
        setHotDramaSchedulerInterval(schedulerConfig.hotDrama.interval);
        setHotDramaSchedulerInitialDelay(schedulerConfig.hotDrama.initialDelay);
        startHotDramaScheduler(schedulerConfig.hotDrama.interval, schedulerConfig.hotDrama.initialDelay);
        console.log(`[Scheduler] HotDrama scheduler started (interval: ${schedulerConfig.hotDrama.interval}min)`);
    }


    if (schedulerConfig.maoyan.enabled) {
        stopMaoyanScheduler(); // 先停止,避免重复启动
        startMaoyanScheduler(schedulerConfig.maoyan.interval, schedulerConfig.maoyan.initialDelay);
        console.log(`[Scheduler] Maoyan scheduler started (interval: ${schedulerConfig.maoyan.interval}min)`);
    }

    if (schedulerConfig.opensource.enabled) {
        setOpenSourceSchedulerInterval(schedulerConfig.opensource.interval);
        setOpenSourceSchedulerInitialDelay(schedulerConfig.opensource.initialDelay);
        startOpenSourceScheduler(schedulerConfig.opensource.interval, schedulerConfig.opensource.initialDelay);
        console.log(`[Scheduler] OpenSource scheduler started (interval: ${schedulerConfig.opensource.interval}min)`);
    }
}

// Export function to start schedulers on server startup
export function initializeSchedulers() {
    schedulerConfig = loadSchedulerConfig();
    startSchedulersFromConfig();
}

// Get all scheduler status and config
router.get('/status', requireAuth, (req, res) => {
    try {
        const syncingPlatforms = getSyncStatusForUser(req.session.userId!);
        const hotTrendScraping = getHotTrendScrapingPlatforms();

        res.json({
            config: schedulerConfig,
            status: {
                globalFocus: {
                    running: syncingPlatforms.length > 0,
                    syncingPlatforms: syncingPlatforms,
                },
                publicScraping: {
                    running: false,
                },
                hotTrends: {
                    running: hotTrendScraping.length > 0,
                    scrapingPlatforms: hotTrendScraping,
                },
                hotDrama: {
                    running: isHotDramaScraping(),
                },
                maoyan: {
                    running: isMaoyanScrapingNow(),
                },
                opensource: {
                    running: isOpenSourceScraping(),
                },
            },
        });
    } catch (error: any) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update scheduler configuration
router.post('/config', requireAuth, (req, res) => {
    try {
        const { globalFocus, publicScraping, hotTrends, hotDrama, maoyan, opensource } = req.body;

        if (globalFocus !== undefined) {
            schedulerConfig.globalFocus = { ...schedulerConfig.globalFocus, ...globalFocus };
            // Save to database
            saveSchedulerConfig('globalFocus', schedulerConfig.globalFocus);

            if (schedulerConfig.globalFocus.enabled) {
                stopScheduler();
                setSchedulerInterval(schedulerConfig.globalFocus.interval);
                setSchedulerInitialDelay(schedulerConfig.globalFocus.initialDelay || 1);
                startScheduler(schedulerConfig.globalFocus.interval, schedulerConfig.globalFocus.initialDelay || 1);
            } else {
                stopScheduler();
            }
        }

        if (publicScraping !== undefined) {
            schedulerConfig.publicScraping = { ...schedulerConfig.publicScraping, ...publicScraping };
            // Save to database
            saveSchedulerConfig('publicScraping', schedulerConfig.publicScraping);

            if (schedulerConfig.publicScraping.enabled) {
                stopPublicScrapingScheduler();
                setPublicScrapingSchedulerInterval(schedulerConfig.publicScraping.interval);
                setPublicScrapingSchedulerInitialDelay(schedulerConfig.publicScraping.initialDelay || 1);
                startPublicScrapingScheduler(schedulerConfig.publicScraping.interval, schedulerConfig.publicScraping.initialDelay || 1);
            } else {
                stopPublicScrapingScheduler();
            }
        }

        if (hotTrends !== undefined) {
            schedulerConfig.hotTrends = { ...schedulerConfig.hotTrends, ...hotTrends };
            // Save to database
            saveSchedulerConfig('hotTrends', schedulerConfig.hotTrends);

            if (schedulerConfig.hotTrends.enabled) {
                stopHotTrendScheduler();
                setHotTrendSchedulerInterval(schedulerConfig.hotTrends.interval);
                setHotTrendSchedulerInitialDelay(schedulerConfig.hotTrends.initialDelay || 1);
                startHotTrendScheduler(schedulerConfig.hotTrends.interval, schedulerConfig.hotTrends.initialDelay || 1);
            } else {
                stopHotTrendScheduler();
            }
        }

        if (hotDrama !== undefined) {
            schedulerConfig.hotDrama = { ...schedulerConfig.hotDrama, ...hotDrama };
            // Save to database
            saveSchedulerConfig('hotDrama', schedulerConfig.hotDrama);

            if (schedulerConfig.hotDrama.enabled) {
                stopHotDramaScheduler();
                setHotDramaSchedulerInterval(schedulerConfig.hotDrama.interval);
                setHotDramaSchedulerInitialDelay(schedulerConfig.hotDrama.initialDelay || 1);
                startHotDramaScheduler(schedulerConfig.hotDrama.interval, schedulerConfig.hotDrama.initialDelay || 1);
            } else {
                stopHotDramaScheduler();
            }
        }

        if (maoyan !== undefined) {
            schedulerConfig.maoyan = { ...schedulerConfig.maoyan, ...maoyan };
            // Save to database
            saveSchedulerConfig('maoyan', schedulerConfig.maoyan);

            if (schedulerConfig.maoyan.enabled) {
                stopMaoyanScheduler();
                setMaoyanSchedulerInterval(schedulerConfig.maoyan.interval);
                setMaoyanSchedulerInitialDelay(schedulerConfig.maoyan.initialDelay || 0.5);
                startMaoyanScheduler(schedulerConfig.maoyan.interval, schedulerConfig.maoyan.initialDelay || 0.5);
            } else {
                stopMaoyanScheduler();
            }
        }

        if (opensource !== undefined) {
            schedulerConfig.opensource = { ...schedulerConfig.opensource, ...opensource };
            // Save to database
            saveSchedulerConfig('opensource', schedulerConfig.opensource);

            if (schedulerConfig.opensource.enabled) {
                stopOpenSourceScheduler();
                setOpenSourceSchedulerInterval(schedulerConfig.opensource.interval);
                setOpenSourceSchedulerInitialDelay(schedulerConfig.opensource.initialDelay || 1);
                startOpenSourceScheduler(schedulerConfig.opensource.interval, schedulerConfig.opensource.initialDelay || 1);
            } else {
                stopOpenSourceScheduler();
            }
        }

        res.json({ success: true, config: schedulerConfig });
    } catch (error: any) {
        console.error('Error updating scheduler config:', error);
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual execution
router.post('/trigger/:task', requireAuth, async (req, res) => {
    try {
        const { task } = req.params;

        switch (task) {
            case 'global-focus':
                await triggerSync(req.session.userId!);
                res.json({ success: true, message: 'Global focus sync triggered' });
                break;
            case 'public-scraping':
                await triggerPublicScraping();
                res.json({ success: true, message: 'Public scraping triggered' });
                break;
            case 'hot-trends':
                await scrapeHotTrends();
                res.json({ success: true, message: 'Hot trends scraping triggered' });
                break;
            case 'hot-drama':
                const dramaResult = await refreshHotDramaData();
                if (dramaResult.success) {
                    res.json({ success: true, message: `Hot drama refresh triggered. Processed ${dramaResult.count} items.` });
                } else {
                    res.status(500).json({ success: false, error: dramaResult.error || 'Failed to refresh' });
                }
                break;
            case 'maoyan':
                const maoyanResult = await refreshMaoyanData();
                if (maoyanResult.success) {
                    const total = maoyanResult.data ?
                        maoyanResult.data.boxOffice.length + maoyanResult.data.calendar.length +
                        maoyanResult.data.tvRanking.length + maoyanResult.data.webSeriesRanking.length +
                        maoyanResult.data.varietyRanking.length : 0;
                    res.json({ success: true, message: `Maoyan refresh triggered. Fetched ${total} items.` });
                } else {
                    res.status(500).json({ success: false, error: maoyanResult.error || 'Failed to refresh' });
                }
                break;
            case 'opensource':
                const opensourceResult = await refreshOpenSourceData();
                if (opensourceResult.success) {
                    res.json({ success: true, message: `OpenSource refresh triggered. Fetched ${opensourceResult.count} items.` });
                } else {
                    res.status(500).json({ success: false, error: opensourceResult.error || 'Failed to refresh' });
                }
                break;
            default:
                res.status(400).json({ error: 'Invalid task name' });
        }
    } catch (error: any) {
        console.error(`Error triggering ${req.params.task}:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
