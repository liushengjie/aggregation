import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Tv, Monitor, Sparkles, Trophy, DollarSign, Film, RefreshCw, Loader2, Flame } from 'lucide-react';
import { maoyanApi } from '../api/api';

// 数据类型定义
interface BoxOfficeMovie {
  rank: number;
  movieId: string;
  title: string;
  boxOffice: number;
  boxOfficeUnit: string;
  releaseDate: string;
  poster?: string;
  trend?: 'up' | 'down' | 'same';
}

interface CalendarMovie {
  movieId: string;
  title: string;
  releaseDate: string;
  poster?: string;
  wantCount?: number;
}

interface RankingItem {
  rank: number;
  itemId: string;
  title: string;
  score: number;
  poster?: string;
  info?: string;
  category: 'tv' | 'webSeries' | 'variety';
}

interface MaoyanData {
  boxOffice: BoxOfficeMovie[];
  calendar: CalendarMovie[];
  tvRanking: RankingItem[];
  webSeriesRanking: RankingItem[];
  varietyRanking: RankingItem[];
  fetchedAt: string;
}

type TabType = 'boxOffice' | 'calendar' | 'tv' | 'webSeries' | 'variety';

interface BoxOfficePanelProps {
  onSearch?: (title: string, mediaType: 'movie' | 'tv') => void;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

const BoxOfficePanel: React.FC<BoxOfficePanelProps> = ({ onSearch }) => {
  const [activeTab, setActiveTab] = useState<TabType>('boxOffice');
  const [data, setData] = useState<MaoyanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      const result = await maoyanApi.getAll(forceRefresh);
      setData(result);
      setLastUpdate(result.fetchedAt);
    } catch (error) {
      console.error('Failed to load maoyan data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => loadData(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatBoxOffice = (amount: number, unit?: string): string => {
    if (unit === '亿' || amount >= 10000) return `${(amount / 10000).toFixed(2)}亿`;
    return `${amount.toFixed(0)}万`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('月')) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatUpdateTime = (isoString: string | null): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
    return 'bg-slate-100 text-slate-500';
  };

