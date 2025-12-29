import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Film, Loader2, Star, TrendingUp, MessageSquare, Heart, Share2, Award, Zap, Menu, Trophy, Sparkles, Calendar, Ticket, PieChart, Monitor, Users, Play } from 'lucide-react';
import { maoyanApi } from '../api/api';

// 电影列表项接口
interface MaoyanMovieItem {
  movieId: string;
  title: string;
  releaseInfo?: string;
  boxOffice?: number;
  boxOfficeUnit?: string;
  sumBoxDesc?: string;
  boxRate?: string;
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
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab, setMainTab] = useState<'ranking' | 'resources'>('ranking'); // 主tab：影视排行榜/热门资源
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const movieItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 加载电影列表
  const loadMovieList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await maoyanApi.getMovieList();
      if (response.success && response.data && response.data.items) {
        const movieList = response.data.items;
        console.log('[HotDramaView] 电影列表数据:', movieList.slice(0, 2)); // 只打印前2条
        setMovies(movieList);
        // 默认选中第一部电影
        if (movieList.length > 0 && !selectedMovie) {
          setSelectedMovie(movieList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch movie list:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMovie]);

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

  // 初始加载
  useEffect(() => {
    loadMovieList();
  }, [loadMovieList]);

  // 当选中电影改变时，加载详情
  useEffect(() => {
    if (selectedMovie) {
      loadMovieDetail(selectedMovie.movieId);
    }
  }, [selectedMovie, loadMovieDetail]);

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
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 pb-4">
      <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60 glass-shimmer hidden lg:flex">
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
      <div className="px-3 lg:px-0 py-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setMainTab('ranking')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all whitespace-nowrap shrink-0 ${mainTab === 'ranking'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
          >
            <Trophy size={14} />
            <span>影视排行榜</span>
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
      <div className="flex-1 flex gap-4 overflow-hidden px-3 lg:px-0 pt-3 lg:pt-0">
        {/* 影视排行榜 Tab */}
        {mainTab === 'ranking' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* 左侧：电影排行列表 (1/3) */}
            <div className="w-1/3 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden">
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

                        {/* 第二行：上映信息 + 今日综合票房 + 总票房 */}
                        <div className="flex items-center gap-2 mb-1">
                          {movie.releaseInfo && (
                            <div className="flex items-center gap-1 overflow-hidden">
                              <Calendar size={10} className="text-blue-500 flex-shrink-0" />
                              <span className="text-[10px] text-slate-500 truncate">{movie.releaseInfo}</span>
                            </div>
                          )}
                          {movie.boxOffice && (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <Ticket size={10} className="text-rose-500 flex-shrink-0" />
                              <span className="text-[10px] text-slate-400 font-normal">综合</span>
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

                        {/* 第三行：数据指标 */}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
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
                            <div className="flex items-center gap-1">
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

            {/* 右侧：电影详情 (2/3) */}

            <div className="w-2/3 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden relative">
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

                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                <div className="w-full h-32 bg-slate-200 rounded relative overflow-hidden mb-2">
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100">
                                      <Play size={12} className="text-[#00AEEC] ml-0.5" fill="#00AEEC" />
                                    </div>
                                  </div>
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-medium">
                                    {i === 1 ? '15:24' : i === 2 ? '08:45' : '21:30'}
                                  </div>
                                </div>
                                <div>
                                  <h5 className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight mb-1 group-hover:text-[#00AEEC] transition-colors">
                                    {i === 1 ? '【深度解析】这才是真正的国产神作！细节全解析' : i === 2 ? '导演到底想表达什么？三刷才看懂的隐喻' : '从镜头语言看人物心理，教科书级别的表演'}
                                  </h5>
                                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                                    <span className="truncate max-w-[60px]">UP: 影视飓风_{i}</span>
                                    <span className="font-bold">{i === 1 ? '85w' : i === 2 ? '42w' : '23w'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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

                        {[1, 2].map(i => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-pink-100 rounded-full border border-pink-200"></div>
                              <span className="text-[10px] font-black text-slate-700">电影种草_{i}</span>
                              <span className="ml-auto text-[9px] text-rose-400 font-black">#推荐</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed mb-2 line-clamp-3 font-medium">
                              {i === 1 ? '🎬 救命！这个电影真的太好哭了，一定要带够纸巾！最后反转太精彩了... 😭✨' : '周末和闺蜜去看了首映，氛围感直接拉满！里面的配色和穿搭也很有审美。💅🍿'}
                            </p>
                            <div className="flex items-center gap-3 text-slate-400">
                              <div className="flex items-center gap-1 text-rose-500">
                                <Star size={10} fill="currentColor" />
                                <span className="text-[9px] font-bold">3.5k</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Share2 size={10} />
                                <span className="text-[9px] font-bold">892</span>
                              </div>
                            </div>
                          </div>
                        ))}
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
