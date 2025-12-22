import express from 'express';
import { requireAuth } from '../services/auth.js';
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

const router = express.Router();

// Scheduler configurations
interface SchedulerConfig {
    globalFocus: { enabled: boolean; interval: number; initialDelay: number };
    publicScraping: { enabled: boolean; interval: number; initialDelay: number };
    hotTrends: { enabled: boolean; interval: number; initialDelay: number };
    hotDrama: { enabled: boolean; interval: number; initialDelay: number };
    maoyan: { enabled: boolean; interval: number; initialDelay: number };
}

let schedulerConfig: SchedulerConfig = {
    globalFocus: { enabled: false, interval: 30, initialDelay: 1 },
    publicScraping: { enabled: false, interval: 30, initialDelay: 1 },
    hotTrends: { enabled: false, interval: 60, initialDelay: 1 },
    hotDrama: { enabled: false, interval: 1440, initialDelay: 1 },
    maoyan: { enabled: false, interval: 5, initialDelay: 0.5 }, // 5分钟刷新一次
};

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
        const { globalFocus, publicScraping, hotTrends, hotDrama, maoyan } = req.body;

        if (globalFocus !== undefined) {
            schedulerConfig.globalFocus = { ...schedulerConfig.globalFocus, ...globalFocus };
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
            if (schedulerConfig.maoyan.enabled) {
                stopMaoyanScheduler();
                setMaoyanSchedulerInterval(schedulerConfig.maoyan.interval);
                setMaoyanSchedulerInitialDelay(schedulerConfig.maoyan.initialDelay || 0.5);
                startMaoyanScheduler(schedulerConfig.maoyan.interval, schedulerConfig.maoyan.initialDelay || 0.5);
            } else {
                stopMaoyanScheduler();
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
            default:
                res.status(400).json({ error: 'Invalid task name' });
        }
    } catch (error: any) {
        console.error(`Error triggering ${req.params.task}:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
