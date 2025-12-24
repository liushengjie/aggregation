import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Settings, TrendingUp, Hash, Sparkles, Layers, X, Flame, LogIn, LogOut, Gamepad2, Code, Music } from 'lucide-react';
import { Platform } from '../types';
import { PLATFORM_NAMES } from '../constants';
import { globalFocusApi, accountsApi, publicItemsApi } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import PrismLogo from './PrismLogo';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  activePlatform: Platform | 'All';
  setActivePlatform: (p: Platform | 'All') => void;
  isOpen?: boolean;
  onClose?: () => void;
  onLoginClick?: () => void;
  itemCounts?: { All: number; Weibo: number; Xiaohongshu: number; Bilibili: number; Douyin: number };
  activeGlobalTab?: 'public' | 'favorite';
}

interface ItemCounts {
  All: number;
  Weibo: number;
  Xiaohongshu: number;
  Bilibili: number;
  Douyin: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, activePlatform, setActivePlatform, isOpen = true, onClose, onLoginClick, itemCounts: externalItemCounts, activeGlobalTab }) => {
  const { user, logout } = useAuth();
  const [itemCounts, setItemCounts] = useState<ItemCounts>({
    All: 0,
    Weibo: 0,
    Xiaohongshu: 0,
    Bilibili: 0,
    Douyin: 0,
  });

  // Load item counts and refresh when sync completes
  const prevSyncingPlatformsRef = useRef<Platform[]>([]);

  // Use external counts if provided (from GlobalFocusView), otherwise load from API
  useEffect(() => {
    if (externalItemCounts) {
      // Use counts from GlobalFocusView (will update when tab changes)
      setItemCounts({
        All: externalItemCounts.All || 0,
        Weibo: externalItemCounts.Weibo || 0,
        Xiaohongshu: externalItemCounts.Xiaohongshu || 0,
        Bilibili: externalItemCounts.Bilibili || 0,
        Douyin: externalItemCounts.Douyin || 0,
      });
      return;
    }

    // Fallback: Load counts from API if not provided externally
    const loadCounts = async () => {
      try {
        // Use publicItemsApi for all users (public data)
        const data = await publicItemsApi.getCounts();
        if (data.counts) {
          setItemCounts({
            All: data.counts.All || 0,
            Weibo: data.counts.Weibo || 0,
            Xiaohongshu: data.counts.Xiaohongshu || 0,
            Bilibili: data.counts.Bilibili || 0,
            Douyin: data.counts.Douyin || 0,
          });
        }
      } catch (err) {
        console.error('Error loading item counts:', err);
      }
    };

    const checkSyncStatus = async () => {
      if (!user) return; // Skip sync status check for non-logged-in users

      try {
        const syncData = await accountsApi.getSyncStatus();
        const currentSyncing = syncData.syncingPlatforms || [];
        const prevSyncing = prevSyncingPlatformsRef.current;

        // Check if sync just completed (was syncing, now not)
        const wasSyncing = prevSyncing.length > 0;
        const isSyncing = currentSyncing.length > 0;
        const syncJustCompleted = wasSyncing && !isSyncing;

        prevSyncingPlatformsRef.current = currentSyncing;

        // If sync just completed, refresh item counts immediately
        if (syncJustCompleted && !externalItemCounts) {
          await loadCounts();
        }
      } catch (err) {
        console.error('Error checking sync status:', err);
      }
    };

    loadCounts();
    if (user) {
      checkSyncStatus();
      // Check sync status every 2 seconds (to detect completion quickly)
      const syncInterval = setInterval(checkSyncStatus, 2000);
      // Refresh counts every 30 seconds (as fallback) - only if not using external counts
      if (!externalItemCounts) {
        const countsInterval = setInterval(loadCounts, 30000);
        return () => {
          clearInterval(syncInterval);
          clearInterval(countsInterval);
        };
      }
      return () => {
        clearInterval(syncInterval);
      };
    } else {
      // Refresh counts every 30 seconds for public users - only if not using external counts
      if (!externalItemCounts) {
        const countsInterval = setInterval(loadCounts, 30000);
        return () => {
          clearInterval(countsInterval);
        };
      }
    }
  }, [user, externalItemCounts]);

  const allPlatforms: { id: Platform | 'All'; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'All', name: '全部平台', icon: <Layers size={16} />, color: 'text-slate-700' },
    { id: 'Weibo', name: PLATFORM_NAMES.Weibo, icon: <Hash size={16} />, color: 'text-red-500' },
    { id: 'Xiaohongshu', name: PLATFORM_NAMES.Xiaohongshu, icon: <Hash size={16} />, color: 'text-rose-500' },
    { id: 'Bilibili', name: PLATFORM_NAMES.Bilibili, icon: <Hash size={16} />, color: 'text-blue-500' },
    { id: 'Douyin', name: PLATFORM_NAMES.Douyin, icon: <Hash size={16} />, color: 'text-black' },
  ];

  // Filter out Douyin when activeGlobalTab is 'favorite'
  const platforms = activeGlobalTab === 'favorite'
    ? allPlatforms.filter(p => p.id !== 'Douyin')
    : allPlatforms;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`w-60 h-screen lg:h-[calc(100vh-24px)] fixed left-0 lg:left-3 top-0 lg:top-3 rounded-none lg:rounded-md ipad-glass z-50 flex flex-col overflow-hidden transition-transform duration-300 border-0 lg:border border-white/60
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-500 hover:bg-white/50 rounded-md transition-colors z-10"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
        {/* Brand Section */}
        <div className="p-5 mb-1">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 rounded-md flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                <PrismLogo size={28} />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight leading-none">
                棱镜聚合
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Micro Design
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Main Features */}
          <section>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 flex items-center gap-1.5">
              <Sparkles size={10} className="text-indigo-400" />
              核心功能
            </h2>
            <div className="space-y-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'dashboard'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <LayoutDashboard size={18} className={activeView === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网聚焦</span>
              </button>
              <button
                onClick={() => setActiveView('insights')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'insights'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <TrendingUp size={18} className={activeView === 'insights' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网热剧</span>
              </button>
              <button
                onClick={() => setActiveView('hot-trends')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'hot-trends'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <Flame size={18} className={activeView === 'hot-trends' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网热榜</span>
              </button>
              <button
                onClick={() => setActiveView('games')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'games'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <Gamepad2 size={18} className={activeView === 'games' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网游戏</span>
              </button>
              <button
                onClick={() => setActiveView('opensource')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'opensource'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <Code size={18} className={activeView === 'opensource' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网开源</span>
              </button>
              <button
                onClick={() => setActiveView('music')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'music'
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <Music size={18} className={activeView === 'music' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">全网音乐</span>
              </button>
            </div>
          </section>

          {/* Content Sources */}
          <section>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">内容源</h2>
            <div className="space-y-1">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlatform(p.id);
                    setActiveView('dashboard');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activePlatform === p.id
                    ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                    }`}
                >
                  <div className={`${activePlatform === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {p.icon}
                  </div>
                  <span className="text-sm flex-1 text-left">{p.name}</span>
                  {itemCounts[p.id as keyof ItemCounts] > 0 && (
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${activePlatform === p.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
                      }`}>
                      {itemCounts[p.id as keyof ItemCounts]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        </nav>

        {/* Footer - Settings (logged-in) or Login (not logged-in) */}
        <div className="p-3 mt-auto border-t border-white/20 space-y-2">
          {user ? (
            <>
              <button
                onClick={() => setActiveView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${activeView === 'settings'
                  ? 'bg-slate-800 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm font-medium border border-white/40'
                  }`}
              >
                <Settings size={18} className={activeView === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm text-left">系统配置</span>
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('确定要登出吗?')) {
                    await logout();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group bg-white/50 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:shadow-sm font-medium border border-white/40 hover:border-red-200"
              >
                <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
                <span className="text-sm text-left">登出</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onLoginClick?.()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-indigo-500/30 font-bold border-0 relative overflow-hidden"
            >
              <LogIn size={18} className="text-white relative z-10" />
              <span className="text-sm text-left relative z-10">登录</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;