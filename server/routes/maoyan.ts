import express from 'express';
import { 
  getMaoyanData, 
  getBoxOffice, 
  getComingMovies, 
  getTvRanking, 
  getWebSeriesRanking, 
  getVarietyRanking,
  getCacheStatus,
  clearCache 
} from '../services/maoyanService.js';

const router = express.Router();

/**
 * 获取所有猫眼数据
 * GET /api/maoyan
 */
router.get('/', async (req, res) => {
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
 * GET /api/maoyan/box-office
 */
router.get('/box-office', async (req, res) => {
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
 * GET /api/maoyan/coming
 */
router.get('/coming', async (req, res) => {
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
 * GET /api/maoyan/tv
 */
router.get('/tv', async (req, res) => {
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
 * GET /api/maoyan/web-series
 */
router.get('/web-series', async (req, res) => {
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
 * GET /api/maoyan/variety
 */
router.get('/variety', async (req, res) => {
  try {
    const data = await getVarietyRanking();
    res.json({ items: data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Maoyan API] Error fetching variety ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取缓存状态
 * GET /api/maoyan/status
 */
router.get('/status', (req, res) => {
  const status = getCacheStatus();
  res.json(status);
});

/**
 * 强制刷新数据
 * POST /api/maoyan/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    clearCache();
    const data = await getMaoyanData(true);
    res.json({ 
      success: true, 
      message: 'Data refreshed',
      fetchedAt: data.fetchedAt,
      counts: {
        boxOffice: data.boxOffice.length,
        calendar: data.calendar.length,
        tvRanking: data.tvRanking.length,
        webSeriesRanking: data.webSeriesRanking.length,
        varietyRanking: data.varietyRanking.length,
      }
    });
  } catch (error: any) {
    console.error('[Maoyan API] Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
