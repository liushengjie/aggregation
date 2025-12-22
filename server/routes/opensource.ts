import express from 'express';
import { getGitHubTrending, getAvailableLanguages } from '../services/opensourceService.js';
import { refreshOpenSourceData } from '../services/schedulers/opensourceSchedulerService.js';

const router = express.Router();

/**
 * Get GitHub Trending projects
 * GET /api/opensource/trending?period=today&language=all
 */
router.get('/trending', (req, res) => {
  try {
    const period = (req.query.period as 'today' | 'week' | 'month') || 'today';
    const language = (req.query.language as string) || 'all';
    
    const projects = getGitHubTrending(period, language);
    
    res.json({
      items: projects,
      period,
      language,
      fetchedAt: projects.length > 0 ? projects[0].fetchedAt : new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[OpenSource API] Error fetching trending:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available languages
 * GET /api/opensource/languages
 */
router.get('/languages', (req, res) => {
  try {
    const languages = getAvailableLanguages();
    res.json({ languages });
  } catch (error: any) {
    console.error('[OpenSource API] Error fetching languages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger manual refresh
 * POST /api/opensource/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await refreshOpenSourceData();
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Data refreshed successfully',
        count: result.count 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to refresh' 
      });
    }
  } catch (error: any) {
    console.error('[OpenSource API] Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

