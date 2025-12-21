import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Settings, TrendingUp, Hash, Sparkles, Layers, X } from 'lucide-react';
import { Platform } from '../types';
import { PLATFORM_NAMES } from '../constants';
import { itemsApi, accountsApi } from '../api/api';
import PrismLogo from './PrismLogo';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  activePlatform: Platform | 'All';
  setActivePlatform: (p: Platform | 'All') => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface ItemCounts {
  All: number;
  Weibo: number;
  Xiaohongshu: number;
  Bilibili: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, activePlatform, setActivePlatform, isOpen = true, onClose }) => {
  const [itemCounts, setItemCounts] = useState<ItemCounts>({
    All: 0,
    Weibo: 0,
    Xiaohongshu: 0,
    Bilibili: 0,
  });

  // Load item counts and refresh when sync completes
  const prevSyncingPlatformsRef = useRef<Platform[]>([]);
  
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const data = await itemsApi.getCounts();
        if (data.counts) {
          setItemCounts(data.counts);
        }
      } catch (err) {
        console.error('Error loading item counts:', err);
      }
    };

    const checkSyncStatus = async () => {
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
        if (syncJustCompleted) {
          await loadCounts();
        }
      } catch (err) {
        console.error('Error checking sync status:', err);
      }
    };

    loadCounts();
    checkSyncStatus();
    
    // Check sync status every 2 seconds (to detect completion quickly)
    const syncInterval = setInterval(checkSyncStatus, 2000);
    // Refresh counts every 30 seconds (as fallback)
    const countsInterval = setInterval(loadCounts, 30000);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(countsInterval);
    };
  }, []);

  const platforms: { id: Platform | 'All'; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'All', name: '全部平台', icon: <Layers size={16} />, color: 'text-slate-700' },
    { id: 'Weibo', name: PLATFORM_NAMES.Weibo, icon: <Hash size={16} />, color: 'text-red-500' },
    { id: 'Xiaohongshu', name: PLATFORM_NAMES.Xiaohongshu, icon: <Hash size={16} />, color: 'text-rose-500' },
    { id: 'Bilibili', name: PLATFORM_NAMES.Bilibili, icon: <Hash size={16} />, color: 'text-blue-500' },
  ];

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
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-200/50 transition-all duration-300 group-hover:scale-105">
              <PrismLogo size={20} />
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
              <span className="text-sm text-left">聚合面板</span>
            </button>
            <button
              onClick={() => setActiveView('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative ${activeView === 'insights'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                }`}
            >
              <TrendingUp size={18} className={activeView === 'insights' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="text-sm text-left">趋势洞察</span>
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
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                    activePlatform === p.id 
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

      {/* Footer / Settings */}
      <div className="p-3 mt-auto">
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
      </div>
    </aside>
    </>
  );
};

export default Sidebar;