import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Film, Loader2, Star, TrendingUp, MessageSquare, Heart, Share2, Award, Zap, Menu, Trophy, Sparkles, Calendar, Ticket, PieChart, Monitor, Users, Play, ChevronRight, ChevronLeft, X, ExternalLink } from 'lucide-react';
import { maoyanApi, getApiBase } from '../api/api';
import Masonry from 'react-masonry-css';

// 电影列表项接口
interface MaoyanMovieItem {
  movieId: string;
  title: string;
  releaseInfo?: string;
  boxOffice?: number;
  boxOfficeUnit?: string;
  sumBoxDesc?: string;
  sumSplitBoxDesc?: string;
  boxRate?: string;
  boxSplitRate?: string;
  showCount?: number;
  showCountRate?: string;
  avgSeatView?: string;
  avgShowView?: string;
  fetchedAt: string;
}

// 电影详情接口
interface MaoyanMovieDetail {
  movieId: string;
  name: string;
  category?: string;
  imgUrl?: string;
  releaseInfo?: string;
  boxTrends: Array<{
    box: number;
    boxDesc: string;
    date: number;
    releaseDay: boolean;
  }>;
  fetchedAt: string;
}

const HotDramaView: React.FC = () => {
  const [movies, setMovies] = useState<MaoyanMovieItem[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MaoyanMovieItem | null>(null);
  const [movieDetail, setMovieDetail] = useState<MaoyanMovieDetail | null>(null);
  const [bilibiliComments, setBilibiliComments] = useState<any[]>([]);
  const [bilibiliLoading, setBilibiliLoading] = useState(false);
  const [bilibiliScrollIndex, setBilibiliScrollIndex] = useState(0);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [xiaohongshuComments, setXiaohongshuComments] = useState<any[]>([]);
  const [xiaohongshuLoading, setXiaohongshuLoading] = useState(false);
  const [selectedXiaohongshuItem, setSelectedXiaohongshuItem] = useState<any | null>(null);
  const [showXiaohongshuModal, setShowXiaohongshuModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab, setMainTab] = useState<'ranking' | 'resources'>('ranking'); // 主tab：影视排行榜/热门资源
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const movieItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const bilibiliScrollRef = useRef<HTMLDivElement>(null);

  // 加载电影列表
  const loadMovieList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await maoyanApi.getMovieList();
      console.log('[HotDramaView] API Response:', response);
      if (response.success && response.data && response.data.items) {
        const movieList = response.data.items;
        console.log('[HotDramaView] Movie List:', movieList);
        console.log('[HotDramaView] First Movie Data:', movieList[0]);
        setMovies(movieList);
        // 默认选中第一部电影（仅在列表为空时）
        if (movieList.length > 0) {
          setSelectedMovie(prev => prev || movieList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch movie list:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载电影详情
  const loadMovieDetail = useCallback(async (movieId: string) => {
    try {
      setDetailLoading(true);
      const response = await maoyanApi.getMovieDetail(movieId);
      if (response.success && response.data) {
        setMovieDetail(response.data);
        } else {
        setMovieDetail(null);
      }
    } catch (error) {
      console.error('Failed to fetch movie detail:', error);
      setMovieDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 加载B站解说
  const loadBilibiliComments = useCallback(async (movieId: string) => {
    try {
      setBilibiliLoading(true);
      setBilibiliComments([]); // 清空旧数据
      setCanScrollRight(false); // 重置滚动状态
      const response = await maoyanApi.getBilibiliComments(movieId, 20);
      if (response.success && response.data) {
        setBilibiliComments(response.data.items || []);
        // 延迟检查滚动状态，确保DOM已更新
        setTimeout(() => {
          if (bilibiliScrollRef.current) {
            const container = bilibiliScrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            setCanScrollRight(maxScroll > 10);
          }
        }, 100);
      } else {
        setBilibiliComments([]);
        setCanScrollRight(false);
      }
    } catch (error) {
      console.error('Failed to fetch Bilibili comments:', error);
      setBilibiliComments([]);
      setCanScrollRight(false);
    } finally {
      setBilibiliLoading(false);
    }
  }, []);

  // 加载小红书讨论
  const loadXiaohongshuComments = useCallback(async (movieId: string) => {
    try {
      setXiaohongshuLoading(true);
      setXiaohongshuComments([]);
      const response = await maoyanApi.getXiaohongshuComments(movieId, 100); // 加载更多数据用于瀑布流展示
      if (response.success && response.data) {
        setXiaohongshuComments(response.data.items || []);
      } else {
        setXiaohongshuComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch Xiaohongshu comments:', error);
      setXiaohongshuComments([]);
    } finally {
      setXiaohongshuLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadMovieList();
  }, [loadMovieList]);

  // 当选中电影改变时，加载详情和B站解说、小红书讨论
  useEffect(() => {
    if (selectedMovie) {
      loadMovieDetail(selectedMovie.movieId);
      loadBilibiliComments(selectedMovie.movieId);
      loadXiaohongshuComments(selectedMovie.movieId);
      setBilibiliScrollIndex(0); // 重置滚动位置
      setCanScrollRight(false); // 初始化时不显示右箭头
    } else {
      setBilibiliComments([]);
      setXiaohongshuComments([]);
      setBilibiliScrollIndex(0);
      setCanScrollRight(false);
    }
  }, [selectedMovie, loadMovieDetail, loadBilibiliComments, loadXiaohongshuComments]);

  // 检查是否可以向右滚动
  useEffect(() => {
    const checkScrollability = () => {
      if (bilibiliScrollRef.current) {
        const container = bilibiliScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        setCanScrollRight(currentScroll < maxScroll - 10); // 10px容差
      } else {
        setCanScrollRight(false);
      }
    };

    // 初始检查
    checkScrollability();

    // 监听滚动事件
    const container = bilibiliScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      // 监听窗口大小变化
      window.addEventListener('resize', checkScrollability);
      
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [bilibiliComments]);

  // 格式化日期
  const formatDate = (dateNum: number): string => {
    const date = new Date(dateNum);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  // 处理电影选择
  const handleMovieSelect = (movie: MaoyanMovieItem) => {
    setSelectedMovie(movie);
    // 不再自动滚动到顶部，保持当前滚动位置或仅在必要时滚动
  };

  // 图片代理URL处理函数
  const getImageProxyUrl = useCallback((url: string) => {
    if (!url) return '';
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    if (fullUrl.includes('xhscdn.com') || fullUrl.includes('xhslink.com') || fullUrl.includes('sns-webpic-qc.xhscdn.com')) {
      return `${getApiBase()}/image/proxy?url=${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  }, []);

  // 获取今日票房（从详情数据的最后一项）
  const getTodayBoxOffice = (): number | null => {
    if (movieDetail && movieDetail.boxTrends && movieDetail.boxTrends.length > 0) {
      const todayTrend = movieDetail.boxTrends[movieDetail.boxTrends.length - 1];
      // box 是元，转换为万元
      return todayTrend.box / 10000;
    }
    // 如果没有详情数据，使用列表数据
    return selectedMovie?.boxOffice || null;
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
      <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-2 px-3 lg:px-4 py-1.5 lg:py-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 lg:gap-3 shrink-0 z-40 border-b lg:border border-white/60 glass-shimmer hidden lg:flex">
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

      {/* Tab切换 - 与全网聚焦样式一致 */}
      <div className="px-3 lg:px-0 py-1 shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
            onClick={() => setMainTab('ranking')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all whitespace-nowrap shrink-0 ${mainTab === 'ranking'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
          >
            <Trophy size={14} />
            <span>电影排行榜</span>
                </button>
                <button
            onClick={() => setMainTab('resources')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all whitespace-nowrap shrink-0 ${mainTab === 'resources'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
          >
            <Sparkles size={14} />
            <span>热门资源</span>
                </button>
              </div>
            </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex gap-4 overflow-hidden px-3 lg:px-0 pt-2 lg:pt-1 min-h-0">
        {/* 影视排行榜 Tab */}
        {mainTab === 'ranking' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* 左侧：电影排行列表 (1/4) */}
            <div className="w-1/4 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/60 bg-gradient-to-r from-rose-50/80 to-pink-50/80">
                <h3 className="text-xs font-black text-slate-800">电影排行</h3>
              </div>

              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="animate-spin text-rose-600" size={24} />
                    <p className="text-slate-400 font-bold text-xs mt-3">加载中...</p>
                  </div>
                ) : movies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Film size={32} className="text-slate-400" />
                    <p className="text-slate-500 font-medium text-sm mt-3">暂无数据</p>
            </div>
          ) : (
                  <div className="divide-y divide-white/40">
                    {movies.map((movie, index) => (
                      <div
                        key={movie.movieId}
                        ref={(el) => {
                          movieItemRefs.current[movie.movieId] = el;
                        }}
                        onClick={() => handleMovieSelect(movie)}
                        className={`px-3 py-2 cursor-pointer transition-all hover:bg-white/60 ${selectedMovie?.movieId === movie.movieId
                          ? 'bg-rose-50/80 border-l-4 border-rose-600'
                          : ''
                          }`}
                      >
                        {/* 第一行：排名 + 标题 */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className={`text-[10px] font-black flex-shrink-0 w-5 ${index === 0 ? 'text-red-500' :
                              index === 1 ? 'text-orange-500' :
                                index === 2 ? 'text-amber-500' :
                                  'text-slate-400'
                              }`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 truncate flex-1">
                              {movie.title}
                            </h4>
                            {selectedMovie?.movieId === movie.movieId && (
                              <Star size={12} className="text-rose-600 fill-rose-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* 第二行：上映信息 + 今日票房 + 总票房 */}
                        <div className="flex items-center gap-2 mb-1">
                          {movie.releaseInfo && (
                            <div className="flex items-center gap-1 overflow-hidden">
                              <Calendar size={10} className="text-blue-500 flex-shrink-0" />
                              <span className="text-[10px] text-slate-500 truncate">{movie.releaseInfo}</span>
                            </div>
                          )}
                          {movie.boxOffice !== null && movie.boxOffice !== undefined && (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <Ticket size={10} className="text-rose-500 flex-shrink-0" />
                              <span className="text-[10px] text-slate-400 font-normal">今日</span>
                              <span className="text-[10px] text-rose-600 font-black">{movie.boxOffice.toFixed(1)}万</span>
                          </div>
                        )}
                          {movie.sumBoxDesc && (
                            <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
                              <TrendingUp size={10} className="text-emerald-500 flex-shrink-0" />
                              <span className="text-[10px] text-slate-600 font-medium">{movie.sumBoxDesc}</span>
                          </div>
                        )}
                      </div>

                        {/* 第三行：分账票房 + 数据指标 */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {movie.sumSplitBoxDesc && (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <TrendingUp size={10} className="text-amber-500 flex-shrink-0" />
                              <span className="text-amber-600 font-medium">{movie.sumSplitBoxDesc}</span>
                            </div>
                          )}
                          {movie.boxRate && (
                            <div className="flex items-center gap-1">
                              <PieChart size={10} className="text-violet-500" />
                              <span className="font-medium">占比 {movie.boxRate}</span>
                            </div>
                          )}
                          {movie.showCountRate && (
                            <div className="flex items-center gap-1">
                              <Monitor size={10} className="text-sky-500" />
                              <span>排片 {movie.showCountRate}</span>
                            </div>
                          )}
                          {movie.avgSeatView && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Users size={10} className="text-amber-500" />
                              <span>上座 {movie.avgSeatView}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                            </div>
                          )}
                        </div>
            </div>

            {/* 右侧：电影详情 (3/4) */}

            <div className="w-3/4 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden relative">
              {/* 背景装饰元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

              {detailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Loader2 className="animate-spin text-rose-600" size={32} />
                  <p className="text-slate-400 font-bold text-sm mt-4 uppercase tracking-widest">正在探索电影奥秘...</p>
                </div>
              ) : movieDetail ? (
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
                  {/* 电影头部信息 - 新布局 */}
                  <div className="px-4 py-3 border-b border-white/60 bg-gradient-to-br from-white/80 to-white/40">
                    <div className="flex items-stretch gap-4">
                      {/* 最左侧：影视海报 */}
                      <div className="relative group flex-shrink-0 flex flex-col">
                        {movieDetail.imgUrl ? (
                          <img
                            src={movieDetail.imgUrl}
                            alt={movieDetail.name}
                            className="w-64 h-auto object-contain rounded-lg shadow-xl transition-transform duration-500 group-hover:scale-[1.02] border-2 border-white"
                            style={{ maxHeight: '100%' }}
                          />
                        ) : (
                          <div className="w-64 h-full bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 border-2 border-white shadow-xl" style={{ aspectRatio: '2/3' }}>
                            <Film size={32} />
                          </div>
                        )}
                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white transform rotate-12 group-hover:rotate-0 transition-transform z-10">
                          <Award size={24} />
                        </div>
                      </div>

                      {/* 右侧：标题、指标和趋势 */}
                      <div className="flex-1 flex flex-col min-w-0 justify-between">
                        <div className="flex flex-col">
                          {/* 标题和基础信息 */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">{movieDetail.name}</h2>
                                <div className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded uppercase tracking-wider flex-shrink-0">Hot</div>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-white/50 px-1.5 py-0.5 rounded-md border border-white/60">
                                <Zap size={10} className="text-amber-500" />
                                <span>{movieDetail.releaseInfo}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {movieDetail.category?.split(',').map((cat, i) => (
                                <span key={i} className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${i % 3 === 0 ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  i % 3 === 1 ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  }`}>
                                  {cat.trim()}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 右侧上方：左右布局 - 指标和趋势 */}
                          <div className="flex gap-2 mb-1.5">
                          {/* 左边：4个指标 */}
                          <div className="flex-1 bg-white/50 rounded-lg p-2 border border-white/60 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <Ticket size={9} className="text-rose-500" />
                                  <div className="text-[8px] text-slate-400 font-bold uppercase">今日票房</div>
                                </div>
                                <div className="text-xs font-black text-rose-600">
                                  {getTodayBoxOffice()?.toFixed(1) || '0.0'}<span className="text-[9px] ml-0.5">万</span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <PieChart size={9} className="text-violet-500" />
                                  <div className="text-[8px] text-slate-400 font-bold uppercase">票房占比</div>
                                </div>
                                <div className="text-xs font-black text-slate-700">
                                  {selectedMovie?.boxRate || '0%'}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <Monitor size={9} className="text-sky-500" />
                                  <div className="text-[8px] text-slate-400 font-bold uppercase">排片占比</div>
                                </div>
                                <div className="text-xs font-black text-slate-700">
                                  {selectedMovie?.showCountRate || '0%'}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <Users size={9} className="text-amber-500" />
                                  <div className="text-[8px] text-slate-400 font-bold uppercase">上座率</div>
                                </div>
                                <div className="text-xs font-black text-slate-700">
                                  {selectedMovie?.avgSeatView || '0%'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 右边：趋势图 */}
                          {movieDetail.boxTrends && movieDetail.boxTrends.length > 1 && (
                            <div className="flex-1 h-24 bg-white/40 rounded-lg border border-white/60 px-2 py-1.5 flex flex-col relative overflow-hidden">
                              <div className="flex items-center justify-between mb-1 relative z-10">
                                <h3 className="text-[9px] font-black text-slate-700 flex items-center gap-1">
                                  <TrendingUp size={10} className="text-rose-600" />
                                  <span>近日趋势</span>
                                </h3>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">7 Days</span>
                              </div>

                              <div className="flex-1 w-full min-h-0 relative">
                                {(() => {
                                  const trends = movieDetail.boxTrends.slice(-7);
                                  const maxBox = Math.max(...trends.map(t => t.box)) || 100;
                                  const minBox = Math.min(...trends.map(t => t.box)) || 0;
                                  // Normalize to 0-100 range
                                  const getX = (i: number) => (i / (trends.length - 1)) * 100;
                                  const getY = (val: number) => 100 - ((val / maxBox) * 70 + 15); // Keep within 15-85% vertical space

                                  const points = trends.map((t, i) => `${getX(i)},${getY(t.box)}`);
                                  const areaPath = `M${points[0]} L${points.join(' L')} L100,120 L0,120 Z`;
                                  const linePath = `M${points[0]} L${points.join(' L')}`;

                                  return (
                                    <div className="w-full h-full relative">
                                      {/* SVG Chart */}
                                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <defs>
                                          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
                                          </linearGradient>
                                        </defs>
                                        <path d={areaPath} fill="url(#trendGradient)" />
                                        <path d={linePath} fill="none" stroke="#e11d48" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>

                                      {/* HTML Points & Tooltips */}
                                      {trends.map((t, i) => (
                                        <div
                                          key={i}
                                          className="absolute group/point flex items-center justify-center w-4 h-4 -ml-2 -mt-2 cursor-pointer z-10"
                                          style={{
                                            left: `${getX(i)}%`,
                                            top: `${getY(t.box)}%`,
                                          }}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full border-[1.5px] transition-all duration-300 group-hover/point:scale-150 group-hover/point:bg-rose-600 group-hover/point:border-white ${i === trends.length - 1 ? 'bg-rose-600 border-white shadow-sm scale-125' : 'bg-white border-rose-600'
                                            }`} />

                                          {/* Tooltip */}
                                          <div className="absolute bottom-full mb-2 opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                            <div className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-lg font-bold flex flex-col items-center">
                                              <span>{t.boxDesc}</span>
                                              <span className="text-[8px] text-slate-400 font-normal">{i === trends.length - 1 ? 'Today' : t.date}</span>
                                            </div>
                                            <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1"></div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>

                        {/* 右侧下方：影视解说 */}
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#00AEEC] rounded flex items-center justify-center text-white shadow-sm">
                              <Play size={12} fill="currentColor" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800">B站影视解说</h4>
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest ml-auto">Deep Analysis</span>
                          </div>

                          {bilibiliLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="animate-spin text-[#00AEEC]" size={20} />
                            </div>
                          ) : bilibiliComments.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                              暂无B站解说数据
                            </div>
                          ) : (
                            <div className="relative">
                              {/* 左箭头 */}
                              {bilibiliScrollIndex > 0 && (
                                <button
                                  onClick={() => {
                                    const newIndex = Math.max(0, bilibiliScrollIndex - 1);
                                    setBilibiliScrollIndex(newIndex);
                                    if (bilibiliScrollRef.current) {
                                      const container = bilibiliScrollRef.current;
                                      const scrollAmount = container.clientWidth;
                                      container.scrollTo({
                                        left: container.scrollLeft - scrollAmount,
                                        behavior: 'smooth'
                                      });
                                    }
                                  }}
                                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-slate-200"
                                >
                                  <ChevronLeft size={16} className="text-slate-700" />
                                </button>
                              )}
                              
                              {/* 滚动容器 */}
                              <div
                                ref={bilibiliScrollRef}
                                className="flex gap-2 overflow-x-auto scrollbar-hide"
                                style={{ 
                                  scrollBehavior: 'smooth'
                                }}
                                onScroll={(e) => {
                                  const container = e.currentTarget;
                                  const scrollLeft = container.scrollLeft;
                                  const containerWidth = container.clientWidth;
                                  const cardWidth = container.children[0]?.clientWidth || 0;
                                  const gap = 8;
                                  const cardsPerPage = 4;
                                  const newIndex = Math.round(scrollLeft / (cardWidth + gap));
                                  if (newIndex !== bilibiliScrollIndex) {
                                    setBilibiliScrollIndex(newIndex);
                                  }
                                  // 更新右箭头显示状态
                                  const maxScroll = container.scrollWidth - container.clientWidth;
                                  setCanScrollRight(scrollLeft < maxScroll - 10);
                                }}
                              >
                                {bilibiliComments.map((item, i) => {
                                  const videoUrl = item.url || (item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : '#');
                                  const coverUrl = item.cover || '';
                                  const title = item.title || '无标题';
                                  const authorName = item.author?.name || 'UP主';
                                  const views = item.stats?.views || 0;
                                  // 格式化时长显示
                                  const formatDurationDisplay = (duration: string | undefined): string => {
                                    if (!duration) return '';
                                    // 如果已经是 mm:ss 格式，直接返回
                                    if (typeof duration === 'string' && /^\d+:\d+$/.test(duration)) {
                                      return duration;
                                    }
                                    // 如果是秒数（数字或数字字符串），转换为 mm:ss
                                    const seconds = typeof duration === 'number' ? duration : parseInt(duration);
                                    if (!isNaN(seconds) && seconds > 0) {
                                      const mins = Math.floor(seconds / 60);
                                      const secs = seconds % 60;
                                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                                    }
                                    return '';
                                  };
                                  
                                  const duration = formatDurationDisplay(item.duration);
                                  
                                  // 使用图片代理接口
                                  const getImageProxyUrl = (url: string) => {
                                    if (!url) return '';
                                    
                                    // 确保URL包含协议
                                    let fullUrl = url;
                                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                      fullUrl = 'https://' + url;
                                    }
                                    
                                    // 如果是B站图片，使用代理
                                    if (fullUrl.includes('hdslb.com') || fullUrl.includes('biliimg.com') || fullUrl.includes('bilicdn.com') || fullUrl.includes('b23.tv')) {
                                      return `${getApiBase()}/image/proxy?url=${encodeURIComponent(fullUrl)}`;
                                    }
                                    return fullUrl;
                                  };
                                  
                                  const imageUrl = getImageProxyUrl(coverUrl);
                                  
                                  return (
                                    <a
                                      key={item.id || `bili-${i}`}
                                      href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                                      className="flex-shrink-0 w-[calc(25%-0.375rem)] bg-white p-2 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                    >
                                      <div className="w-full h-32 bg-slate-200 rounded relative overflow-hidden mb-2">
                                        {imageUrl ? (
                                          <>
                                            <img
                                              src={imageUrl}
                                              alt={title}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                // 图片加载失败时显示占位符
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const placeholder = target.parentElement?.querySelector('.img-placeholder') as HTMLElement;
                                                if (placeholder) placeholder.style.display = 'flex';
                                              }}
                                            />
                                            <div 
                                              className="img-placeholder hidden w-full h-full bg-gradient-to-br from-[#00AEEC]/20 to-[#00AEEC]/5 items-center justify-center absolute inset-0"
                                            >
                                              <Play size={24} className="text-[#00AEEC]" />
                                            </div>
                                          </>
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-[#00AEEC]/20 to-[#00AEEC]/5 flex items-center justify-center">
                                            <Play size={24} className="text-[#00AEEC]" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                          <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100">
                                            <Play size={12} className="text-[#00AEEC] ml-0.5" fill="#00AEEC" />
                                          </div>
                                        </div>
                                        {duration && (
                                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-medium">
                                            {duration}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight mb-1 group-hover:text-[#00AEEC] transition-colors">
                                          {title}
                                        </h5>
                                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                                          <span className="truncate max-w-[60px]">
                                            {authorName}
                                          </span>
                                          <span className="font-bold">
                                            {views >= 10000 
                                              ? `${(views / 10000).toFixed(1)}w` 
                                              : views >= 1000
                                              ? `${(views / 1000).toFixed(1)}k`
                                              : views || '0'}
                                          </span>
                                        </div>
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                              
                              {/* 右箭头 */}
                              {canScrollRight && bilibiliComments.length > 4 && (
                                <button
                                  onClick={() => {
                                    if (bilibiliScrollRef.current) {
                                      const container = bilibiliScrollRef.current;
                                      const scrollAmount = container.clientWidth;
                                      container.scrollTo({
                                        left: container.scrollLeft + scrollAmount,
                                        behavior: 'smooth'
                                      });
                                    }
                                  }}
                                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-slate-200"
                                >
                                  <ChevronRight size={16} className="text-slate-700" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 社交热评 */}
                  <div className="px-4 py-3 flex flex-col gap-3 bg-slate-50/50">

                    {/* 微博 & 小红书 (并排) */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* 微博热评 */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 bg-[#E6162D] rounded-lg flex items-center justify-center text-white shadow-md">
                            <Share2 size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800">微博热评</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Real-time</p>
                          </div>
                        </div>

                        {[1, 2].map(i => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                              <span className="text-[10px] font-black text-slate-700">影评达人_{i}</span>
                              <span className="ml-auto text-[9px] text-slate-400">2h前</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed mb-2 line-clamp-3">
                              {i === 1 ? '这部片子的特效真的没话说，完全值回票价！剧情节奏也很紧凑，推荐大家去看。' : '主演的演技爆发，那个眼神直接把我整破防了，今年国产电影的黑马！'}
                            </p>
                            <div className="flex items-center gap-3 text-slate-400">
                              <div className="flex items-center gap-1">
                                <Heart size={10} />
                                <span className="text-[9px] font-bold">1.2k</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare size={10} />
                                <span className="text-[9px] font-bold">234</span>
                        </div>
                      </div>
                    </div>
                  ))}
                      </div>

                      {/* 小红书热评 */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 bg-[#FF2442] rounded-lg flex items-center justify-center text-white shadow-md">
                            <Zap size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800">小红书热评</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Visuals</p>
                          </div>
              </div>

                        {xiaohongshuLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-rose-600" size={20} />
                          </div>
                        ) : xiaohongshuComments.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            暂无小红书数据
                          </div>
                        ) : (
                          <div className="h-full">
                            <Masonry
                              breakpointCols={{
                                default: 3,
                                1200: 3,
                                992: 3,
                                768: 2,
                                576: 2
                              }}
                              className="masonry-grid"
                              columnClassName="masonry-grid_column"
                            >
                              {xiaohongshuComments
                                .filter(item => item.cover && item.cover.trim() !== '') // 过滤掉没有图片的项
                                .map((item, i) => {
                                const coverUrl = item.cover || '';
                                const imageUrl = getImageProxyUrl(coverUrl);
                                
                                return (
                                  <div
                                    key={item.id || `xhs-${i}`}
                                    onClick={() => {
                                      setSelectedXiaohongshuItem(item);
                                      setShowXiaohongshuModal(true);
                                    }}
                                    className="group flex flex-col rounded-lg overflow-hidden bg-slate-200 border border-slate-100 shadow-sm hover:shadow-md transition-all mb-2 cursor-pointer"
                                  >
                                    <div className="relative w-full">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={item.title}
                                          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center">
                                          <Zap size={16} className="text-rose-300" />
                                        </div>
                                      )}
                                      {/* 视频标识 */}
                                      {item.type === 'video' && (
                                        <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-black/60 rounded flex items-center justify-center">
                                          <Play size={8} className="text-white" fill="white" />
                                        </div>
                                      )}
                                    </div>
                                    {/* 标题和统计信息 - 一直显示 */}
                                    <div className="p-2 bg-white">
                                      <p className="text-[11px] text-slate-700 font-medium line-clamp-2 mb-1">
                                        {item.title}
                                      </p>
                                      <div className="flex items-center gap-2 text-[8px] text-slate-400">
                                        {item.stats?.likes > 0 && (
                                          <span>❤️ {item.stats.likes >= 1000 ? `${(item.stats.likes / 1000).toFixed(1)}k` : item.stats.likes}</span>
                                        )}
                                        {item.stats?.comments > 0 && (
                                          <span>💬 {item.stats.comments >= 1000 ? `${(item.stats.comments / 1000).toFixed(1)}k` : item.stats.comments}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </Masonry>
                          </div>
                        )}
                        
                        {/* 小红书弹窗 */}
                        {showXiaohongshuModal && selectedXiaohongshuItem && (
                          <div 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowXiaohongshuModal(false)}
                          >
                            <div 
                              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* 关闭按钮 */}
                              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800">小红书详情</h3>
                                <button
                                  onClick={() => setShowXiaohongshuModal(false)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <X size={20} className="text-slate-600" />
                                </button>
                              </div>
                              
                              {/* 内容区域 */}
                              <div className="flex-1 overflow-y-auto p-6">
                                {/* 图片 */}
                                {selectedXiaohongshuItem.cover && (
                                  <div className="mb-4 rounded-lg overflow-hidden">
                                    <img
                                      src={getImageProxyUrl(selectedXiaohongshuItem.cover)}
                                      alt={selectedXiaohongshuItem.title}
                                      className="w-full h-auto object-contain max-h-[400px] mx-auto"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* 标题 */}
                                {selectedXiaohongshuItem.title && (
                                  <h2 className="text-xl font-bold text-slate-800 mb-4">
                                    {selectedXiaohongshuItem.title}
                                  </h2>
                                )}
                                
                                {/* 描述 */}
                                {selectedXiaohongshuItem.desc && (
                                  <p className="text-slate-600 mb-4 whitespace-pre-wrap">
                                    {selectedXiaohongshuItem.desc}
                                  </p>
                                )}
                                
                                {/* 作者信息 */}
                                {selectedXiaohongshuItem.author && (
                                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-4">
                                    {selectedXiaohongshuItem.author.avatar && (
                                      <img
                                        src={getImageProxyUrl(selectedXiaohongshuItem.author.avatar)}
                                        alt={selectedXiaohongshuItem.author.name}
                                        className="w-12 h-12 rounded-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = '';
                                        }}
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-semibold text-slate-800">
                                        {selectedXiaohongshuItem.author.name || '未知用户'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* 统计数据 */}
                                {selectedXiaohongshuItem.stats && (
                                  <div className="flex items-center gap-4 text-slate-600 mb-4">
                                    {selectedXiaohongshuItem.stats.likes > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Heart size={16} className="text-red-500" fill="currentColor" />
                                        <span>{selectedXiaohongshuItem.stats.likes >= 1000 ? `${(selectedXiaohongshuItem.stats.likes / 1000).toFixed(1)}k` : selectedXiaohongshuItem.stats.likes}</span>
                                      </div>
                                    )}
                                    {selectedXiaohongshuItem.stats.comments > 0 && (
                                      <div className="flex items-center gap-1">
                                        <MessageSquare size={16} className="text-blue-500" />
                                        <span>{selectedXiaohongshuItem.stats.comments >= 1000 ? `${(selectedXiaohongshuItem.stats.comments / 1000).toFixed(1)}k` : selectedXiaohongshuItem.stats.comments}</span>
                                      </div>
                                    )}
                                    {selectedXiaohongshuItem.stats.collects > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                                        <span>{selectedXiaohongshuItem.stats.collects >= 1000 ? `${(selectedXiaohongshuItem.stats.collects / 1000).toFixed(1)}k` : selectedXiaohongshuItem.stats.collects}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* 底部按钮 */}
                              <div className="p-4 border-t border-slate-200 flex justify-end">
                                <a
                                  href={selectedXiaohongshuItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                                >
                                  <span>前往小红书</span>
                                  <ExternalLink size={16} />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
            </div>
          </div>
        </div>
                </div>
              ) : selectedMovie ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Film size={64} className="text-slate-200 mb-4 animate-pulse" />
                  <p className="text-slate-400 font-bold text-sm">正在加载电影档案...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Star size={40} className="text-rose-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">欢迎来到电影票房</h3>
                  <p className="text-slate-500 font-medium text-sm">请从左侧列表选择一部电影开始探索</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 热门资源 Tab */}
        {mainTab === 'resources' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Film size={64} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold text-sm">热门资源功能开发中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotDramaView;
