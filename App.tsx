import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ContentCard from './components/ContentCard';
import SettingsView from './components/SettingsView';
import InsightsView from './components/InsightsView';
import LoginForm from './components/LoginForm';
import { MOCK_ITEMS, PLATFORM_NAMES } from './constants';
import { Platform, SocialItem } from './types';
import { itemsApi } from './services/api';
import { Search, Bell, Calendar, SlidersHorizontal, Loader2, RefreshCw, User, LogOut, ChevronDown, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [activePlatform, setActivePlatform] = useState<Platform | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<SocialItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Load items from API
  const loadItems = async () => {
    if (!user) return;
    setItemsLoading(true);
    try {
      const data = await itemsApi.getAll(1, 100);
      if (data.items && data.items.length > 0) {
        const transformedItems: SocialItem[] = data.items.map((item: any) => ({
          id: `api-${item.id}`,
          platform: item.platform as Platform,
          title: item.title || '',
          author: item.author || '',
          thumbnail: item.thumbnail || `https://picsum.photos/seed/${item.id}/600/400`,
          url: item.url || '#',
          timestamp: item.fetched_at || new Date().toISOString(),
          stats: {
            likes: item.likes || 0,
            comments: item.comments || 0,
            shares: item.shares || 0,
            views: item.views || 0,
          },
          tags: item.tags || [],
        }));

        // Interleave items to ensure mixed display
        const platforms = ['Weibo', 'Xiaohongshu', 'Bilibili'] as Platform[];
        const groupedItems: Record<Platform, SocialItem[]> = {
          Weibo: [],
          Xiaohongshu: [],
          Bilibili: []
        };

        transformedItems.forEach(item => {
          if (groupedItems[item.platform]) {
            groupedItems[item.platform].push(item);
          }
        });

        const interleavedItems: SocialItem[] = [];
        const maxCount = Math.max(...Object.values(groupedItems).map(g => g.length));

        for (let i = 0; i < maxCount; i++) {
          platforms.forEach(p => {
            if (groupedItems[p][i]) {
              interleavedItems.push(groupedItems[p][i]);
            }
          });
        }

        setItems(interleavedItems);
        setUseMockData(false);
      } else {
        setUseMockData(true);
      }
    } catch (err) {
      console.log('Using mock data due to API error');
      setUseMockData(true);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [user]);

  const displayItems = useMockData ? MOCK_ITEMS : items;

  const filteredItems = useMemo(() => {
    let filtered = displayItems;
    if (activePlatform !== 'All') {
      filtered = filtered.filter(item => item.platform === activePlatform);
    }
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [displayItems, activePlatform, searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/50 backdrop-blur-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'settings':
        return <SettingsView />;
      case 'insights':
        return <InsightsView />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Dashboard Header */}
            <div className="ipad-glass p-4 rounded-lg flex items-center justify-between border border-white/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-white/50">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                    {activePlatform === 'All' ? '全网聚焦' : `${PLATFORM_NAMES[activePlatform as Platform]} 精选`}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">
                    {useMockData
                      ? '示例数据模式'
                      : `已同步 ${filteredItems.length} 条内容`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadItems}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 hover:bg-white border border-white/50 rounded-lg text-xs font-bold text-slate-600 transition-all shadow-sm hover:shadow-md"
                >
                  <RefreshCw size={14} className={itemsLoading ? 'animate-spin' : ''} />
                  刷新
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-all shadow-md shadow-slate-300/50">
                  <SlidersHorizontal size={14} />
                  筛选
                </button>
              </div>
            </div>

            {itemsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3 ipad-glass rounded-lg border border-white/60">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Syncing...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
                {filteredItems.map(item => (
                  <ContentCard key={item.id} item={item} />
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-24 text-center ipad-glass rounded-lg border border-white/60">
                    <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center mx-auto mb-3 border border-white/50">
                      <Search size={20} className="text-slate-400" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800">暂无内容</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">尝试更换关键词</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex font-['Plus_Jakarta_Sans']">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        activePlatform={activePlatform}
        setActivePlatform={setActivePlatform}
      />

      <main className="flex-1 ml-[260px] mr-3 my-3 min-w-0 flex flex-col h-[calc(100vh-24px)]">
        <header className="h-14 ipad-glass rounded-lg mb-4 px-4 flex items-center justify-between shrink-0 z-40 border border-white/60">
          <div className="max-w-sm w-full relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="搜索..."
              className="w-full pl-9 pr-4 py-2 bg-white/50 border border-transparent rounded-lg text-xs font-bold focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:font-medium placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-all relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
              </button>
              <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-all">
                <Calendar size={18} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200/50"></div>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-white/60 rounded-lg transition-all border border-transparent hover:border-white/50 group"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white font-black text-[10px] shadow-sm shadow-indigo-200/50 group-hover:scale-105 transition-transform">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-black text-slate-800 leading-none">{user.username}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-lg shadow-xl border border-white/50 p-1.5 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="px-3 py-2 border-b border-slate-100/50 mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50/80 rounded-lg transition-all font-bold text-xs">
                    <User size={14} />
                    个人资料
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50/80 rounded-lg transition-all font-bold text-xs">
                    <Settings size={14} />
                    偏好设置
                  </button>
                  <div className="my-1 border-t border-slate-100/50"></div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50/50 rounded-lg transition-all font-bold text-xs"
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;