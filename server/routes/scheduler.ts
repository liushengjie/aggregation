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
    startPublicScrapingScheduler,
    stopPublicScrapingScheduler
} from '../services/schedulers/globalFocusSchedulerService.js';
import { 
    scrapeAllPlatforms as scrapeHotTrends,
    startHotTrendScheduler,
    stopHotTrendScheduler,
    getScrapingPlatforms as getHotTrendScrapingPlatforms
} from '../services/schedulers/hotTrendSchedulerService.js';
import { 
    refreshHotDramaData,
    startHotDramaScheduler,
    stopHotDramaScheduler,
    isHotDramaScraping,
    setHotDramaSchedulerHour,
    getHotDramaSchedulerHour
} from '../services/schedulers/hotDramaSchedulerService.js';
import {
    startHotTrendScheduler,
    stopHotTrendScheduler,
    setHotTrendSchedulerInterval,
    getHotTrendSchedulerInterval
} from '../services/schedulers/hotTrendSchedulerService.js';

const router = express.Router();

// Scheduler configurations (stored in memory, can be persisted to DB later)
interface SchedulerConfig {
    globalFocus: {
        enabled: boolean;
        interval: number; // minutes
    };
    publicScraping: {
        enabled: boolean;
        interval: number; // minutes
    };
    hotTrends: {
        enabled: boolean;
        interval: number; // minutes
    };
    hotDrama: {
        enabled: boolean;
        interval: number; // hours (for daily schedule)
        scheduleHour: number; // hour of day (0-23)
    };
}

let schedulerConfig: SchedulerConfig = {
    globalFocus: {
        enabled: false,
        interval: 30, // 30 minutes
    },
    publicScraping: {
        enabled: false,
        interval: 30, // 30 minutes
    },
    hotTrends: {
        enabled: false,
        interval: 60, // 60 minutes (1 hour)
    },
    hotDrama: {
        enabled: true,
        interval: 24, // 24 hours (1 day)
        scheduleHour: 2, // 2:00 AM
    },
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
                    running: false, // TODO: track public scraping status
                },
                hotTrends: {
                    running: hotTrendScraping.length > 0,
                    scrapingPlatforms: hotTrendScraping,
                },
                hotDrama: {
                    running: isHotDramaScraping(),
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
        const { globalFocus, publicScraping, hotTrends, hotDrama } = req.body;

        if (globalFocus !== undefined) {
            schedulerConfig.globalFocus = {
                ...schedulerConfig.globalFocus,
                ...globalFocus,
            };
            // Restart scheduler if config changed
            if (schedulerConfig.globalFocus.enabled) {
                stopScheduler();
                setSchedulerInterval(schedulerConfig.globalFocus.interval);
                startScheduler(schedulerConfig.globalFocus.interval);
            } else {
                stopScheduler();
            }
        }

        if (publicScraping !== undefined) {
            schedulerConfig.publicScraping = {
                ...schedulerConfig.publicScraping,
                ...publicScraping,
            };
            // Restart scheduler if config changed
            if (schedulerConfig.publicScraping.enabled) {
                stopPublicScrapingScheduler();
                startPublicScrapingScheduler(schedulerConfig.publicScraping.interval);
            } else {
                stopPublicScrapingScheduler();
            }
        }

        if (hotTrends !== undefined) {
            schedulerConfig.hotTrends = {
                ...schedulerConfig.hotTrends,
                ...hotTrends,
            };
            // Restart scheduler if config changed
            if (schedulerConfig.hotTrends.enabled) {
                stopHotTrendScheduler();
                setHotTrendSchedulerInterval(schedulerConfig.hotTrends.interval);
                startHotTrendScheduler(schedulerConfig.hotTrends.interval);
            } else {
                stopHotTrendScheduler();
            }
        }

        if (hotDrama !== undefined) {
            schedulerConfig.hotDrama = {
                ...schedulerConfig.hotDrama,
                ...hotDrama,
            };
            // Restart scheduler if config changed
            if (schedulerConfig.hotDrama.enabled) {
                stopHotDramaScheduler();
                setHotDramaSchedulerHour(schedulerConfig.hotDrama.scheduleHour);
                startHotDramaScheduler(schedulerConfig.hotDrama.scheduleHour);
            } else {
                stopHotDramaScheduler();
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
                const result = await refreshHotDramaData();
                if (result.success) {
                    res.json({ success: true, message: `Hot drama refresh triggered. Processed ${result.count} items.` });
                } else {
                    res.status(500).json({ success: false, error: result.error || 'Failed to refresh' });
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

