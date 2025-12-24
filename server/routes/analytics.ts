import { Router, Request, Response } from 'express';
import { trackEvent, getStatistics } from '../services/analyticsService.js';
import { requireAuth } from '../services/auth.js';

const router = Router();

// Track analytics event (public endpoint, no auth required)
router.post('/track', (req: Request, res: Response) => {
  try {
    const { event_type, page_path, page_title, user_id, session_id, country, city, event_data } = req.body;

    if (!event_type || !page_path) {
      return res.status(400).json({ error: 'event_type and page_path are required' });
    }

    // Get user_id from session if not provided and user is logged in
    const userId = user_id || (req.session.userId || undefined);

    trackEvent(req, {
      event_type,
      page_path,
      page_title,
      user_id: userId,
      session_id,
      country,
      city,
      event_data,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Analytics] Track error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics statistics (admin only)
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if user is admin (for now, check via environment variable or config)
    // TODO: Add proper admin check
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const currentUsername = req.session.username;
    
    if (currentUsername !== adminUsername) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = getStatistics(days);

    res.json(stats);
  } catch (error) {
    console.error('[Analytics] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;

