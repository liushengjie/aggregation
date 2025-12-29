import express from 'express';
import { hotDramaOps, maoyanOps, type MaoyanMovie } from '../services/database.js';
import { refreshHotDramaData } from '../services/schedulers/hotDramaSchedulerService.js';
import { scrapeMaoyanMovieList, scrapeMaoyanMovieDetail } from '../services/scrapers/hotDrama/maoyanScraper.js';

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
    console.log('[Maoyan API] 获取电影列表 - 直接调用爬虫');
    const result = await scrapeMaoyanMovieList();
    res.json({
      success: true,
      data: {
        total: result.total,
        items: result.movies,
        fetchedAt: result.fetchedAt
      }
    });
  } catch (error: any) {
    console.error('[Maoyan API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取猫眼实时票房数据
 * 该接口通过直接调用爬虫函数，实时抓取猫眼平台上的电影票房排行及相关数据。
 * 
 * GET /box-office (挂载路径取决于路由注册位置，通常为 /api/maoyan/box-office)
 * 
 * @returns {Object} 成功时返回包含 items (电影列表) 和 fetchedAt (抓取时间戳) 的对象
 * @throws {500} 爬虫抓取失败或服务器内部错误时返回错误信息
 */
maoyanRouter.get('/box-office', async (req, res) => {
  try {
    console.log('[Maoyan API] 获取票房数据 - 直接调用爬虫');
    const result = await scrapeMaoyanMovieList();
    res.json({
      items: result.movies,
      fetchedAt: result.fetchedAt
    });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching box office:', error);
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
        total: result.data.total,
        moviesCount: result.data.movies.length
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to refresh' });
    }
  } catch (error: any) {
    console.error('[Maoyan API] Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});



/**
 * 获取电影列表 - 从数据库读取
 * GET /movie-list
 */
maoyanRouter.get('/movie-list', async (req, res) => {
  try {
    console.log('[Maoyan API] 获取电影列表 - 从数据库读取');
    const movies = maoyanOps.getLatestMovieList.all() as MaoyanMovie[];

    res.json({
      success: true,
      data: {
        total: movies.length,
        items: movies,
        fetchedAt: movies.length > 0 ? movies[0].fetchedAt : new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Maoyan API] 获取电影列表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取电影明细
 * GET /movie-detail
 * 查询参数：
 *   - movieId: 电影ID（必填）
 *   - showDate: 日期，格式：YYYYMMDD（可选，默认为今天）
 */
maoyanRouter.get('/movie-detail', async (req, res) => {
  try {
    const movieId = req.query.movieId as string;
    const showDate = req.query.showDate as string | undefined;

    if (!movieId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: movieId'
      });
    }

    console.log(`[Maoyan API] 获取电影明细: movieId=${movieId}, showDate=${showDate || 'today'}`);
    const detail = await scrapeMaoyanMovieDetail(movieId, showDate);

    if (detail) {
      res.json({
        success: true,
        data: detail
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Movie detail not found'
      });
    }
  } catch (error: any) {
    console.error('[Maoyan API] 获取电影明细错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 将猫眼路由挂载到 /maoyan 路径（用于 /api/hot-drama/maoyan）
router.use('/maoyan', maoyanRouter);

// 导出猫眼路由，用于 /api/maoyan
export { maoyanRouter };

export default router;
