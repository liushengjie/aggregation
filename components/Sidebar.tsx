import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, TrendingUp, Hash, Sparkles, Layers } from 'lucide-react';
import { Platform } from '../types';
import { PLATFORM_NAMES } from '../constants';
import { itemsApi } from '../api/api';
import PrismLogo from './PrismLogo';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  activePlatform: Platform | 'All';
  setActivePlatform: (p: Platform | 'All') => void;
}

interface ItemCounts {
  All: number;
  Weibo: number;
  Xiaohongshu: number;
  Bilibili: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, activePlatform, setActivePlatform }) => {
  const [itemCounts, setItemCounts] = useState<ItemCounts>({
    All: 0,
    Weibo: 0,
    Xiaohongshu: 0,
    Bilibili: 0,
  });

  // Load item counts
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

    loadCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const platforms: { id: Platform | 'All'; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'All', name: '全部平台', icon: <Layers size={16} />, color: 'text-slate-700' },
    { id: 'Weibo', name: PLATFORM_NAMES.Weibo, icon: <Hash size={16} />, color: 'text-red-500' },
    { id: 'Xiaohongshu', name: PLATFORM_NAMES.Xiaohongshu, icon: <Hash size={16} />, color: 'text-rose-500' },
    { id: 'Bilibili', name: PLATFORM_NAMES.Bilibili, icon: <Hash size={16} />, color: 'text-blue-500' },
  ];

  return (
    <aside className="w-60 h-[calc(100vh-24px)] fixed left-3 top-3 rounded-lg ipad-glass z-50 flex flex-col overflow-hidden transition-all duration-300 border border-white/60">
      {/* Brand Section */}
      <div className="p-5 mb-1">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200/50 transition-all duration-300 group-hover:scale-105">
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative ${activeView === 'dashboard'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                }`}
            >
              <LayoutDashboard size={18} className={activeView === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="text-sm">聚合面板</span>
            </button>
            <button
              onClick={() => setActiveView('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative ${activeView === 'insights'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                }`}
            >
              <TrendingUp size={18} className={activeView === 'insights' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="text-sm">趋势洞察</span>
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative ${activePlatform === p.id
                  ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-300/50'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 font-medium border border-transparent'
                  }`}
              >
                <div className={`${activePlatform === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {p.icon}
                </div>
                <span className="text-sm flex-1">{p.name}</span>
                {itemCounts[p.id as keyof ItemCounts] > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activePlatform === p.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
                  }`}>
                    {itemCounts[p.id as keyof ItemCounts]}
                  </span>
                )}
                {activePlatform === p.id && (
                  <div className="ml-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${activeView === 'settings'
            ? 'bg-slate-800 text-white font-bold shadow-md shadow-slate-300/50'
            : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm font-medium border border-white/40'
            }`}
        >
          <Settings size={18} className={activeView === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm">系统配置</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;