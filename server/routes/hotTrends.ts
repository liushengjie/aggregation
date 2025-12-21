import { Router } from 'express';
import { requireAuth } from '../services/auth';
import { hotTrendService } from '../services/hotTrendService';
import {
    scrapePlatform,
    scrapeAllPlatforms,
    isScraping,
    getScrapingPlatforms
} from '../services/schedulers/hotTrendSchedulerService';

const router = Router();

type HotTrendPlatform = 'Weibo' | 'Douyin' | 'Baidu' | 'Bilibili';

// Get hot trends for a platform and category
router.get('/', requireAuth, async (req, res) => {
    try {
        const platform = req.query.platform as string;
        const category = req.query.category as string;

        if (!platform) {
            return res.status(400).json({ error: 'Platform is required' });
        }

        const items = await hotTrendService.getHotTrends(platform, category);
        const categories = hotTrendService.getPlatformCategories(platform);

        res.json({
            items,
            categories,
            platform
        });
    } catch (error) {
        console.error('Get hot trends error:', error);
        res.status(500).json({ error: 'Failed to get hot trends' });
    }
});

// Get available platforms and their categories
router.get('/meta', requireAuth, (req, res) => {
    const platforms = ['Weibo', 'Douyin', 'Baidu', 'Bilibili'];
    const meta = platforms.map(p => ({
        id: p,
        name: p,
        categories: hotTrendService.getPlatformCategories(p),
        hasData: hotTrendService.hasData(p),
    }));
    res.json({ platforms: meta });
});

// Get scraping status
router.get('/status', requireAuth, (req, res) => {
    const scrapingPlatforms = getScrapingPlatforms();
    res.json({
        scraping: scrapingPlatforms.length > 0,
        scrapingPlatforms
    });
});

// Trigger sync for all platforms
router.post('/sync', requireAuth, async (req, res) => {
    try {
        const scrapingPlatforms = getScrapingPlatforms();
        if (scrapingPlatforms.length > 0) {
            return res.status(409).json({
                error: 'Scraping already in progress',
                scrapingPlatforms
            });
        }

        // Start scraping asynchronously
        scrapeAllPlatforms().catch(err => {
            console.error('[HotTrends API] Scrape all platforms error:', err);
        });

        res.json({
            message: 'Hot trend sync started for all platforms',
            platforms: ['Weibo', 'Douyin', 'Baidu', 'Bilibili']
        });
    } catch (error) {
        console.error('Sync hot trends error:', error);
        res.status(500).json({ error: 'Failed to start sync' });
    }
});

// Trigger sync for a specific platform
router.post('/sync/:platform', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;
        const validPlatforms = ['Weibo', 'Douyin', 'Baidu', 'Bilibili'];

        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        if (isScraping(platform as HotTrendPlatform)) {
            return res.status(409).json({
                error: 'Scraping already in progress for this platform',
                platform
            });
        }

        // Start scraping asynchronously
        scrapePlatform(platform as HotTrendPlatform).catch(err => {
            console.error(`[HotTrends API] Scrape ${platform} error:`, err);
        });

        res.json({
            message: `Hot trend sync started for ${platform}`,
            platform
        });
    } catch (error) {
        console.error('Sync platform hot trends error:', error);
        res.status(500).json({ error: 'Failed to start sync' });
    }
});

export default router;