  const handleRefresh = () => loadData(true);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/60 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-sm font-black text-slate-800">影视排行榜</h2>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && <span className="text-[10px] text-slate-400">{formatUpdateTime(lastUpdate)} 更新</span>}
            <button onClick={handleRefresh} disabled={refreshing} className="p-1 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex border-b border-white/60 bg-white/30 shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { key: 'boxOffice', icon: DollarSign, label: '票房榜' },
            { key: 'calendar', icon: Calendar, label: '上映日历' },
            { key: 'tv', icon: Tv, label: '电视剧' },
            { key: 'webSeries', icon: Monitor, label: '网络剧' },
            { key: 'variety', icon: Sparkles, label: '综艺' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              className={`flex-1 min-w-[70px] px-2 py-2.5 text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                activeTab === key ? 'text-rose-600 bg-white/60 border-b-2 border-rose-600' : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-amber-500 mb-2" size={24} />
              <span className="text-xs text-slate-500">加载中...</span>
            </div>
          ) : (
            <>
              {/* 票房榜 */}
              {activeTab === 'boxOffice' && (
                <div className="p-2 space-y-1.5">
                  {(data?.boxOffice || []).map((movie) => (
                    <div 
                      key={movie.movieId} 
                      className="flex items-center gap-2.5 p-2 bg-white/50 hover:bg-white/80 rounded-lg border border-white/60 transition-all cursor-pointer"
                      onClick={() => onSearch?.(movie.title, 'movie')}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[11px] font-black ${getRankStyle(movie.rank)}`}>
                        {movie.rank}
                      </div>
                      {movie.poster && (
                        <img src={movie.poster} alt={movie.title} className="flex-shrink-0 w-9 h-12 object-cover rounded bg-slate-200" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate hover:text-rose-600 transition-colors">{movie.title}</h4>
                        <span className="text-[10px] text-slate-400">{formatDate(movie.releaseDate)}</span>
                      </div>
                      <div className="flex-shrink-0 text-sm font-black text-rose-600">{formatBoxOffice(movie.boxOffice, movie.boxOfficeUnit)}</div>
                    </div>
                  ))}
                  {(!data?.boxOffice || data.boxOffice.length === 0) && <div className="text-center py-8 text-slate-400 text-xs">暂无数据</div>}
                </div>
              )}

              {/* 上映日历 */}
              {activeTab === 'calendar' && (
                <div className="p-2 space-y-1.5">
                  {(data?.calendar || []).map((movie) => (
                    <div 
                      key={movie.movieId} 
                      className="flex items-center gap-2.5 p-2 bg-white/50 hover:bg-white/80 rounded-lg border border-white/60 transition-all cursor-pointer"
                      onClick={() => onSearch?.(movie.title, 'movie')}
                    >
                      {movie.poster && (
                        <img src={movie.poster} alt={movie.title} className="flex-shrink-0 w-10 h-14 object-cover rounded bg-slate-200" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate mb-1 hover:text-rose-600 transition-colors">{movie.title}</h4>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold">{formatDate(movie.releaseDate)}</span>
                          {movie.wantCount && <span className="text-slate-500">{movie.wantCount.toLocaleString()}人想看</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!data?.calendar || data.calendar.length === 0) && <div className="text-center py-8 text-slate-400 text-xs">暂无数据</div>}
                </div>
              )}

              {/* 电视剧 */}
              {activeTab === 'tv' && (
                <div className="p-2 space-y-1.5">
                  {(data?.tvRanking || []).map((item) => (
                    <div 
                      key={item.itemId} 
                      className="flex items-center gap-2.5 p-2 bg-white/50 hover:bg-white/80 rounded-lg border border-white/60 transition-all cursor-pointer"
                      onClick={() => onSearch?.(item.title, 'tv')}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[11px] font-black ${getRankStyle(item.rank)}`}>
                        {item.rank}
                      </div>
                      {item.poster && (
                        <img src={item.poster} alt={item.title} className="flex-shrink-0 w-9 h-12 object-cover rounded bg-slate-200" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate hover:text-rose-600 transition-colors">{item.title}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Flame size={10} className="text-orange-500" />
                          <span>{item.score.toFixed(0)}</span>
                        </div>
                      </div>
                      {item.info && !item.info.includes('--') && (
                        <div className="flex-shrink-0 text-sm font-black text-rose-600">{item.info}</div>
                      )}
                    </div>
                  ))}
                  {(!data?.tvRanking || data.tvRanking.length === 0) && <div className="text-center py-8 text-slate-400 text-xs">暂无数据</div>}
                </div>
              )}

              {/* 网络剧 */}
              {activeTab === 'webSeries' && (
                <div className="p-2 space-y-1.5">
                  {(data?.webSeriesRanking || []).map((item) => (
                    <div 
                      key={item.itemId} 
                      className="flex items-center gap-2.5 p-2 bg-white/50 hover:bg-white/80 rounded-lg border border-white/60 transition-all cursor-pointer"
                      onClick={() => onSearch?.(item.title, 'tv')}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[11px] font-black ${getRankStyle(item.rank)}`}>
                        {item.rank}
                      </div>
                      {item.poster && (
                        <img src={item.poster} alt={item.title} className="flex-shrink-0 w-9 h-12 object-cover rounded bg-slate-200" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate hover:text-rose-600 transition-colors">{item.title}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Flame size={10} className="text-orange-500" />
                          <span>{item.score.toFixed(0)}</span>
                        </div>
                      </div>
                      {item.info && !item.info.includes('--') && (
                        <div className="flex-shrink-0 text-sm font-black text-rose-600">{item.info}</div>
                      )}
                    </div>
                  ))}
                  {(!data?.webSeriesRanking || data.webSeriesRanking.length === 0) && <div className="text-center py-8 text-slate-400 text-xs">暂无数据</div>}
                </div>
              )}

              {/* 综艺 */}
              {activeTab === 'variety' && (
                <div className="p-2 space-y-1.5">
                  {(data?.varietyRanking || []).map((item) => (
                    <div 
                      key={item.itemId} 
                      className="flex items-center gap-2.5 p-2 bg-white/50 hover:bg-white/80 rounded-lg border border-white/60 transition-all cursor-pointer"
                      onClick={() => onSearch?.(item.title, 'tv')}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[11px] font-black ${getRankStyle(item.rank)}`}>
                        {item.rank}
                      </div>
                      {item.poster && (
                        <img src={item.poster} alt={item.title} className="flex-shrink-0 w-9 h-12 object-cover rounded bg-slate-200" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate hover:text-rose-600 transition-colors">{item.title}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Flame size={10} className="text-orange-500" />
                          <span>{item.score.toFixed(0)}</span>
                        </div>
                      </div>
                      {item.info && !item.info.includes('--') && (
                        <div className="flex-shrink-0 text-sm font-black text-rose-600">{item.info}</div>
                      )}
                    </div>
                  ))}
                  {(!data?.varietyRanking || data.varietyRanking.length === 0) && <div className="text-center py-8 text-slate-400 text-xs">暂无数据</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoxOfficePanel;
