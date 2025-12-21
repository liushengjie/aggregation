import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ContentCard from './components/ContentCard';
import SettingsView from './components/SettingsView';
import InsightsView from './components/InsightsView';
import LoginForm from './components/LoginForm';
import { PLATFORM_NAMES } from './constants';
import { Platform, SocialItem } from './types';
import { itemsApi, accountsApi } from './api/api';
import { Search, Bell, Calendar, SlidersHorizontal, Loader2, RefreshCw, User, LogOut, ChevronDown, LayoutGrid, Settings, Menu, X } from 'lucide-react';
import Masonry from 'react-masonry-css';

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [activePlatform, setActivePlatform] = useState<Platform | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<SocialItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [itemCounts, setItemCounts] = useState<{ All: number; Weibo: number; Xiaohongshu: number; Bilibili: number }>({
    All: 0,
    Weibo: 0,
    Xiaohongshu: 0,
    Bilibili: 0,
  });
  const [syncingPlatforms, setSyncingPlatforms] = useState<Platform[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const itemsPerPage = 30;

  // Load items from API with pagination
  const loadItems = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) return;
    
    // For append mode, show loading indicator first
    if (append) {
      setShowLoadingIndicator(true);
      setIsAppending(true);
    }
    
    setItemsLoading(true);
    const loadStartTime = Date.now();
    
    try {
      const data = activePlatform === 'All' 
        ? await itemsApi.getAll(page, itemsPerPage)
        : await itemsApi.getByPlatform(activePlatform, page, itemsPerPage);

      if (data.items && data.items.length > 0) {
        const transformedItems: SocialItem[] = data.items.map((item: any) => ({
          id: `api-${item.id}`,
          platform: item.platform as Platform,
          title: item.title || '',
          author: item.author || '',
          thumbnail: item.thumbnail || '',
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

        if (append) {
          // Store pending items and ensure minimum 1 second delay
          const elapsed = Date.now() - loadStartTime;
          const remainingDelay = Math.max(0, 1000 - elapsed);
          
          setTimeout(() => {
            // Record scroll position before update
            const container = scrollContainerRef.current;
            const scrollTop = container?.scrollTop || 0;
            const scrollHeight = container?.scrollHeight || 0;
            
            // Update items
            setItems(prev => {
              const existingIds = new Set(prev.map(item => item.id));
              const newItems = transformedItems.filter(item => !existingIds.has(item.id));
              return [...prev, ...newItems];
            });
            
            // Restore scroll position after layout update using requestAnimationFrame
            requestAnimationFrame(() => {
              if (container) {
                // Calculate the difference in height and adjust scroll
                const newScrollHeight = container.scrollHeight;
                const heightDiff = newScrollHeight - scrollHeight;
                // Only adjust if new content was added above the viewport
                if (heightDiff > 0 && scrollTop > 0) {
                  // Maintain relative scroll position
                  container.scrollTop = scrollTop;
                }
              }
            });
            
            setShowLoadingIndicator(false);
            setIsAppending(false);
            setItemsLoading(false);
          }, remainingDelay);
        } else {
          setItems(transformedItems);
          setShowLoadingIndicator(false);
          setIsAppending(false);
        }

        // Update pagination state
        if (data.pagination) {
          setTotalItems(data.pagination.total);
          setHasMore(page < data.pagination.pages);
        } else {
          setHasMore(data.items.length === itemsPerPage);
        }
      } else {
        if (!append) {
          setItems([]);
        }
        setHasMore(false);
        setShowLoadingIndicator(false);
        setIsAppending(false);
      }
    } catch (err) {
      console.error('Error loading items:', err);
      setShowLoadingIndicator(false);
      setIsAppending(false);
      setItemsLoading(false);
    } finally {
      // Only set itemsLoading to false if not appending (for append mode, it's set after delay)
      if (!append) {
        setItemsLoading(false);
      }
    }
  }, [user, activePlatform]);

  // Load more items (for pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || itemsLoading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadItems(nextPage, true);
  }, [hasMore, itemsLoading, currentPage, loadItems]);

  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle scroll to load more
  useEffect(() => {
    if (activeView !== 'dashboard') return;
    
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          // 当滚动到距离底部 300px 时触发加载
          if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !itemsLoading) {
            loadMore();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeView, hasMore, itemsLoading, loadMore]);

  // Load item counts
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  // Load sync status and refresh counts when sync completes
  const prevSyncingPlatformsRef = useRef<Platform[]>([]);
  useEffect(() => {
    if (!user) return;
    const loadSyncStatus = async () => {
      try {
        const data = await accountsApi.getSyncStatus();
        const currentSyncing = data.syncingPlatforms || [];
        const prevSyncing = prevSyncingPlatformsRef.current;
        
        // Check if sync just completed (was syncing, now not)
        const wasSyncing = prevSyncing.length > 0;
        const isSyncing = currentSyncing.length > 0;
        const syncJustCompleted = wasSyncing && !isSyncing;
        
        setSyncingPlatforms(currentSyncing);
        prevSyncingPlatformsRef.current = currentSyncing;
        
        // If sync just completed, refresh item counts
        if (syncJustCompleted) {
          try {
            const countsData = await itemsApi.getCounts();
            if (countsData.counts) {
              setItemCounts(countsData.counts);
            }
          } catch (err) {
            console.error('Error refreshing item counts after sync:', err);
          }
        }
      } catch (err) {
        console.error('Error loading sync status:', err);
      }
    };
    loadSyncStatus();
    // Check sync status every 2 seconds
    const interval = setInterval(loadSyncStatus, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Reset and load first page when platform changes
  useEffect(() => {
    if (!user) return;
    setCurrentPage(1);
    setHasMore(true);
    loadItems(1, false);
  }, [user, activePlatform, loadItems]);

  const displayItems = items;

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

            {itemsLoading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3 ipad-glass rounded-md border border-white/60">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">加载中...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-24 text-center ipad-glass rounded-md border border-white/60">
                <div className="w-12 h-12 bg-white/50 rounded-md flex items-center justify-center mx-auto mb-3 border border-white/50">
                  <Search size={20} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-800">暂无内容</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {searchQuery ? '尝试更换关键词' : '等待数据同步或点击刷新'}
                </p>
              </div>
            ) : (
              <>
                <div className="pb-10">
                  <Masonry
                    breakpointCols={{
                      default: 6,
                      2560: 6,
                      1536: 5,
                      1280: 4,
                      1024: 3,
                      640: 2
                    }}
                    className="masonry-grid"
                    columnClassName="masonry-grid_column"
                  >
                    {filteredItems.map(item => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </Masonry>
                </div>
                {/* Loading indicator at bottom - Xiaohongshu style */}
                {hasMore && (isAppending || showLoadingIndicator) && (
                  <div className="flex justify-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-indigo-500" size={24} strokeWidth={2.5} />
                    </div>
                  </div>
                )}
                {!hasMore && items.length > 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium animate-in fade-in duration-300">
                    已加载全部 {totalItems || items.length} 条消息
                  </div>
                )}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex font-['Plus_Jakarta_Sans']">
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          // Scroll to top when view changes
          scrollToTop();
        }}
        activePlatform={activePlatform}
        setActivePlatform={(platform) => {
          setActivePlatform(platform);
          // Reset pagination when platform changes
          setCurrentPage(1);
          setHasMore(true);
          // Close sidebar on mobile after selection
          setSidebarOpen(false);
          // Scroll to top when platform changes
          scrollToTop();
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 lg:ml-[260px] ml-0 mr-0 lg:mr-3 my-0 lg:my-3 min-w-0 flex flex-col h-screen lg:h-[calc(100vh-24px)]">
        <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60">
          {/* Mobile: Top row - Menu button, Title and Actions */}
          <div className="flex items-center justify-between w-full lg:hidden">
            {/* Left: Menu button and Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                <Menu size={20} />
              </button>
              
              {/* Title and Stats */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
                  <LayoutGrid size={16} strokeWidth={2.5} />
                </div>
                <div className="flex-shrink-0">
                  <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                    {activePlatform === 'All' ? '全网聚焦' : `${PLATFORM_NAMES[activePlatform as Platform]} 精选`}
                  </h2>
                  <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                    {`已同步 ${activePlatform === 'All' ? itemCounts.All : itemCounts[activePlatform as keyof typeof itemCounts]} 条内容`}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Refresh button (mobile) */}
            <button
              onClick={() => {
                setCurrentPage(1);
                setHasMore(true);
                loadItems(1, false);
              }}
              disabled={itemsLoading}
              className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md group flex-shrink-0"
              title="刷新内容"
            >
              <RefreshCw size={14} className={itemsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
            </button>
          </div>

          {/* Mobile: Bottom row - Search */}
          <div className="w-full lg:hidden">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="搜索内容..."
                className="w-full pl-9 pr-4 py-2 bg-white/50 border border-transparent rounded-md text-sm font-bold focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none placeholder:font-medium placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop: Left - Title, Stats and Search */}
          <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
                <LayoutGrid size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-shrink-0">
                <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                  {activePlatform === 'All' ? '全网聚焦' : `${PLATFORM_NAMES[activePlatform as Platform]} 精选`}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                  {`已同步 ${activePlatform === 'All' ? itemCounts.All : itemCounts[activePlatform as keyof typeof itemCounts]} 条内容`}
                </p>
              </div>
            </div>

            {/* Desktop: Search - Right of Title */}
            <div className="relative group max-w-xs w-full min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="搜索内容..."
                className="w-full pl-9 pr-4 py-2 bg-white/50 border border-transparent rounded-md text-xs font-bold focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none placeholder:font-medium placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop: Right - Sync Status, Actions */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {/* Sync Status Indicator */}
            {syncingPlatforms.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200/50 rounded-md text-xs font-bold text-indigo-600 whitespace-nowrap animate-in fade-in slide-in-from-right duration-300">
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                </div>
                <span>{PLATFORM_NAMES[syncingPlatforms[0] as Platform]}正在同步采集</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                setCurrentPage(1);
                setHasMore(true);
                loadItems(1, false);
              }}
              disabled={itemsLoading}
              className="relative flex items-center justify-center w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md group"
              title="刷新内容"
            >
              <RefreshCw size={16} className={itemsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200/50"></div>

            {/* Notification */}
            <button className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded-md transition-all relative" title="通知">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-white/60 rounded-md transition-all border border-transparent hover:border-white/50 group"
                title="用户菜单"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-md shadow-xl border border-white/50 p-1.5 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="px-3 py-2 border-b border-slate-100/50 mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50/80 rounded-md transition-all font-bold text-xs">
                    <User size={14} />
                    个人资料
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50/80 rounded-md transition-all font-bold text-xs">
                    <Settings size={14} />
                    偏好设置
                  </button>
                  <div className="my-1 border-t border-slate-100/50"></div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50/50 rounded-md transition-all font-bold text-xs"
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-0 lg:pr-1 pt-3 lg:pt-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;