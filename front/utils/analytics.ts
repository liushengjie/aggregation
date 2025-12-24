// Analytics tracking utility
// Generates a session ID and tracks page views

const SESSION_ID_KEY = 'analytics_session_id';
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Generate or retrieve session ID
function getSessionId(): string {
  const stored = localStorage.getItem(SESSION_ID_KEY);
  if (stored) {
    const { sessionId, timestamp } = JSON.parse(stored);
    // Check if session is still valid (within 30 minutes)
    if (Date.now() - timestamp < SESSION_EXPIRY) {
      return sessionId;
    }
  }

  // Generate new session ID
  const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(SESSION_ID_KEY, JSON.stringify({
    sessionId: newSessionId,
    timestamp: Date.now(),
  }));
  return newSessionId;
}

// Track page view
export function trackPageView(pagePath: string, pageTitle?: string) {
  try {
    const sessionId = getSessionId();
    
    // Use dynamic import to avoid circular dependencies
    import('../api/api').then(({ analyticsApi }) => {
      analyticsApi.track({
        event_type: 'pageview',
        page_path: pagePath,
        page_title: pageTitle || document.title,
        session_id: sessionId,
      }).catch((error) => {
        console.error('[Analytics] Failed to track page view:', error);
      });
    });
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
}

// Track custom event
export function trackEvent(
  eventType: 'click' | 'view',
  pagePath: string,
  eventData?: any
) {
  try {
    const sessionId = getSessionId();
    
    import('../api/api').then(({ analyticsApi }) => {
      analyticsApi.track({
        event_type: eventType,
        page_path: pagePath,
        session_id: sessionId,
        event_data: eventData,
      }).catch((error) => {
        console.error('[Analytics] Failed to track event:', error);
      });
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

