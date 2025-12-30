import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Film, Loader2, Star, TrendingUp, MessageSquare, Heart, Share2, Award, Zap, Menu, Trophy, Sparkles, Calendar, Ticket, PieChart, Monitor, Users, User, Play, ChevronRight, ChevronLeft, X, ExternalLink, Tv } from 'lucide-react';
import { maoyanApi, getApiBase } from '../api/api';
import Masonry from 'react-masonry-css';
import {
  RankingList,
  DetailHeader,
  BilibiliVideoList,
  SocialCommentsSection,
  MetricCard,
  TrendDataPoint,
  MaoyanMovieItem,
  MaoyanMovieDetail,
  MaoyanWebSeriesItem,
  MaoyanWebSeriesDetail,
  BaseRankingItem,
} from '../components/hotDrama';
import type { Metric } from '../components/hotDrama/MetricCard';
import { getImageProxyUrl } from '../components/utils/imageProxyUtils';

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
  const [weiboComments, setWeiboComments] = useState<any[]>([]);
  const [weiboLoading, setWeiboLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab, setMainTab] = useState<'ranking' | 'resources' | 'webSeries' | 'variety'>('ranking'); // 主tab：影视排行榜/热门资源/网播热剧/综艺节目
  
  // 网播热剧相关状态
  const [webSeriesList, setWebSeriesList] = useState<MaoyanWebSeriesItem[]>([]);
  const [selectedWebSeries, setSelectedWebSeries] = useState<MaoyanWebSeriesItem | null>(null);
  const [webSeriesDetail, setWebSeriesDetail] = useState<MaoyanWebSeriesDetail | null>(null);
  const [webSeriesBilibiliComments, setWebSeriesBilibiliComments] = useState<any[]>([]);
  const [webSeriesBilibiliLoading, setWebSeriesBilibiliLoading] = useState(false);
  const [webSeriesBilibiliScrollIndex, setWebSeriesBilibiliScrollIndex] = useState(0);
  const [webSeriesCanScrollRight, setWebSeriesCanScrollRight] = useState(false);
  const [webSeriesXiaohongshuComments, setWebSeriesXiaohongshuComments] = useState<any[]>([]);
  const [webSeriesXiaohongshuLoading, setWebSeriesXiaohongshuLoading] = useState(false);
  const [webSeriesWeiboComments, setWebSeriesWeiboComments] = useState<any[]>([]);
  const [webSeriesWeiboLoading, setWebSeriesWeiboLoading] = useState(false);
  const [webSeriesLoading, setWebSeriesLoading] = useState(true);
  const [webSeriesDetailLoading, setWebSeriesDetailLoading] = useState(false);
  
  // 综艺节目相关状态
  const [varietyList, setVarietyList] = useState<MaoyanWebSeriesItem[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<MaoyanWebSeriesItem | null>(null);
  const [varietyDetail, setVarietyDetail] = useState<MaoyanWebSeriesDetail | null>(null);
  const [varietyBilibiliComments, setVarietyBilibiliComments] = useState<any[]>([]);
  const [varietyBilibiliLoading, setVarietyBilibiliLoading] = useState(false);
  const [varietyBilibiliScrollIndex, setVarietyBilibiliScrollIndex] = useState(0);
  const [varietyCanScrollRight, setVarietyCanScrollRight] = useState(false);
  const [varietyXiaohongshuComments, setVarietyXiaohongshuComments] = useState<any[]>([]);
  const [varietyXiaohongshuLoading, setVarietyXiaohongshuLoading] = useState(false);
  const [varietyWeiboComments, setVarietyWeiboComments] = useState<any[]>([]);
  const [varietyWeiboLoading, setVarietyWeiboLoading] = useState(false);
  const [varietyLoading, setVarietyLoading] = useState(true);
  const [varietyDetailLoading, setVarietyDetailLoading] = useState(false);
  const varietyBilibiliScrollRef = useRef<HTMLDivElement>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const movieItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const bilibiliScrollRef = useRef<HTMLDivElement>(null);
  const webSeriesBilibiliScrollRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

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

  // 加载微博热评
  const loadWeiboComments = useCallback(async (movieId: string) => {
    try {
      setWeiboLoading(true);
      setWeiboComments([]);
      // 使用后台接口获取微博热评
      const response = await maoyanApi.getWeiboComments(movieId, 10);
      if (response.success && response.data && response.data.items) {
        setWeiboComments(response.data.items);
      } else {
        setWeiboComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch Weibo comments:', error);
      setWeiboComments([]);
    } finally {
      setWeiboLoading(false);
    }
  }, []);

  // 加载网播热剧列表
  const loadWebSeriesList = useCallback(async () => {
    try {
      setWebSeriesLoading(true);
      const response = await maoyanApi.getWebSeriesList();
      if (response.success && response.data && response.data.items) {
        const seriesList = response.data.items;
        setWebSeriesList(seriesList);
        if (seriesList.length > 0) {
          setSelectedWebSeries(prev => prev || seriesList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch web series list:', error);
      setWebSeriesList([]);
    } finally {
      setWebSeriesLoading(false);
    }
  }, []);

  // 加载网播热剧详情
  const loadWebSeriesDetail = useCallback(async (seriesId: string) => {
    try {
      setWebSeriesDetailLoading(true);
      const response = await maoyanApi.getWebSeriesDetail(seriesId);
      if (response.success && response.data) {
        setWebSeriesDetail(response.data);
      } else {
        setWebSeriesDetail(null);
      }
    } catch (error) {
      console.error('Failed to fetch web series detail:', error);
      setWebSeriesDetail(null);
    } finally {
      setWebSeriesDetailLoading(false);
    }
  }, []);

  // 加载网播热剧B站解说
  const loadWebSeriesBilibiliComments = useCallback(async (seriesId: string) => {
    try {
      setWebSeriesBilibiliLoading(true);
      setWebSeriesBilibiliComments([]);
      setWebSeriesCanScrollRight(false);
      const response = await maoyanApi.getWebSeriesBilibiliComments(seriesId, 20);
      if (response.success && response.data) {
        setWebSeriesBilibiliComments(response.data.items || []);
        setTimeout(() => {
          if (webSeriesBilibiliScrollRef.current) {
            const container = webSeriesBilibiliScrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            setWebSeriesCanScrollRight(maxScroll > 10);
          }
        }, 100);
      } else {
        setWebSeriesBilibiliComments([]);
        setWebSeriesCanScrollRight(false);
      }
    } catch (error) {
      console.error('Failed to fetch web series Bilibili comments:', error);
      setWebSeriesBilibiliComments([]);
      setWebSeriesCanScrollRight(false);
    } finally {
      setWebSeriesBilibiliLoading(false);
    }
  }, []);

  // 加载网播热剧小红书讨论
  const loadWebSeriesXiaohongshuComments = useCallback(async (seriesId: string) => {
    try {
      setWebSeriesXiaohongshuLoading(true);
      setWebSeriesXiaohongshuComments([]);
      const response = await maoyanApi.getWebSeriesXiaohongshuComments(seriesId, 100);
      if (response.success && response.data) {
        setWebSeriesXiaohongshuComments(response.data.items || []);
      } else {
        setWebSeriesXiaohongshuComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch web series Xiaohongshu comments:', error);
      setWebSeriesXiaohongshuComments([]);
    } finally {
      setWebSeriesXiaohongshuLoading(false);
    }
  }, []);

  // 加载网播热剧微博热评
  const loadWebSeriesWeiboComments = useCallback(async (seriesId: string) => {
    try {
      setWebSeriesWeiboLoading(true);
      setWebSeriesWeiboComments([]);
      const response = await maoyanApi.getWebSeriesWeiboComments(seriesId, 10);
      if (response.success && response.data && response.data.items) {
        setWebSeriesWeiboComments(response.data.items);
      } else {
        setWebSeriesWeiboComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch web series Weibo comments:', error);
      setWebSeriesWeiboComments([]);
    } finally {
      setWebSeriesWeiboLoading(false);
    }
  }, []);

  // 加载综艺节目列表
  const loadVarietyList = useCallback(async () => {
    try {
      setVarietyLoading(true);
      const response = await maoyanApi.getVarietyList();
      if (response.success && response.data) {
        const varietyList = response.data.items || [];
        setVarietyList(varietyList);
        // 默认选中第一部综艺（仅在列表为空时）
        if (varietyList.length > 0) {
          setSelectedVariety(prev => prev || varietyList[0]);
        }
      } else {
        setVarietyList([]);
      }
    } catch (error) {
      console.error('Failed to fetch variety list:', error);
      setVarietyList([]);
    } finally {
      setVarietyLoading(false);
    }
  }, []);

  // 加载综艺节目详情
  const loadVarietyDetail = useCallback(async (seriesId: string) => {
    try {
      setVarietyDetailLoading(true);
      setVarietyDetail(null);
      const response = await maoyanApi.getVarietyDetail(seriesId);
      if (response.success && response.data) {
        setVarietyDetail(response.data);
      } else {
        setVarietyDetail(null);
      }
    } catch (error) {
      console.error('Failed to fetch variety detail:', error);
      setVarietyDetail(null);
    } finally {
      setVarietyDetailLoading(false);
    }
  }, []);

  // 加载综艺节目B站解说
  const loadVarietyBilibiliComments = useCallback(async (seriesId: string) => {
    try {
      setVarietyBilibiliLoading(true);
      setVarietyBilibiliComments([]);
      setVarietyCanScrollRight(false);
      const response = await maoyanApi.getVarietyBilibiliComments(seriesId, 20);
      if (response.success && response.data) {
        setVarietyBilibiliComments(response.data.items || []);
        setTimeout(() => {
          if (varietyBilibiliScrollRef.current) {
            const container = varietyBilibiliScrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            setVarietyCanScrollRight(maxScroll > 10);
          }
        }, 100);
      } else {
        setVarietyBilibiliComments([]);
        setVarietyCanScrollRight(false);
      }
    } catch (error) {
      console.error('Failed to fetch variety Bilibili comments:', error);
      setVarietyBilibiliComments([]);
      setVarietyCanScrollRight(false);
    } finally {
      setVarietyBilibiliLoading(false);
    }
  }, []);

  // 加载综艺节目小红书讨论
  const loadVarietyXiaohongshuComments = useCallback(async (seriesId: string) => {
    try {
      setVarietyXiaohongshuLoading(true);
      setVarietyXiaohongshuComments([]);
      const response = await maoyanApi.getVarietyXiaohongshuComments(seriesId, 100);
      if (response.success && response.data) {
        setVarietyXiaohongshuComments(response.data.items || []);
      } else {
        setVarietyXiaohongshuComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch variety Xiaohongshu comments:', error);
      setVarietyXiaohongshuComments([]);
    } finally {
      setVarietyXiaohongshuLoading(false);
    }
  }, []);

  // 加载综艺节目微博热评
  const loadVarietyWeiboComments = useCallback(async (seriesId: string) => {
    try {
      setVarietyWeiboLoading(true);
      setVarietyWeiboComments([]);
      const response = await maoyanApi.getVarietyWeiboComments(seriesId, 10);
      if (response.success && response.data && response.data.items) {
        setVarietyWeiboComments(response.data.items);
      } else {
        setVarietyWeiboComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch variety Weibo comments:', error);
      setVarietyWeiboComments([]);
    } finally {
      setVarietyWeiboLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (mainTab === 'ranking') {
    loadMovieList();
    } else if (mainTab === 'webSeries') {
      loadWebSeriesList();
    } else if (mainTab === 'variety') {
      loadVarietyList();
    }
  }, [mainTab, loadMovieList, loadWebSeriesList, loadVarietyList]);

  // 当选中电影改变时，加载详情和B站解说、小红书讨论、微博热评
  useEffect(() => {
    if (selectedMovie) {
      loadMovieDetail(selectedMovie.movieId);
      loadBilibiliComments(selectedMovie.movieId);
      loadXiaohongshuComments(selectedMovie.movieId);
      loadWeiboComments(selectedMovie.movieId);
      setBilibiliScrollIndex(0); // 重置滚动位置
      setCanScrollRight(false); // 初始化时不显示右箭头
      
      // 立即滚动到顶部（不使用smooth，确保立即执行）
      if (detailScrollRef.current) {
        detailScrollRef.current.scrollTop = 0;
      }
      
      // 延迟再次滚动，确保内容加载后也能滚动
      setTimeout(() => {
        if (detailScrollRef.current) {
          detailScrollRef.current.scrollTop = 0;
        }
      }, 300);
    } else {
      setBilibiliComments([]);
      setXiaohongshuComments([]);
      setWeiboComments([]);
      setBilibiliScrollIndex(0);
      setCanScrollRight(false);
    }
  }, [selectedMovie, loadMovieDetail, loadBilibiliComments, loadXiaohongshuComments, loadWeiboComments]);

  // 当选中网播热剧改变时，加载详情和B站解说、小红书讨论、微博热评
  useEffect(() => {
    if (selectedWebSeries) {
      loadWebSeriesDetail(selectedWebSeries.seriesId);
      loadWebSeriesBilibiliComments(selectedWebSeries.seriesId);
      loadWebSeriesXiaohongshuComments(selectedWebSeries.seriesId);
      loadWebSeriesWeiboComments(selectedWebSeries.seriesId);
      setWebSeriesBilibiliScrollIndex(0);
      setWebSeriesCanScrollRight(false);
      
      // 滚动到顶部
      if (detailScrollRef.current) {
        detailScrollRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        if (detailScrollRef.current) {
          detailScrollRef.current.scrollTop = 0;
        }
      }, 300);
    } else {
      setWebSeriesBilibiliComments([]);
      setWebSeriesXiaohongshuComments([]);
      setWebSeriesWeiboComments([]);
      setWebSeriesBilibiliScrollIndex(0);
      setWebSeriesCanScrollRight(false);
    }
  }, [selectedWebSeries, loadWebSeriesDetail, loadWebSeriesBilibiliComments, loadWebSeriesXiaohongshuComments, loadWebSeriesWeiboComments]);

  // 当选中综艺节目改变时，加载详情和B站解说、小红书讨论、微博热评
  useEffect(() => {
    if (selectedVariety) {
      loadVarietyDetail(selectedVariety.seriesId);
      loadVarietyBilibiliComments(selectedVariety.seriesId);
      loadVarietyXiaohongshuComments(selectedVariety.seriesId);
      loadVarietyWeiboComments(selectedVariety.seriesId);
      setVarietyBilibiliScrollIndex(0);
      setVarietyCanScrollRight(false);
      
      // 滚动到顶部
      if (detailScrollRef.current) {
        detailScrollRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        if (detailScrollRef.current) {
          detailScrollRef.current.scrollTop = 0;
        }
      }, 300);
    } else {
      setVarietyBilibiliComments([]);
      setVarietyXiaohongshuComments([]);
      setVarietyWeiboComments([]);
      setVarietyBilibiliScrollIndex(0);
      setVarietyCanScrollRight(false);
    }
  }, [selectedVariety, loadVarietyDetail, loadVarietyBilibiliComments, loadVarietyXiaohongshuComments, loadVarietyWeiboComments]);

  // 检查综艺B站是否可以向右滚动
  useEffect(() => {
    const checkScrollability = () => {
      if (varietyBilibiliScrollRef.current) {
        const container = varietyBilibiliScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        setVarietyCanScrollRight(currentScroll < maxScroll - 10);
      } else {
        setVarietyCanScrollRight(false);
      }
    };

    checkScrollability();

    const container = varietyBilibiliScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [varietyBilibiliComments]);

  // 检查网播热剧B站是否可以向右滚动
  useEffect(() => {
    const checkScrollability = () => {
      if (webSeriesBilibiliScrollRef.current) {
        const container = webSeriesBilibiliScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        setWebSeriesCanScrollRight(currentScroll < maxScroll - 10);
      } else {
        setWebSeriesCanScrollRight(false);
      }
    };

    checkScrollability();

    const container = webSeriesBilibiliScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [webSeriesBilibiliComments]);

  // 当详情加载完成后，也滚动到顶部
  useEffect(() => {
    if ((movieDetail || webSeriesDetail || varietyDetail) && detailScrollRef.current) {
      setTimeout(() => {
        if (detailScrollRef.current) {
          detailScrollRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [movieDetail, webSeriesDetail, varietyDetail]);

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

  // 准备电影指标数据
  const getMovieMetrics = (): Metric[] => {
    return [
      {
        label: '今日票房',
        value: `${getTodayBoxOffice()?.toFixed(1) || '0.0'}万`,
        icon: <Ticket size={9} className="text-rose-500" />,
        color: 'text-rose-600',
      },
      {
        label: '票房占比',
        value: selectedMovie?.boxRate || '0%',
        icon: <PieChart size={9} className="text-violet-500" />,
        color: 'text-slate-700',
      },
      {
        label: '排片占比',
        value: selectedMovie?.showCountRate || '0%',
        icon: <Monitor size={9} className="text-sky-500" />,
        color: 'text-slate-700',
      },
      {
        label: '上座率',
        value: selectedMovie?.avgSeatView || '0%',
        icon: <Users size={9} className="text-amber-500" />,
        color: 'text-slate-700',
      },
    ];
  };

  // 准备电影趋势数据
  const getMovieTrends = (): TrendDataPoint[] | undefined => {
    if (!movieDetail?.boxTrends || movieDetail.boxTrends.length < 2) return undefined;
    return movieDetail.boxTrends.slice(-7).map(t => ({
      date: t.date,
      value: t.box,
      label: t.boxDesc,
    }));
  };

  // 准备网剧/综艺指标数据
  const getWebSeriesMetrics = (detail: MaoyanWebSeriesDetail, selected: MaoyanWebSeriesItem | null): Metric[] => {
    return [
      {
        label: '当前热度',
        value: selected?.currHeatDesc || '0',
        icon: <TrendingUp size={9} className="text-rose-500" />,
        color: 'text-rose-600',
      },
      ...(detail.historyMaxHeat ? [{
        label: '历史最高',
        value: detail.historyMaxHeat.toFixed(2),
        icon: <Award size={9} className="text-emerald-500" />,
        color: 'text-emerald-600',
      }] : []),
      ...(detail.commentCount ? [{
        label: '评论数',
        value: detail.commentCount,
        icon: <MessageSquare size={9} className="text-blue-500" />,
        color: 'text-slate-700',
      }] : []),
      ...(detail.sumCommentCount ? [{
        label: '累计评论',
        value: detail.sumCommentCount,
        icon: <Users size={9} className="text-amber-500" />,
        color: 'text-slate-700',
      }] : []),
    ] as Metric[];
  };

  // 准备网剧/综艺趋势数据
  const getWebSeriesTrends = (detail: MaoyanWebSeriesDetail | null): TrendDataPoint[] | undefined => {
    if (!detail?.heatTrends || detail.heatTrends.length < 2) return undefined;
    return detail.heatTrends.slice(-7).map(t => ({
      date: t.date,
      value: t.heat,
    }));
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
            onClick={() => setMainTab('webSeries')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all whitespace-nowrap shrink-0 ${mainTab === 'webSeries'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
          >
            <Tv size={14} />
            <span>网播热剧</span>
          </button>
          <button
            onClick={() => setMainTab('variety')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all whitespace-nowrap shrink-0 ${mainTab === 'variety'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
          >
            <Sparkles size={14} />
            <span>综艺节目</span>
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
            <RankingList
              ref={scrollContainerRef}
              items={movies.map(m => ({ ...m, id: m.movieId }))}
              loading={loading}
              selectedId={selectedMovie?.movieId || null}
              onSelect={(item) => {
                const movie = movies.find(m => m.movieId === item.id);
                if (movie) handleMovieSelect(movie);
              }}
              type="movie"
              title="电影排行"
            />

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
                <div ref={detailScrollRef} className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
                  {/* 电影头部信息 */}
                  <DetailHeader
                    name={movieDetail.name}
                    imgUrl={movieDetail.imgUrl}
                    releaseInfo={movieDetail.releaseInfo}
                    category={movieDetail.category}
                    type="movie"
                    metrics={getMovieMetrics()}
                    trends={getMovieTrends()}
                    trendLabel="近日趋势"
                    trendGradientId="movieTrendGradient"
                    rightBottomContent={
                      <BilibiliVideoList
                        videos={bilibiliComments}
                        loading={bilibiliLoading}
                        title="B站影视解说"
                      />
                    }
                  />

                  {/* 社交热评 */}
                  <SocialCommentsSection
                    weiboComments={weiboComments}
                    weiboLoading={weiboLoading}
                    xiaohongshuComments={xiaohongshuComments}
                    xiaohongshuLoading={xiaohongshuLoading}
                    onXiaohongshuClick={(item) => {
                                      setSelectedXiaohongshuItem(item);
                                      setShowXiaohongshuModal(true);
                                    }}
                  />
                        
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

        {/* 网播热剧 Tab */}
        {mainTab === 'webSeries' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* 左侧：网播热剧排行列表 (1/4) */}
            <RankingList
              ref={scrollContainerRef}
              items={webSeriesList.map(s => ({ ...s, id: s.seriesId }))}
              loading={webSeriesLoading}
              selectedId={selectedWebSeries?.seriesId || null}
              onSelect={(item) => {
                const series = webSeriesList.find(s => s.seriesId === item.id);
                if (series) setSelectedWebSeries(series);
              }}
              type="webSeries"
              title="网播热剧排行"
            />

            {/* 右侧：网播热剧详情 (3/4) */}
            <div className="w-3/4 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden relative">
              {/* 背景装饰元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

              {webSeriesDetailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Loader2 className="animate-spin text-rose-600" size={32} />
                  <p className="text-slate-400 font-bold text-sm mt-4 uppercase tracking-widest">正在探索剧集奥秘...</p>
                </div>
              ) : webSeriesDetail ? (
                <div ref={detailScrollRef} className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
                  {/* 剧集头部信息 */}
                  <DetailHeader
                    name={webSeriesDetail.name}
                    imgUrl={webSeriesDetail.imgUrl}
                    releaseInfo={webSeriesDetail.releaseInfo || webSeriesDetail.platformDesc || ''}
                    category={webSeriesDetail.category}
                    platformDesc={webSeriesDetail.platformDesc}
                    type="webSeries"
                    metrics={getWebSeriesMetrics(webSeriesDetail, selectedWebSeries)}
                    trends={getWebSeriesTrends(webSeriesDetail)}
                    trendLabel="近日趋势"
                    trendGradientId="webSeriesTrendGradient"
                    rightBottomContent={
                      <BilibiliVideoList
                        videos={webSeriesBilibiliComments}
                        loading={webSeriesBilibiliLoading}
                        title="B站影视解说"
                      />
                    }
                  />

                  {/* 社交热评 */}
                  <SocialCommentsSection
                    weiboComments={webSeriesWeiboComments}
                    weiboLoading={webSeriesWeiboLoading}
                    xiaohongshuComments={webSeriesXiaohongshuComments}
                    xiaohongshuLoading={webSeriesXiaohongshuLoading}
                    onXiaohongshuClick={(item) => {
                      setSelectedXiaohongshuItem(item);
                      setShowXiaohongshuModal(true);
                    }}
                  />
                </div>
              ) : selectedWebSeries ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Tv size={64} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm">选择左侧剧集查看详情</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Tv size={64} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm">暂无数据</p>
                </div>
              )}
            </div>
                          </div>
                        )}
                        
        {/* 综艺节目 Tab */}
        {mainTab === 'variety' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* 左侧：综艺节目排行列表 (1/4) */}
            <RankingList
              ref={scrollContainerRef}
              items={varietyList.map(v => ({ ...v, id: v.seriesId }))}
              loading={varietyLoading}
              selectedId={selectedVariety?.seriesId || null}
              onSelect={(item) => {
                const variety = varietyList.find(v => v.seriesId === item.id);
                if (variety) setSelectedVariety(variety);
              }}
              type="variety"
              title="综艺节目排行"
            />

            {/* 右侧：综艺节目详情 (3/4) */}
            <div className="w-3/4 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden relative">
              {/* 背景装饰元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

              {varietyDetailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Loader2 className="animate-spin text-rose-600" size={32} />
                  <p className="text-slate-400 font-bold text-sm mt-4 uppercase tracking-widest">正在探索综艺奥秘...</p>
                </div>
              ) : varietyDetail ? (
                <div ref={detailScrollRef} className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
                  {/* 综艺节目头部信息 */}
                  <DetailHeader
                    name={varietyDetail.name}
                    imgUrl={varietyDetail.imgUrl}
                    releaseInfo={varietyDetail.releaseInfo || varietyDetail.platformDesc || ''}
                    category={varietyDetail.category}
                    platformDesc={varietyDetail.platformDesc}
                    type="variety"
                    metrics={getWebSeriesMetrics(varietyDetail, selectedVariety)}
                    trends={getWebSeriesTrends(varietyDetail)}
                    trendLabel="近日趋势"
                    trendGradientId="varietyTrendGradient"
                    rightBottomContent={
                      <BilibiliVideoList
                        videos={varietyBilibiliComments}
                        loading={varietyBilibiliLoading}
                        title="B站影视解说"
                      />
                    }
                  />

                  {/* 社交热评 */}
                  <SocialCommentsSection
                    weiboComments={varietyWeiboComments}
                    weiboLoading={varietyWeiboLoading}
                    xiaohongshuComments={varietyXiaohongshuComments}
                    xiaohongshuLoading={varietyXiaohongshuLoading}
                    onXiaohongshuClick={(item) => {
                      setSelectedXiaohongshuItem(item);
                      setShowXiaohongshuModal(true);
                    }}
                  />
                </div>
              ) : selectedVariety ? (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Sparkles size={64} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm">选择左侧综艺查看详情</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                  <Sparkles size={64} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm">暂无数据</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotDramaView;
