import React, { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, ExternalLink, ChevronRight, Loader2, Globe, TrendingUp, Zap, Award, Sparkles, Menu } from 'lucide-react';
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

const HotTrendsView: React.FC = () => {
    const [platformsMeta, setPlatformsMeta] = useState<PlatformMeta[]>([]);
    const [platformsData, setPlatformsData] = useState<Record<string, PlatformData>>({});
    const [metaLoading, setMetaLoading] = useState(true);
    const [globalLoading, setGlobalLoading] = useState(false);

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

        await Promise.all(meta.map(p => loadPlatformTrends(p.id, p.categories[0]?.id)));
        setGlobalLoading(false);
    }, [loadPlatformTrends]);

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
            // Trigger backend scraping
            await hotTrendsApi.syncAll();
            // Wait a moment for scraping to start and produce some results
            await new Promise(resolve => setTimeout(resolve, 3000));
            // Reload metadata and trends
            const data = await hotTrendsApi.getMeta();
            setPlatformsMeta(data.platforms);
            await loadAllTrends(data.platforms);
        } catch (err) {
            console.error('Error syncing hot trends:', err);
            // Still try to load existing data
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
            // Wait for scraping
            await new Promise(resolve => setTimeout(resolve, 4000));
            // Reload this platform
            await loadPlatformTrends(platformId, platformsData[platformId]?.activeCategory);
        } catch (err) {
            console.error(`Error syncing ${platformId}:`, err);
            await loadPlatformTrends(platformId, platformsData[platformId]?.activeCategory);
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

    const getPlatformColor = (id: string) => {
        switch (id) {
            case 'Weibo': return 'from-red-500 to-rose-600';
            case 'Douyin': return 'from-slate-800 to-black';
            case 'Baidu': return 'from-blue-500 to-indigo-600';
            case 'Bilibili': return 'from-pink-400 to-rose-500';
            default: return 'from-indigo-500 to-purple-600';
        }
    };

    return (
        <div className="w-full h-full flex flex-col space-y-4 pb-4">
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
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                                Global Real-time Trends Dashboard
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop: Right */}
                <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded-full border border-white/60 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm">
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

            {/* Grid Layout - Flex-1 to fill height */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {platformsMeta.map(platform => {
                    const data = platformsData[platform.id];
                    if (!data) return null;

                    return (
                        <div key={platform.id} className="ipad-glass rounded-md border border-white/60 shadow-sm flex flex-col h-full overflow-hidden group hover:shadow-xl transition-all duration-500">
                            {/* High-Contrast Card Header */}
                            <div className={`p-4 bg-gradient-to-br ${getPlatformColor(platform.id)} flex items-center justify-between relative overflow-hidden shrink-0`}>
                                <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                                    <Zap size={80} />
                                </div>
                                <div className="flex items-center gap-2.5 relative z-10">
                                    <div className="w-8 h-8 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                        <Globe size={16} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white tracking-tight">{platform.name}</h3>
                                        <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Trending Now</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handlePlatformSync(platform.id)}
                                    disabled={data.loading}
                                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-all relative z-10"
                                >
                                    <RefreshCw size={14} className={data.loading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Category Selector - Refined */}
                            <div className="px-3 py-2 bg-white/40 border-b border-slate-100/50 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                                {platform.categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => loadPlatformTrends(platform.id, cat.id)}
                                        className={`whitespace-nowrap px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${data.activeCategory === cat.id
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'bg-white/60 text-slate-500 hover:text-slate-800 hover:bg-white border border-white/60'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Content List - Enhanced */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-white/20">
                                {data.loading ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-3">
                                        <div className="relative">
                                            <Loader2 className="animate-spin text-slate-400" size={24} />
                                            <div className={`absolute inset-0 bg-gradient-to-br ${getPlatformColor(platform.id)} blur-lg opacity-20`}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing</span>
                                    </div>
                                ) : data.items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2 border border-slate-100">
                                            <Globe size={20} className="text-slate-200" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Data Available</p>
                                    </div>
                                ) : (
                                    data.items.map((item, idx) => (
                                        <a
                                            key={idx}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-2.5 rounded-md hover:bg-white/80 hover:shadow-sm transition-all group/item border border-transparent hover:border-white/60"
                                        >
                                            <div className="relative shrink-0">
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-black relative z-10 ${item.rank <= 3
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {item.rank}
                                                </span>
                                                {item.rank <= 3 && (
                                                    <div className="absolute -top-1 -right-1 z-20">
                                                        <Award size={10} className="text-amber-400 fill-amber-400" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <span className="block text-xs font-bold text-slate-700 group-hover/item:text-slate-900 transition-colors truncate">
                                                    {item.title}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex items-center gap-0.5 text-[9px] font-black text-orange-500 uppercase tracking-tighter">
                                                        <Flame size={8} className="fill-orange-500" />
                                                        {item.hotness}
                                                    </div>
                                                    {idx < 5 && (
                                                        <div className="flex items-center gap-0.5 text-[8px] font-black text-emerald-500 uppercase tracking-tighter">
                                                            <TrendingUp size={8} />
                                                            Rising
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="opacity-0 group-hover/item:opacity-100 transition-all transform translate-x-1 group-hover/item:translate-x-0">
                                                <ExternalLink size={12} className="text-slate-400" />
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>

                            {/* Card Footer - Refined */}
                            <div className="p-3 bg-white/40 border-t border-slate-100/50 shrink-0">
                                <a
                                    href="#"
                                    className="w-full py-1.5 bg-white/60 hover:bg-white rounded-md text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-white/60 shadow-sm"
                                >
                                    Explore Full List <ChevronRight size={12} />
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HotTrendsView;
