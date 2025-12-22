import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import SettingsView from './views/SettingsView';
import HotDramaView from './views/HotDramaView';
import LoginModal from './components/LoginModal';
import HotTrendsView from './views/HotTrendsView';
import GlobalFocusView from './views/GlobalFocusView';
import GameView from './views/GameView';
import OpenSourceView from './views/OpenSourceView';
import MusicView from './views/MusicView';
import { Platform } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [activePlatform, setActivePlatform] = useState<Platform | 'All'>('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activeGlobalTab, setActiveGlobalTab] = useState<'public' | 'favorite'>('public');
  const [globalFocusItemCounts, setGlobalFocusItemCounts] = useState<{ All: number; Weibo: number; Xiaohongshu: number; Bilibili: number; Douyin: number } | undefined>(undefined);
  const [globalFocusLastUpdated, setGlobalFocusLastUpdated] = useState<string>('');

  // Expose sidebar toggle to window for child views
  useEffect(() => {
    (window as any).toggleSidebar = () => setSidebarOpen(prev => !prev);
    return () => { delete (window as any).toggleSidebar; };
  }, []);

  const scrollToTop = useCallback(() => {
    // This will be handled by individual views if they have their own scroll containers
    // Or we can find the active scroll container and scroll it
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/50 backdrop-blur-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Allow access without login - users can view public content
  // if (!user) {
  //   return <LoginForm />;
  // }

  const renderContent = () => {
    switch (activeView) {
      case 'settings':
        // Settings requires login
        if (!user) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">需要登录</h2>
                <p className="text-slate-500">请先登录以访问系统配置</p>
              </div>
            </div>
          );
        }
        return <SettingsView />;
      case 'insights':
        return <HotDramaView />;
      case 'hot-trends':
        return <HotTrendsView />;
      case 'games':
        return <GameView />;
      case 'opensource':
        return <OpenSourceView />;
      case 'music':
        return <MusicView />;
      case 'dashboard':
      default:
        return (
          <GlobalFocusView
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            scrollToTop={scrollToTop}
            onLoginClick={() => setLoginModalOpen(true)}
            onCountsChange={(counts) => setGlobalFocusItemCounts(counts)}
            onLastUpdatedChange={(lastUpdated) => setGlobalFocusLastUpdated(lastUpdated)}
            onActiveTabChange={(tab) => setActiveGlobalTab(tab)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex font-['Plus_Jakarta_Sans']">
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          scrollToTop();
        }}
        activePlatform={activePlatform}
        setActivePlatform={(platform) => {
          setActivePlatform(platform);
          setSidebarOpen(false);
          scrollToTop();
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLoginClick={() => setLoginModalOpen(true)}
        itemCounts={globalFocusItemCounts}
        activeGlobalTab={activeGlobalTab}
      />

      <main className="flex-1 lg:ml-[260px] ml-0 mr-0 lg:mr-3 my-0 lg:my-3 min-w-0 flex flex-col h-screen lg:h-[calc(100vh-24px)]">
        <div className="flex-1 flex flex-col min-h-0">
          {renderContent()}
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          // Login successful, modal will close automatically
        }}
      />
    </div>
  );
};

export default App;