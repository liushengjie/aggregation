import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ContentCard from './components/ContentCard';
import SettingsView from './components/SettingsView';
import InsightsView from './components/InsightsView';
import { MOCK_ITEMS } from './constants';
import { Platform } from './types';
import { Search, Bell, Calendar, SlidersHorizontal } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [activePlatform, setActivePlatform] = useState<Platform | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let items = MOCK_ITEMS;
    if (activePlatform !== 'All') {
      items = items.filter(item => item.platform === activePlatform);
    }
    if (searchQuery) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  }, [activePlatform, searchQuery]);

  const renderContent = () => {
    switch (activeView) {
      case 'settings':
        return <SettingsView />;
      case 'insights':
        return <InsightsView />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activePlatform === 'All' ? '全网聚焦' : `${activePlatform} 精选`}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  实时汇总全网 Top 100 热门推荐。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-sm text-xs font-medium hover:bg-gray-50 transition-all shadow-sm">
                  <Calendar size={14} />
                  今日
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-sm text-xs font-medium hover:bg-gray-50 transition-all shadow-sm">
                  <SlidersHorizontal size={14} />
                  筛选
                </button>
              </div>
            </div>

            {/* Masonry Layout using CSS Columns */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4 pb-10">
              {filteredItems.map(item => (
                <ContentCard key={item.id} item={item} />
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center break-inside-avoid">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">没有找到相关内容</h3>
                  <p className="text-sm text-gray-500 mt-1">尝试更换关键词或平台。</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        activePlatform={activePlatform} 
        setActivePlatform={setActivePlatform} 
      />
      
      <main className="flex-1 ml-64 min-w-0">
        <header className="sticky top-0 z-40 h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 flex items-center justify-between">
          <div className="max-w-sm w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="搜索热门动态..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border-transparent rounded-sm text-xs focus:bg-white focus:border-indigo-300 focus:ring-0 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-sm transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                JD
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;