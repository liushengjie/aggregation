import { Router } from 'express';
import { requireAuth } from '../services/auth';
import { itemOps, publicItemOps } from '../services/database';
import { triggerPublicScraping } from '../services/schedulers/globalFocusSchedulerService';

const router = Router();

// Get all items for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;
        const platform = req.query.platform as string | undefined;
        const category = req.query.category as string | undefined;

        let items: any[];
        let countResult: { count: number };

        if (platform && category) {
            // 按平台和分类查询
            items = itemOps.findByUserPlatformAndCategory.all(req.session.userId, platform, category, limit, offset);
            countResult = itemOps.countByUserPlatformAndCategory.get(req.session.userId, platform, category) as { count: number };
        } else if (category) {
            // 按分类查询
            items = itemOps.findByUserAndCategory.all(req.session.userId, category, limit, offset);
            countResult = itemOps.countByUserAndCategory.get(req.session.userId, category) as { count: number };
        } else if (platform) {
            // 按平台查询
            items = itemOps.findByUserAndPlatform.all(req.session.userId, platform, limit, offset);
            countResult = itemOps.countByUserAndPlatform.get(req.session.userId, platform) as { count: number };
        } else {
            // 查询全部
            items = itemOps.findByUser.all(req.session.userId, limit, offset);
            countResult = itemOps.countByUser.get(req.session.userId) as { count: number };
        }

        // Parse tags from JSON string
        const parsedItems = (items as any[]).map(item => ({
            ...item,
            tags: item.tags ? JSON.parse(item.tags) : [],
        }));

        res.json({
            items: parsedItems,
            pagination: {
                page,
                limit,
                total: countResult.count,
                pages: Math.ceil(countResult.count / limit),
            },
        });
    } catch (error) {
        console.error('Get items error:', error);
        res.status(500).json({ error: 'Failed to get items' });
    }
});

// Get single item by ID (must be before /:platform)
router.get('/detail/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        const item = itemOps.findById.get(parseInt(id)) as any;

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Parse tags
        item.tags = item.tags ? JSON.parse(item.tags) : [];

        res.json({ item });
    } catch (error) {
        console.error('Get item error:', error);
        res.status(500).json({ error: 'Failed to get item' });
    }
});

// Get item counts by platform (must be before /:platform)
router.get('/stats/counts', requireAuth, (req, res) => {
    try {
        // Get total count
        const totalResult = itemOps.countByUser.get(req.session.userId) as { count: number };
        const total = totalResult.count;

        // Get counts by platform
        const platformCounts = itemOps.countByPlatforms.all(req.session.userId) as Array<{ platform: string; count: number }>;
        
        // Convert to object format
        const counts: Record<string, number> = {
            All: total,
            Weibo: 0,
            Xiaohongshu: 0,
            Bilibili: 0,
            Douyin: 0,
        };

        platformCounts.forEach(({ platform, count }) => {
            if (counts.hasOwnProperty(platform)) {
                counts[platform] = count;
            }
        });

        res.json({ counts });
    } catch (error) {
        console.error('Get item counts error:', error);
        res.status(500).json({ error: 'Failed to get item counts' });
    }
});

// Clear all items
router.delete('/clear', requireAuth, (req, res) => {
    try {
        itemOps.clearAll.run();
        res.json({ message: 'All items cleared' });
    } catch (error) {
        console.error('Clear items error:', error);
        res.status(500).json({ error: 'Failed to clear items' });
    }
});

// Public items routes (no auth required) - must be before /:platform
// Get public item counts by platform (more specific routes first)
router.get('/public/stats/counts', (req, res) => {
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

// Trigger manual public scraping (for testing)
router.post('/public/scrape', async (req, res) => {
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

// Get all public items (must be before /public/:platform to avoid matching /public as platform)
router.get('/public', (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;
        const platform = req.query.platform as string | undefined;
        const category = req.query.category as string | undefined;

        let items: any[];
        let total: number;

        if (platform && category && ['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'].includes(platform)) {
            // 按平台和分类查询
            items = publicItemOps.findByPlatformAndCategory.all(platform, category, limit, offset) as any[];
            const countResult = publicItemOps.countByPlatformAndCategory.get(platform, category) as { count: number };
            total = countResult?.count || 0;
        } else if (category) {
            // 按分类查询
            items = publicItemOps.findByCategory.all(category, limit, offset) as any[];
            const countResult = publicItemOps.countByCategory.all() as Array<{ category: string; count: number }>;
            const categoryCount = countResult.find(c => c.category === category);
            total = categoryCount?.count || 0;
        } else if (platform && ['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'].includes(platform)) {
            // 按平台查询
            items = publicItemOps.findByPlatform.all(platform, limit, offset) as any[];
            const countResult = publicItemOps.countByPlatform.all() as Array<{ platform: string; count: number }>;
            const platformCount = countResult.find(c => c.platform === platform);
            total = platformCount?.count || 0;
        } else {
            // 查询全部
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

// Get public items by platform (must be after /public to avoid conflict)
router.get('/public/:platform', (req, res) => {
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

// Get items by platform (must be last, as it matches any platform name)
router.get('/:platform', requireAuth, (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;

        const items = itemOps.findByUserAndPlatform.all(req.session.userId, platform, limit, offset);
        const countResult = itemOps.countByUserAndPlatform.get(req.session.userId, platform) as { count: number };

        // Parse tags from JSON string
        const parsedItems = (items as any[]).map(item => ({
            ...item,
            tags: item.tags ? JSON.parse(item.tags) : [],
        }));

        res.json({
            items: parsedItems,
            pagination: {
                page,
                limit,
                total: countResult.count,
                pages: Math.ceil(countResult.count / limit),
            },
        });
    } catch (error) {
        console.error('Get items by platform error:', error);
        res.status(500).json({ error: 'Failed to get items' });
    }
});

export default router;
