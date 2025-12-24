import { analyticsOps } from './database.js';
import { Request } from 'express';

interface AnalyticsEvent {
  event_type: 'pageview' | 'click' | 'view';
  page_path: string;
  page_title?: string;
  user_id?: number;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  event_data?: any;
}

// Parse user agent to extract device, browser, and OS info
function parseUserAgent(userAgent: string | undefined): { device_type: string; browser: string; os: string } {
  if (!userAgent) {
    return { device_type: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let device_type = 'desktop';
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device_type = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device_type = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('msie') || ua.includes('trident')) browser = 'IE';

  // Detect OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x') || ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { device_type, browser, os };
}

// Extract IP address from request
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function trackEvent(req: Request, event: Omit<AnalyticsEvent, 'ip_address' | 'user_agent' | 'device_type' | 'browser' | 'os'>) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const parsedUA = parseUserAgent(userAgent);
    const ipAddress = getClientIP(req);
    const referrer = req.headers.referer || req.headers.referrer || '';

    analyticsOps.insert.run(
      event.event_type,
      event.page_path,
      event.page_title || '',
      event.user_id || null,
      event.session_id || null,
      ipAddress,
      userAgent,
      referrer || null,
      parsedUA.device_type,
      parsedUA.browser,
      parsedUA.os,
      event.country || null,
      event.city || null,
      event.event_data ? JSON.stringify(event.event_data) : null
    );
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

// Get statistics for admin dashboard
export function getStatistics(days: number = 30) {
  const daysAgo = `-${days} days`;
  
  return {
    totalPageViews: (analyticsOps.getTotalPageViews.get() as { count: number }).count,
    totalUniqueVisitors: (analyticsOps.getTotalUniqueVisitors.get() as { count: number }).count,
    pageViewsToday: (analyticsOps.getPageViewsToday.get() as { count: number }).count,
    uniqueVisitorsToday: (analyticsOps.getUniqueVisitorsToday.get() as { count: number }).count,
    pageViewsByDate: analyticsOps.getPageViewsByDateRange.all(daysAgo) as Array<{ date: string; count: number }>,
    uniqueVisitorsByDate: analyticsOps.getUniqueVisitorsByDateRange.all(daysAgo) as Array<{ date: string; count: number }>,
    topPages: analyticsOps.getPageViewsByPath.all(daysAgo, 10) as Array<{ page_path: string; count: number }>,
    deviceStats: analyticsOps.getDeviceStats.all(daysAgo) as Array<{ device_type: string; count: number }>,
    browserStats: analyticsOps.getBrowserStats.all(daysAgo, 10) as Array<{ browser: string; count: number }>,
    osStats: analyticsOps.getOSStats.all(daysAgo, 10) as Array<{ os: string; count: number }>,
    referrerStats: analyticsOps.getReferrerStats.all(daysAgo, 10) as Array<{ referrer_type: string; count: number }>,
  };
}

// Clean up old analytics data (older than 90 days by default)
export function cleanupOldData(days: number = 90) {
  try {
    const result = analyticsOps.deleteOld.run(`-${days} days`);
    return (result as any).changes || 0;
  } catch (error) {
    console.error('[Analytics] Failed to cleanup old data:', error);
    return 0;
  }
}

