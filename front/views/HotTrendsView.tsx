import React, { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, ExternalLink, ChevronRight, Loader2, Globe, TrendingUp, Zap, Award, Menu, Sparkles, Clock } from 'lucide-react';
import { hotTrendsApi } from '../api/api';

interface HotTrendItem {
    rank: number;
    title: string;
    hotness: string;
    url: string;
    category?: string;
}

interface Category {
    id: string;
    name: string;
}

interface PlatformMeta {
    id: string;
    name: string;
    categories: Category[];
    hasData?: boolean;
}

interface PlatformData {
    platformId: string;
    platformName: string;
    items: HotTrendItem[];
    categories: Category[];
    activeCategory: string;
    loading: boolean;
}

const PLATFORM_MAP: Record<string, string> = {
    'Weibo': '微博',
    'Douyin': '抖音',
    'Baidu': '百度',
    'Bilibili': '哔哩哔哩'
};

const HotTrendsView: React.FC = () => {
    const [platformsMeta, setPlatformsMeta] = useState<PlatformMeta[]>([]);
    const [platformsData, setPlatformsData] = useState<Record<string, PlatformData>>({});
    const [metaLoading, setMetaLoading] = useState(true);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [activeMobilePlatform, setActiveMobilePlatform] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

    const loadPlatformTrends = useCallback(async (platformId: string, categoryId?: string) => {
        setPlatformsData(prev => ({
            ...prev,
            [platformId]: { ...prev[platformId], loading: true }
        }));

        try {
            const data = await hotTrendsApi.getTrends(platformId, categoryId);
            setPlatformsData(prev => ({
                ...prev,
                [platformId]: {
                    ...prev[platformId],
                    items: data.items,
                    activeCategory: categoryId || (prev[platformId]?.categories[0]?.id || ''),
                    loading: false
                }
            }));
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error(`Error loading trends for ${platformId}:`, err);
            setPlatformsData(prev => ({
                ...prev,
                [platformId]: { ...prev[platformId], loading: false }
            }));
        }
    }, []);

    const loadAllTrends = useCallback(async (meta: PlatformMeta[]) => {
        setGlobalLoading(true);
        const initialData: Record<string, PlatformData> = {};

        meta.forEach(p => {
            initialData[p.id] = {
                platformId: p.id,
                platformName: p.name,
                items: [],
                categories: p.categories,
                activeCategory: p.categories[0]?.id || '',
                loading: true
            };
        });
        setPlatformsData(initialData);

        if (meta.length > 0 && !activeMobilePlatform) {
            setActiveMobilePlatform(meta[0].id);
        }

        await Promise.all(meta.map(p => loadPlatformTrends(p.id, p.categories[0]?.id)));
        setGlobalLoading(false);
    }, [loadPlatformTrends, activeMobilePlatform]);

    const init = useCallback(async () => {
        setMetaLoading(true);
        try {
            const data = await hotTrendsApi.getMeta();
            setPlatformsMeta(data.platforms);
            await loadAllTrends(data.platforms);
        } catch (err) {
            console.error('Error initializing hot trends:', err);
        } finally {
            setMetaLoading(false);
        }
    }, [loadAllTrends]);

    useEffect(() => {
        init();
    }, [init]);

    const handleGlobalSync = async () => {
        setGlobalLoading(true);
        try {
            await hotTrendsApi.syncAll();
            await new Promise(resolve => setTimeout(resolve, 3000));
            const data = await hotTrendsApi.getMeta();
            setPlatformsMeta(data.platforms);
            await loadAllTrends(data.platforms);
        } catch (err) {
            console.error('Error syncing hot trends:', err);
            init();
        } finally {
            setGlobalLoading(false);
        }
    };

    const handlePlatformSync = async (platformId: string) => {
        setPlatformsData(prev => ({
            ...prev,
            [platformId]: { ...prev[platformId], loading: true }
        }));
        try {
            await hotTrendsApi.syncPlatform(platformId);
            await new Promise(resolve => setTimeout(resolve, 4000));
            await loadPlatformTrends(platformId, platformsData[platformId]?.activeCategory);
        } catch (err) {
            console.error(`Error syncing ${platformId}:`, err);
            await loadPlatformTrends(platformId, platformsData[platformId]?.activeCategory);
        }
    };

    const getPlatformColor = (id: string) => {
        switch (id) {
            case 'Weibo': return 'from-red-500 to-rose-600';
            case 'Douyin': return 'from-slate-800 to-black';
            case 'Baidu': return 'from-blue-500 to-indigo-600';
            case 'Bilibili': return 'from-pink-400 to-rose-500';
            default: return 'from-indigo-500 to-purple-600';
        }
    };

    if (metaLoading && Object.keys(platformsData).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 ipad-glass rounded-md border border-white/60">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">初始化热榜中...</p>
            </div>
        );
    }

    const renderPlatformCard = (platform: PlatformMeta, index: number) => {
        const data = platformsData[platform.id];
        if (!data) return null;

        return (
            <div
                key={platform.id}
                className="ipad-glass rounded-md border border-white/60 shadow-sm flex flex-col h-full overflow-hidden group transition-all duration-500 stagger-item"
                style={{ animationDelay: `${index * 100}ms` }}
            >
                {/* High-Contrast Card Header */}
                <div className={`p-4 bg-gradient-to-br ${getPlatformColor(platform.id)} flex items-center justify-between relative overflow-hidden shrink-0 glass-shimmer`}>
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                        <Zap size={80} />
                    </div>
                    <div className="flex items-center gap-2.5 relative z-10">
                        <div className="w-9 h-9 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                            <Globe size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                {PLATFORM_MAP[platform.id] || platform.name}
                                {index === 0 && <Sparkles size={14} className="text-amber-300 animate-pulse" />}
                            </h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Trending Now</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handlePlatformSync(platform.id)}
                        disabled={data.loading}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-all relative z-10"
                    >
                        <RefreshCw size={16} className={data.loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Category Selector */}
                <div className="px-3 py-2.5 bg-white/40 border-b border-slate-100/50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {platform.categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => loadPlatformTrends(platform.id, cat.id)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${data.activeCategory === cat.id
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white/60 text-slate-500 hover:text-slate-800 hover:bg-white border border-white/60'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-white/20">
                    {data.loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing</span>
                        </div>
                    ) : data.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Data Available</p>
                        </div>
                    ) : (
                        data.items.map((item, idx) => (
                            <a
                                key={idx}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-1.5 rounded-md hover:bg-white/80 transition-all group/item border border-transparent hover:border-white/60"
                            >
                                <div className="relative shrink-0">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-black relative z-10 ${item.rank <= 3
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {item.rank}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <span className="block text-sm font-bold text-slate-700 group-hover/item:text-slate-900 transition-colors truncate">
                                        {item.title}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center gap-0.5 text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                                            <Flame size={10} className="fill-orange-500" />
                                            {item.hotness}
                                        </div>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </a>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col pb-0 lg:pb-4 overflow-hidden">
            <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60">
                {/* Mobile: Top row */}
                <div className="flex items-center justify-between w-full lg:hidden">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                            onClick={() => (window as any).toggleSidebar?.()}
                            className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
                                <TrendingUp size={16} strokeWidth={2.5} />
                            </div>
                            <div className="flex-shrink-0">
                                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                                    全网热搜看板
                                </h2>
                                <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                                    Real-time Trends
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleGlobalSync}
                        disabled={globalLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 group flex-shrink-0"
                    >
                        <RefreshCw size={14} className={globalLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
                        刷新
                    </button>
                </div>

                {/* Desktop: Left */}
                <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
                            <TrendingUp size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex-shrink-0">
                            <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                                全网热搜看板
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap uppercase tracking-widest">
                                    Global Real-time Trends Dashboard
                                </p>
                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                    <Clock size={10} />
                                    Last Update: {lastUpdated}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop: Right */}
                <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-white/60 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm pulse-glow">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        Live Sync Active
                    </div>
                    <button
                        onClick={handleGlobalSync}
                        disabled={globalLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 group"
                    >
                        <RefreshCw size={14} className={globalLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} strokeWidth={2.5} />
                        全局刷新
                    </button>
                </div>
            </header>

            {/* Mobile Platform Tabs */}
            <div className="lg:hidden px-3 py-2 bg-white/40 border-b border-slate-100/50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {platformsMeta.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setActiveMobilePlatform(p.id)}
                        className={`whitespace-nowrap px-5 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${activeMobilePlatform === p.id
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white/60 text-slate-500 border border-white/60'
                            }`}
                    >
                        {PLATFORM_MAP[p.id] || p.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {/* Mobile View */}
                <div className="lg:hidden h-full">
                    {platformsMeta.find(p => p.id === activeMobilePlatform) && renderPlatformCard(platformsMeta.find(p => p.id === activeMobilePlatform)!, 0)}
                </div>

                {/* Desktop View */}
                <div className="hidden lg:grid h-full grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {platformsMeta.map((platform, idx) => renderPlatformCard(platform, idx))}
                </div>
            </div>
        </div>
    );
};

export default HotTrendsView;
