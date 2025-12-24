import { useEffect } from 'react';
import { trackPageView } from '../utils/analytics';

interface AnalyticsTrackerProps {
  activeView: string;
}

// Analytics tracker component that automatically tracks page views
export function AnalyticsTracker({ activeView }: AnalyticsTrackerProps) {
  useEffect(() => {
    // Track page view when activeView changes
    const pagePath = `/${activeView === 'dashboard' ? '' : activeView}`;
    trackPageView(pagePath, document.title);
  }, [activeView]);

  // Also track initial page load
  useEffect(() => {
    const pagePath = `/${activeView === 'dashboard' ? '' : activeView}`;
    trackPageView(pagePath, document.title);
  }, []);

  return null;
}

