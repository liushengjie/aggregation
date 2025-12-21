import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Bell, RefreshCw, User, LogOut, ChevronDown, LayoutGrid, Menu, Loader2, Clock, Sparkles } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { useAuth } from '../contexts/AuthContext';
import { globalFocusApi, publicItemsApi, accountsApi } from '../api/api';
import { PLATFORM_NAMES } from '../constants';
import { Platform, SocialItem } from '../types';
import ContentCard from '../components/ContentCard';

interface GlobalFocusViewProps {
    activePlatform: Platform | 'All';
    setActivePlatform: (platform: Platform | 'All') => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    scrollToTop: () => void;
    onLoginClick?: () => void;
    onCountsChange?: (counts: { All: number; Weibo: number; Xiaohongshu: number; Bilibili: number; Douyin: number }) => void;
    onLastUpdatedChange?: (lastUpdated: string) => void;
    onActiveTabChange?: (tab: 'public' | 'favorite') => void;
}

const GlobalFocusView: React.FC<GlobalFocusViewProps> = ({
    activePlatform,
    setActivePlatform,
    sidebarOpen,
    setSidebarOpen,
    scrollToTop,
    onLoginClick,
    onCountsChange,
    onLastUpdatedChange,
    onActiveTabChange
}) => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'public' | 'favorite'>('public'); // 新增：两个 tab
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<SocialItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
    const [isAppending, setIsAppending] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [itemCounts, setItemCounts] = useState<{ All: number; Weibo: number; Xiaohongshu: number; Bilibili: number; Douyin: number }>({
        All: 0,
        Weibo: 0,
        Xiaohongshu: 0,
        Bilibili: 0,
        Douyin: 0,
    });
    const [syncingPlatforms, setSyncingPlatforms] = useState<Platform[]>([]);
    const itemsPerPage = 30;

    // Scroll container ref
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Load items from API with pagination
    const loadItems = useCallback(async (page: number = 1, append: boolean = false) => {
        // 公开数据不需要登录
        if (activeTab === 'favorite' && !user) return;

        if (append) {
            setShowLoadingIndicator(true);
            setIsAppending(true);
        }

        setItemsLoading(true);
        const loadStartTime = Date.now();

        try {
            let data;
            if (activeTab === 'public') {
                // 使用公开数据 API
                data = activePlatform === 'All'
                    ? await publicItemsApi.getAll(page, itemsPerPage)
                    : await publicItemsApi.getByPlatform(activePlatform, page, itemsPerPage);
            } else {
                // 使用用户个人数据 API
                data = activePlatform === 'All'
                    ? await globalFocusApi.getAll(page, itemsPerPage)
                    : await globalFocusApi.getByPlatform(activePlatform, page, itemsPerPage);
            }

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
                    const elapsed = Date.now() - loadStartTime;
                    const remainingDelay = Math.max(0, 1000 - elapsed);

                    setTimeout(() => {
                        setItems(prev => {
                            const existingIds = new Set(prev.map(item => item.id));
                            const newItems = transformedItems.filter(item => !existingIds.has(item.id));
                            return [...prev, ...newItems];
                        });
                        setShowLoadingIndicator(false);
                        setIsAppending(false);
                        setItemsLoading(false);
                        const newLastUpdated = new Date().toLocaleTimeString();
                        setLastUpdated(newLastUpdated);
                        onLastUpdatedChange?.(newLastUpdated);
                    }, remainingDelay);
                } else {
                    setItems(transformedItems);
                    setShowLoadingIndicator(false);
                    setIsAppending(false);
                    const newLastUpdated = new Date().toLocaleTimeString();
                    setLastUpdated(newLastUpdated);
                    onLastUpdatedChange?.(newLastUpdated);
                }

                if (data.pagination) {
                    setTotalItems(data.pagination.total);
                    setHasMore(page < data.pagination.pages);
                } else {
                    setHasMore(data.items.length === itemsPerPage);
                }
            } else {
                if (!append) setItems([]);
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
            if (!append) setItemsLoading(false);
        }
    }, [user, activePlatform, activeTab]);

    const loadMore = useCallback(() => {
        if (!hasMore || itemsLoading) return;
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        loadItems(nextPage, true);
    }, [hasMore, itemsLoading, currentPage, loadItems]);

    // Handle scroll to load more
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const { scrollTop, scrollHeight, clientHeight } = container;
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
    }, [hasMore, itemsLoading, loadMore]);

    // Load item counts - reload when tab changes
    useEffect(() => {
        const loadCounts = async () => {
            try {
                let newCounts;
                if (activeTab === 'public') {
                    const data = await publicItemsApi.getCounts();
                    if (data.counts) {
                        newCounts = {
                            All: data.counts.All || 0,
                            Weibo: data.counts.Weibo || 0,
                            Xiaohongshu: data.counts.Xiaohongshu || 0,
                            Bilibili: data.counts.Bilibili || 0,
                            Douyin: data.counts.Douyin || 0,
                        };
                        setItemCounts(newCounts);
                        onCountsChange?.(newCounts);
                    }
                } else {
                    if (!user) {
                        // Reset counts when not logged in and on favorite tab
                        newCounts = {
                            All: 0,
                            Weibo: 0,
                            Xiaohongshu: 0,
                            Bilibili: 0,
                            Douyin: 0,
                        };
                        setItemCounts(newCounts);
                        onCountsChange?.(newCounts);
                        return;
                    }
                    const data = await globalFocusApi.getCounts();
                    if (data.counts) {
                        newCounts = {
                            All: data.counts.All || 0,
                            Weibo: data.counts.Weibo || 0,
                            Xiaohongshu: data.counts.Xiaohongshu || 0,
                            Bilibili: data.counts.Bilibili || 0,
                            Douyin: data.counts.Douyin || 0,
                        };
                        setItemCounts(newCounts);
                        onCountsChange?.(newCounts);
                    }
                }
            } catch (err) {
                console.error('Error loading item counts:', err);
            }
        };
        loadCounts();
        const interval = setInterval(loadCounts, 30000);
        return () => clearInterval(interval);
    }, [user, activeTab]);

    // Load sync status
    const prevSyncingPlatformsRef = useRef<Platform[]>([]);
    useEffect(() => {
        if (!user) return;
        const loadSyncStatus = async () => {
            try {
                const data = await accountsApi.getSyncStatus();
                const currentSyncing = data.syncingPlatforms || [];
                const prevSyncing = prevSyncingPlatformsRef.current;
                const syncJustCompleted = prevSyncing.length > 0 && currentSyncing.length === 0;

                setSyncingPlatforms(currentSyncing);
                prevSyncingPlatformsRef.current = currentSyncing;

                if (syncJustCompleted) {
                    const countsData = await globalFocusApi.getCounts();
                    if (countsData.counts) setItemCounts(countsData.counts);
                }
            } catch (err) {
                console.error('Error loading sync status:', err);
            }
        };
        loadSyncStatus();
        const interval = setInterval(loadSyncStatus, 2000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        // For public tab, load even without user
        // For favorite tab, require user login
        if (activeTab === 'favorite' && !user) return;
        setCurrentPage(1);
        setHasMore(true);
        // Reset lastUpdated when switching tabs to show loading state
        setLastUpdated('加载中...');
        loadItems(1, false);
    }, [user, activePlatform, activeTab, loadItems]);

    // Notify parent when activeTab changes
    useEffect(() => {
        onActiveTabChange?.(activeTab);
    }, [activeTab, onActiveTabChange]);

    const filteredItems = useMemo(() => {
        let filtered = items;
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
    }, [items, activePlatform, searchQuery]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60 glass-shimmer">
                {/* Mobile: Top row */}
                <div className="flex items-center justify-between w-full lg:hidden">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
                                <LayoutGrid size={16} strokeWidth={2.5} />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex-shrink-0">
                                    <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                                        {activePlatform === 'All' ? '全网聚焦' : `${PLATFORM_NAMES[activePlatform as Platform]} 精选`}
                                    </h2>
                                    <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                                        {`已同步 ${activePlatform === 'All' ? itemCounts.All : itemCounts[activePlatform as keyof typeof itemCounts]} 条内容`}
                                    </p>
                                </div>
                                {/* Tab Switcher - Mobile */}
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => {
                                            setActiveTab('public');
                                            setCurrentPage(1);
                                            setHasMore(true);
                                            setItems([]);
                                        }}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'public'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-white/50 text-slate-600 hover:bg-white/80'
                                            }`}
                                    >
                                        全网推荐
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                onLoginClick?.();
                                                return;
                                            }
                                            setActiveTab('favorite');
                                            setCurrentPage(1);
                                            setHasMore(true);
                                            setItems([]);
                                        }}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'favorite'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-white/50 text-slate-600 hover:bg-white/80'
                                            } ${!user ? 'opacity-50' : ''}`}
                                    >
                                        我喜爱的
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { setCurrentPage(1); setHasMore(true); loadItems(1, false); }}
                        disabled={itemsLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 group flex-shrink-0"
                    >
                        <RefreshCw size={14} className={itemsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
                        刷新
                    </button>
                </div>

                {/* Mobile: Bottom row */}
                <div className="w-full lg:hidden">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="搜索内容..."
                            className="w-full pl-9 pr-4 py-2 bg-white/50 border border-transparent rounded-md text-sm font-bold focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Desktop: Left */}
                <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
                            <LayoutGrid size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex-shrink-0">
                                <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                                    {activePlatform === 'All' ? '全网聚焦' : `${PLATFORM_NAMES[activePlatform as Platform]} 精选`}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                        {`已同步 ${activePlatform === 'All' ? itemCounts.All : itemCounts[activePlatform as keyof typeof itemCounts]} 条内容`}
                                    </p>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                    <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                        <Clock size={10} />
                                        Last Update: {lastUpdated}
                                    </div>
                                </div>
                            </div>
                            {/* Tab Switcher - Desktop */}
                            <div className="flex items-center gap-2 ml-2">
                                <button
                                    onClick={() => {
                                        setActiveTab('public');
                                        setCurrentPage(1);
                                        setHasMore(true);
                                        setItems([]);
                                    }}
                                    className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'public'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-white/50 text-slate-600 hover:bg-white/80'
                                        }`}
                                >
                                    全网推荐
                                </button>
                                <button
                                    onClick={() => {
                                        if (!user) {
                                            onLoginClick?.();
                                            return;
                                        }
                                        setActiveTab('favorite');
                                        setCurrentPage(1);
                                        setHasMore(true);
                                        setItems([]);
                                    }}
                                    className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'favorite'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-white/50 text-slate-600 hover:bg-white/80'
                                        } ${!user ? 'opacity-50' : ''}`}
                                >
                                    我喜爱的
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="relative group max-w-xs w-full min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="搜索内容..."
                            className="w-full pl-9 pr-4 py-2 bg-white/50 border border-transparent rounded-md text-xs font-bold focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Desktop: Right */}
                <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                    {syncingPlatforms.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200/50 rounded-md text-xs font-bold text-indigo-600 whitespace-nowrap animate-in fade-in slide-in-from-right duration-300 pulse-glow">
                            <div className="flex items-center gap-0.5">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span>{PLATFORM_NAMES[syncingPlatforms[0] as Platform]}正在同步采集</span>
                        </div>
                    )}
                    <button
                        onClick={() => { setCurrentPage(1); setHasMore(true); loadItems(1, false); }}
                        disabled={itemsLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 group"
                    >
                        <RefreshCw size={14} className={itemsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
                        刷新内容
                    </button>
                </div>
            </header>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-0 lg:pr-1 pt-3 lg:pt-0">
                <div className="space-y-4">
                    {itemsLoading && items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-3 ipad-glass rounded-md border border-white/60">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">加载中...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-24 text-center ipad-glass rounded-md border border-white/60 stagger-item">
                            <div className="w-12 h-12 bg-white/50 rounded-md flex items-center justify-center mx-auto mb-3 border border-white/50">
                                <Search size={20} className="text-slate-400" />
                            </div>
                            <h3 className="text-sm font-black text-slate-800">暂无内容</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {searchQuery ? '尝试更换关键词' : '等待数据同步 or 点击刷新'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="pb-10">
                                <Masonry
                                    breakpointCols={{ default: 6, 2560: 6, 1536: 5, 1280: 4, 1024: 3, 640: 2 }}
                                    className="masonry-grid"
                                    columnClassName="masonry-grid_column"
                                >
                                    {filteredItems.map((item, idx) => (
                                        <ContentCard key={item.id} item={item} index={idx} />
                                    ))}
                                </Masonry>
                            </div>
                            {hasMore && (isAppending || showLoadingIndicator) && (
                                <div className="flex justify-center py-6 animate-in fade-in duration-300">
                                    <Loader2 className="animate-spin text-indigo-500" size={24} strokeWidth={2.5} />
                                </div>
                            )}
                            {!hasMore && items.length > 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs font-medium stagger-item">
                                    已加载全部 {totalItems || items.length} 条消息
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalFocusView;
