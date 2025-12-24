import express from 'express';
import { hotDramaOps } from '../services/database.js';
import { refreshHotDramaData } from '../services/schedulers/hotDramaSchedulerService.js';
import { 
  getMaoyanData, 
  getBoxOffice, 
  getComingMovies, 
  getTvRanking, 
  getWebSeriesRanking, 
  getVarietyRanking
} from '../services/hotDramaService.js';

const router = express.Router();

// Get all hot dramas (with pagination and search support)
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = (page - 1) * limit;
        const mediaType = req.query.media_type as string | undefined; // 'movie' or 'tv'
        const search = req.query.search as string | undefined;

        let dramas;
        let total: number;
        
        if (search && search.trim()) {
            // 搜索模式
            const searchPattern = `%${search.trim()}%`;
            
            if (mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
                dramas = hotDramaOps.searchByTitleAndType.all(searchPattern, mediaType, limit, offset);
                const countResult = hotDramaOps.countSearchByType.get(searchPattern, mediaType) as { total: number };
                total = countResult.total;
            } else {
                dramas = hotDramaOps.searchByTitle.all(searchPattern, limit, offset);
                const countResult = hotDramaOps.countSearch.get(searchPattern) as { total: number };
                total = countResult.total;
            }
        } else if (mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
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

// ============================================
// 猫眼数据 API
// ============================================
// 创建独立的猫眼路由，支持 /api/maoyan 和 /api/hot-drama/maoyan
const maoyanRouter = express.Router();

/**
 * 获取所有猫眼数据
 * GET /  (挂载到 /api/maoyan 或 /api/hot-drama/maoyan)
 */
maoyanRouter.get('/', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await getMaoyanData(forceRefresh);
    res.json(data);
  } catch (error: any) {
    console.error('[Maoyan API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取票房数据
 * GET /box-office
 */
maoyanRouter.get('/box-office', async (req, res) => {
  try {
    const data = await getBoxOffice();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching box office:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取即将上映电影
 * GET /coming
 */
maoyanRouter.get('/coming', async (req, res) => {
  try {
    const data = await getComingMovies();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching coming movies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取电视剧排行
 * GET /tv
 */
maoyanRouter.get('/tv', async (req, res) => {
  try {
    const data = await getTvRanking();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching TV ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取网络剧排行
 * GET /web-series
 */
maoyanRouter.get('/web-series', async (req, res) => {
  try {
    const data = await getWebSeriesRanking();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching web series ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取综艺排行
 * GET /variety
 */
maoyanRouter.get('/variety', async (req, res) => {
  try {
    const data = await getVarietyRanking();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching variety ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 强制刷新数据
 * POST /refresh
 */
maoyanRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshMaoyanData } = await import('../services/schedulers/hotDramaSchedulerService.js');
    const result = await refreshMaoyanData();
    
    if (result.success && result.data) {
      res.json({ 
        success: true, 
        message: 'Data refreshed',
        fetchedAt: result.data.fetchedAt,
        counts: {
          boxOffice: result.data.boxOffice.length,
          calendar: result.data.calendar.length,
          tvRanking: result.data.tvRanking.length,
          webSeriesRanking: result.data.webSeriesRanking.length,
          varietyRanking: result.data.varietyRanking.length,
        }
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to refresh' });
    }
  } catch (error: any) {
    console.error('[Maoyan API] Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});

// 将猫眼路由挂载到 /maoyan 路径（用于 /api/hot-drama/maoyan）
router.use('/maoyan', maoyanRouter);

// 导出猫眼路由，用于 /api/maoyan
export { maoyanRouter };

export default router;
