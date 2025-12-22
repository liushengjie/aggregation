
import express from 'express';
import { hotDramaOps } from '../services/database.js';
import { refreshHotDramaData } from '../services/schedulers/hotDramaSchedulerService.js';

const router = express.Router();

// Get all hot dramas (with pagination support)
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;
        const mediaType = req.query.media_type as string | undefined; // 'movie' or 'tv'

        let dramas;
        let total: number;
        
        if (mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
            // Filter by media type
            dramas = hotDramaOps.findAllPaginatedByType.all(mediaType, limit, offset);
            const countResult = hotDramaOps.countByType.get(mediaType) as { total: number };
            total = countResult.total;
        } else {
            // Get all
            dramas = hotDramaOps.findAllPaginated.all(limit, offset);
            const countResult = hotDramaOps.count.get() as { total: number };
            total = countResult.total;
        }
        
        const pages = Math.ceil(total / limit);

        res.json({
            items: dramas,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });
    } catch (error: any) {
        console.error('Error fetching hot dramas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Trigger refresh (kept for manual trigger if needed, but scheduler handles automatic refresh)
router.post('/refresh', async (req, res) => {
    try {
        const result = await refreshHotDramaData();
        if (result.success) {
            res.json({ success: true, count: result.count });
        } else {
            res.status(500).json({ error: result.error || 'Failed to refresh' });
        }
    } catch (error: any) {
        console.error('Error refreshing hot dramas:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
