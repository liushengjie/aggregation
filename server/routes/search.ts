import { Router } from 'express';
import { scrapeWeiboSearch } from '../services/scrapers/search/weiboSearchScraper.js';
import { scrapeXiaohongshuSearch } from '../services/scrapers/search/xiaohongshuSearchScraper.js';

const router = Router();

/**
 * 微博搜索接口
 * GET /api/search/weibo?q=关键词&page=1&limit=20
 */
router.get('/weibo', async (req, res) => {
    try {
        const keyword = req.query.q as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        if (!keyword) {
            return res.status(400).json({ 
                error: '缺少搜索关键词参数 q' 
            });
        }
        
        if (limit > 50) {
            return res.status(400).json({ 
                error: 'limit 参数不能超过 50' 
            });
        }
        
        console.log(`[Search API] 微博搜索: ${keyword}, 页码: ${page}, 数量: ${limit}`);
        
        const result = await scrapeWeiboSearch(keyword, { page, limit });
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error: any) {
        console.error('[Search API] 微博搜索失败:', error);
        res.status(500).json({ 
            success: false,
            error: '搜索失败',
            message: error.message 
        });
    }
});

/**
 * 小红书搜索接口
 * GET /api/search/xiaohongshu?q=关键词&page=1&limit=20
 */
router.get('/xiaohongshu', async (req, res) => {
    try {
        const keyword = req.query.q as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        if (!keyword) {
            return res.status(400).json({ 
                error: '缺少搜索关键词参数 q' 
            });
        }
        
        if (limit > 50) {
            return res.status(400).json({ 
                error: 'limit 参数不能超过 50' 
            });
        }
        
        console.log(`[Search API] 小红书搜索: ${keyword}, 页码: ${page}, 数量: ${limit}`);
        
        const result = await scrapeXiaohongshuSearch(keyword, { page, limit });
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error: any) {
        console.error('[Search API] 小红书搜索失败:', error);
        res.status(500).json({ 
            success: false,
            error: '搜索失败',
            message: error.message 
        });
    }
});

export default router;

