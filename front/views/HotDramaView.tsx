
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Download, Star, Calendar, Film, Tv, Menu, Loader2, Cloud } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { hotDramaApi } from '../api/api';
import BoxOfficePanel from '../components/BoxOfficePanel';

interface HotDrama {
  id: number;
  title: string;
  original_title: string | null;
  download_link: string;
  baidu_url: string | null;
  quark_url: string | null;
  tmdb_id: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  vote_average: number | null;
  media_type: 'movie' | 'tv' | null;
  fetched_at: string;
  current_episode?: number; // 当前更新到第几集（仅电视剧）
}



// 格式化日期函数
const formatDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // 格式化为中文日期：YYYY年M月D日
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}年${month}月${day}日`;
  } catch (e) {
    return null;
  }
};

const HotDramaView: React.FC = () => {
  const [dramas, setDramas] = useState<HotDrama[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('tv'); // 默认显示电视剧
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(30);
  const [isAppending, setIsAppending] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  
  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load items from API with pagination
  const loadItems = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setShowLoadingIndicator(true);
      setIsAppending(true);
    }

    setLoading(true);
    const loadStartTime = Date.now();

    try {
      const data = await hotDramaApi.getAll(page, itemsPerPage, activeTab);
      
      if (data.items && data.items.length > 0) {
        // Data is already filtered by media_type and sorted by release_date DESC on the server
        // No need to sort again on the client side
        const sortedData = data.items;

        if (append) {
          const elapsed = Date.now() - loadStartTime;
          const remainingDelay = Math.max(0, 1000 - elapsed);

          setTimeout(() => {
            setDramas(prev => {
              const existingIds = new Set(prev.map(drama => drama.id));
              const newDramas = sortedData.filter(drama => !existingIds.has(drama.id));
              return [...prev, ...newDramas];
            });
            setShowLoadingIndicator(false);
            setIsAppending(false);
            setLoading(false);
          }, remainingDelay);
        } else {
          setDramas(sortedData);
          setShowLoadingIndicator(false);
          setIsAppending(false);
        }

        if (data.pagination) {
          setTotalItems(data.pagination.total);
          setHasMore(page < data.pagination.pages);
        } else {
          setHasMore(data.items.length === itemsPerPage);
        }
      } else {
        if (!append) setDramas([]);
        setHasMore(false);
        setShowLoadingIndicator(false);
        setIsAppending(false);
      }
    } catch (error) {
      console.error('Failed to fetch dramas:', error);
      setShowLoadingIndicator(false);
      setIsAppending(false);
      if (!append) setDramas([]);
    } finally {
      if (!append) setLoading(false);
    }
  }, [itemsPerPage, activeTab]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || isAppending) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadItems(nextPage, true);
  }, [hasMore, loading, isAppending, currentPage, loadItems]);

  // Handle scroll to load more
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loading && !isAppending) {
            loadMore();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, isAppending, loadMore]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setDramas([]);
    loadItems(1, false);
  }, [activeTab, loadItems]);

  const getPosterUrl = (path: string | null) => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 pb-4">
      <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60 glass-shimmer hidden lg:flex">
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
              <div className="w-8 h-8 bg-rose-600 rounded-md flex items-center justify-center text-white shadow-md shadow-rose-200/50">
                <Film size={16} strokeWidth={2.5} />
              </div>
              <div className="flex-shrink-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                  热门影视
                </h2>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                  Hot Dramas & Movies
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Left */}
        <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-rose-600 rounded-md flex items-center justify-center text-white shadow-md shadow-rose-200/50">
              <Film size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-shrink-0">
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                热门影视
              </h2>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                Curated High-Quality Content
              </p>
            </div>
          </div>
        </div>

      </header>

      {/* 移动端顶部标题 */}
      <div className="lg:hidden flex items-center gap-2 px-3 py-3 border-b border-white/40 bg-white/30 backdrop-blur-md shrink-0">
        <button
          onClick={() => (window as any).toggleSidebar?.()}
          className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-600 rounded-md flex items-center justify-center text-white shadow-md shadow-rose-200/50">
            <Film size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
              热门影视
            </h2>
            <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">
              Hot Dramas & Movies
            </p>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 左右布局 */}
      <div className="flex-1 flex gap-4 overflow-hidden px-3 lg:px-0 pt-3 lg:pt-0">
        {/* 左侧排名面板 - 桌面端占据四分之一 */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/4 shrink-0 h-full">
          <BoxOfficePanel />
        </div>

        {/* 右侧热剧内容 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* 内容卡片 */}
          <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden">
            {/* 头部标题 - 简洁风格 */}
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-white/60 bg-gradient-to-r from-rose-50/80 to-pink-50/80">
              <div className="flex items-center gap-2">
                <Film size={18} className="text-rose-500" />
                <h2 className="text-sm font-black text-slate-800">热门资源</h2>
              </div>
            </div>

            {/* Tabs - 与左侧样式一致 */}
            <div className="flex flex-col border-b border-white/60 bg-white/30 shrink-0">
              <div className="flex overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => {
                    setActiveTab('tv');
                    setCurrentPage(1);
                    setHasMore(true);
                    setDramas([]);
                  }}
                  className={`flex-1 min-w-[80px] px-3 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'tv'
                      ? 'text-rose-600 bg-white/60 border-b-2 border-rose-600'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Tv size={14} />
                    <span>电视剧</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('movie');
                    setCurrentPage(1);
                    setHasMore(true);
                    setDramas([]);
                  }}
                  className={`flex-1 min-w-[80px] px-3 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'movie'
                      ? 'text-rose-600 bg-white/60 border-b-2 border-rose-600'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Film size={14} />
                    <span>电影</span>
                  </div>
                </button>
              </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-3">

          {loading && dramas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 ipad-glass rounded-md border border-white/60">
              <Loader2 className="animate-spin text-rose-600" size={24} />
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">加载中...</p>
            </div>
          ) : (
            <>
              <div className="pb-10">
                <Masonry
                  breakpointCols={{ default: 6, 2560: 6, 1536: 5, 1280: 4, 1024: 3, 640: 2 }}
                  className="masonry-grid"
                  columnClassName="masonry-grid_column"
                >
                  {dramas.map((drama) => (
                    <div key={drama.id} className="group relative bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                      {/* Poster Image */}
                      <div className="aspect-[2/3] relative overflow-hidden bg-slate-200">
                        {drama.poster_path ? (
                          <img
                            src={getPosterUrl(drama.poster_path)!}
                            alt={drama.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Film size={32} />
                          </div>
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />

                        {/* Rating Badge */}
                        {drama.vote_average != null && typeof drama.vote_average === 'number' && (
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded shadow-lg">
                            <Star size={10} fill="currentColor" />
                            {Number(drama.vote_average).toFixed(1)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-2.5 flex flex-col flex-1">
                        <h3 className="text-sm font-black text-slate-800 leading-tight mb-0.5 line-clamp-1" title={drama.title || ''}>
                          {drama.title || '未知标题'}
                        </h3>
                        {drama.original_title && drama.original_title !== drama.title && (
                          <p className="text-[10px] text-slate-500 font-medium mb-1.5 line-clamp-1">
                            {drama.original_title}
                          </p>
                        )}

                        {/* Overview/Description */}
                        {drama.overview && (
                          <p className="text-[10px] text-slate-600 font-normal mb-2 line-clamp-2 leading-relaxed">
                            {drama.overview}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mb-2">
                          {formatDate(drama.release_date) && (
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(drama.release_date)}
                            </div>
                          )}
                          {drama.media_type === 'tv' && drama.current_episode && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                              更新至第{drama.current_episode}集
                            </div>
                          )}
                        </div>

                        {/* Download Buttons */}
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {drama.baidu_url && (
                            <a
                              href={drama.baidu_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-900/20"
                            >
                              <Cloud size={10} />
                              百度
                            </a>
                          )}
                          {drama.quark_url && (
                            <a
                              href={drama.quark_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1 shadow-md shadow-purple-900/20"
                            >
                              <Cloud size={10} />
                              夸克
                            </a>
                          )}
                          {!drama.baidu_url && !drama.quark_url && drama.download_link && (
                            <a
                              href={drama.download_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 bg-slate-900 hover:bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1 shadow-md shadow-slate-900/20"
                            >
                              <Download size={10} />
                              下载
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Masonry>
              </div>

              {dramas.length === 0 && !loading && (
                <div className="py-24 text-center ipad-glass rounded-md border border-white/60 stagger-item">
                  <div className="w-12 h-12 bg-white/50 rounded-md flex items-center justify-center mx-auto mb-3 border border-white/50">
                    <Film size={20} className="text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">暂无内容</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    No {activeTab === 'movie' ? 'movies' : 'TV series'} found. Click refresh to fetch data.
                  </p>
                </div>
              )}

              {hasMore && (isAppending || showLoadingIndicator) && (
                <div className="flex justify-center py-6 animate-in fade-in duration-300">
                  <Loader2 className="animate-spin text-rose-500" size={24} strokeWidth={2.5} />
                </div>
              )}
              {!hasMore && dramas.length > 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium stagger-item">
                  已加载全部 {totalItems || dramas.length} 条内容
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotDramaView;