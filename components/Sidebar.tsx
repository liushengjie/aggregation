import React from 'react';
import { LayoutDashboard, Settings, TrendingUp, Hash, Layers, Radio } from 'lucide-react';
import { Platform } from '../types';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  activePlatform: Platform | 'All';
  setActivePlatform: (p: Platform | 'All') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, activePlatform, setActivePlatform }) => {
  const platforms: (Platform | 'All')[] = ['All', 'Weibo', 'Xiaohongshu', 'Bilibili'];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-white/90 backdrop-blur-xl border-r border-gray-100 z-50 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
      {/* Brand Section */}
      <div className="p-6 flex items-center gap-3.5 mb-2">
        <div className="relative group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded flex items-center justify-center text-white shadow-lg shadow-indigo-200 transition-all duration-300 group-hover:shadow-indigo-300 group-hover:scale-105">
            <Layers size={22} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-none">
            智汇聚合
          </h1>
          <p className="text-[10px] font-semibold text-indigo-500/80 mt-1 uppercase tracking-wider flex items-center gap-1">
            <Radio size={8} /> 
            全网实时监测
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-8 mt-2 overflow-y-auto custom-scrollbar">
        {/* Main Features */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">核心功能</p>
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group ${
                activeView === 'dashboard' 
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
              }`}
            >
              <LayoutDashboard size={19} className={activeView === 'dashboard' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
              <span>聚合面板</span>
            </button>
            <button
              onClick={() => setActiveView('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group ${
                activeView === 'insights' 
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
              }`}
            >
              <TrendingUp size={19} className={activeView === 'insights' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
              <span>趋势洞察</span>
              {activeView !== 'insights' && (
                <span className="ml-auto text-[9px] font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white px-1.5 py-0.5 rounded-sm shadow-sm">
                  AI
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Sources */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">内容源</p>
          <div className="space-y-1.5">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setActivePlatform(p);
                  setActiveView('dashboard');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group ${
                  activePlatform === p 
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 font-semibold' 
                    : 'text-gray-500 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-100 hover:text-gray-900 font-medium'
                }`}
              >
                <Hash size={18} className={activePlatform === p ? 'text-gray-400' : 'text-gray-400 group-hover:text-gray-600'} />
                <span>{p === 'All' ? '全部平台' : p}</span>
                {activePlatform === p && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-gray-100/80 bg-gray-50/50">
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group ${
            activeView === 'settings' 
              ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100 font-semibold' 
              : 'text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm font-medium'
          }`}
        >
          <Settings size={19} className={activeView === 'settings' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
          <span>系统配置</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;