import { Router } from 'express';
import { requireAuth } from '../services/auth';
import { itemOps } from '../services/database';

const router = Router();

// Get all items for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;

        const items = itemOps.findByUser.all(req.session.userId, limit, offset);
        const countResult = itemOps.countByUser.get(req.session.userId) as { count: number };

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

// Get items by platform
router.get('/:platform', requireAuth, (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
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

// Get single item by ID
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

// Get item counts by platform
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

export default router;
