import { Router } from 'express';
import { publicItemOps } from '../services/database';
import { triggerPublicScraping } from '../services/schedulers/publicScrapingSchedulerService';

const router = Router();

// Get all public items (no auth required)
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;
        const platform = req.query.platform as string | undefined;

        let items: any[];
        let total: number;

        if (platform && ['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'].includes(platform)) {
            items = publicItemOps.findByPlatform.all(platform, limit, offset) as any[];
            const countResult = publicItemOps.countByPlatform.all() as Array<{ platform: string; count: number }>;
            const platformCount = countResult.find(c => c.platform === platform);
            total = platformCount?.count || 0;
        } else {
            items = publicItemOps.findAll.all(limit, offset) as any[];
            const countResult = publicItemOps.countByPlatform.all() as Array<{ platform: string; count: number }>;
            total = countResult.reduce((sum, c) => sum + c.count, 0);
        }

        // Parse tags from JSON string
        const parsedItems = items.map(item => ({
            ...item,
            tags: item.tags ? JSON.parse(item.tags) : [],
        }));

        res.json({
            items: parsedItems,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get public items error:', error);
        res.status(500).json({ error: 'Failed to get public items' });
    }
});

// Get items by platform
router.get('/:platform', (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;

        const items = publicItemOps.findByPlatform.all(platform, limit, offset) as any[];
        const countResult = publicItemOps.countByPlatform.all() as Array<{ platform: string; count: number }>;
        const platformCount = countResult.find(c => c.platform === platform);
        const total = platformCount?.count || 0;

        // Parse tags from JSON string
        const parsedItems = items.map(item => ({
            ...item,
            tags: item.tags ? JSON.parse(item.tags) : [],
        }));

        res.json({
            items: parsedItems,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get public items by platform error:', error);
        res.status(500).json({ error: 'Failed to get public items' });
    }
});

// Trigger manual scraping (for testing)
router.post('/scrape', async (req, res) => {
    try {
        res.json({ message: 'Scraping started', status: 'running' });
        
        // Run scraping in background
        triggerPublicScraping()
            .then(result => {
                console.log('Manual scraping completed:', result);
            })
            .catch(err => {
                console.error('Manual scraping error:', err);
            });
    } catch (error) {
        console.error('Trigger scraping error:', error);
        res.status(500).json({ error: 'Failed to trigger scraping' });
    }
});

// Get item counts by platform
router.get('/stats/counts', (req, res) => {
    try {
        const countResult = publicItemOps.countByPlatform.all() as Array<{ platform: string; count: number }>;
        
        const counts: Record<string, number> = {
            All: 0,
            Weibo: 0,
            Xiaohongshu: 0,
            Bilibili: 0,
            Douyin: 0,
        };

        // Handle case where countResult might be undefined or empty
        if (countResult && Array.isArray(countResult)) {
            countResult.forEach(({ platform, count }) => {
                if (counts.hasOwnProperty(platform)) {
                    counts[platform] = count;
                    counts.All += count;
                }
            });
        }

        res.json({ counts });
    } catch (error) {
        console.error('Get public item counts error:', error);
        res.status(500).json({ error: 'Failed to get item counts' });
    }
});

export default router;
