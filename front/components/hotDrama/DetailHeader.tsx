import React from 'react';
import { Zap, Award, Sparkles, Film, Tv, Play } from 'lucide-react';
import MetricCard, { Metric } from './MetricCard';
import TrendChart from './TrendChart';
import { TrendDataPoint } from './types';
import { getImageProxyUrl } from '../utils/imageProxyUtils';

interface DetailHeaderProps {
  // 基本信息
  name: string;
  imgUrl?: string;
  releaseInfo?: string;
  platformDesc?: string;
  category?: string;
  
  // 类型
  type?: 'movie' | 'webSeries' | 'variety';
  
  // 指标数据
  metrics?: Metric[];
  
  // 趋势数据
  trends?: TrendDataPoint[];
  trendLabel?: string;
  trendGradientId?: string;
  
  // 电影特有：今日票房
  todayBoxOffice?: number;
  
  // 网剧/综艺特有：当前热度
  currHeatDesc?: string;
  
  // 右侧下方内容（如B站视频）
  rightBottomContent?: React.ReactNode;
}

const DetailHeader: React.FC<DetailHeaderProps> = ({
  name,
  imgUrl,
  releaseInfo,
  platformDesc,
  category,
  type = 'movie',
  metrics,
  trends,
  trendLabel = '近日趋势',
  trendGradientId,
  todayBoxOffice,
  currHeatDesc,
  rightBottomContent,
}) => {
  const getPosterIcon = () => {
    switch (type) {
      case 'movie':
        return <Film size={32} />;
      case 'webSeries':
        return <Tv size={32} />;
      case 'variety':
        return <Sparkles size={32} />;
      default:
        return <Film size={32} />;
    }
  };

  const getBadgeIcon = () => {
    switch (type) {
      case 'movie':
        return <Award size={24} />;
      case 'webSeries':
        return <Tv size={24} />;
      case 'variety':
        return <Sparkles size={24} />;
      default:
        return <Award size={24} />;
    }
  };

  const getBadgeColor = () => {
    switch (type) {
      case 'movie':
        return 'bg-amber-500';
      case 'webSeries':
        return 'bg-rose-500';
      case 'variety':
        return 'bg-rose-500';
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <div className="px-4 py-3 border-b border-white/60 bg-gradient-to-br from-white/80 to-white/40">
      <div className="flex items-stretch gap-4">
        {/* 最左侧：海报 */}
        <div className="relative group flex-shrink-0 flex flex-col">
          {imgUrl ? (
            <div className="w-64 bg-slate-200 rounded-lg overflow-hidden border-2 border-white shadow-xl" style={{ aspectRatio: '2/3' }}>
              <img
                src={imgUrl}
                alt={name}
                className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          ) : (
            <div className="w-64 h-full bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 border-2 border-white shadow-xl" style={{ aspectRatio: '2/3' }}>
              {getPosterIcon()}
            </div>
          )}
          <div className={`absolute -bottom-3 -right-3 w-12 h-12 ${getBadgeColor()} rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white transform rotate-12 group-hover:rotate-0 transition-transform z-10`}>
            {getBadgeIcon()}
          </div>
        </div>

        {/* 右侧：标题、指标和趋势 */}
        <div className="flex-1 flex flex-col min-w-0 justify-between">
          <div className="flex flex-col">
            {/* 标题和基础信息 */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">{name}</h2>
                  <div className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded uppercase tracking-wider flex-shrink-0">
                    Hot
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-white/50 px-1.5 py-0.5 rounded-md border border-white/60">
                  <Zap size={10} className="text-amber-500" />
                  <span>{releaseInfo || platformDesc || ''}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {platformDesc && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-blue-50 text-blue-600 border-blue-200">
                    {platformDesc}
                  </span>
                )}
                {category?.split(',').map((cat, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                      i % 3 === 0
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : i % 3 === 1
                        ? 'bg-purple-50 text-purple-600 border-purple-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    {cat.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* 右侧上方：左右布局 - 指标和趋势 */}
            <div className="flex gap-2 mb-1.5">
              {/* 左边：指标卡片 */}
              {metrics && metrics.length > 0 && <MetricCard metrics={metrics} />}

              {/* 右边：趋势图 */}
              {trends && trends.length > 1 && (
                <TrendChart
                  trends={trends}
                  gradientId={trendGradientId}
                  label={trendLabel}
                />
              )}
            </div>
          </div>

          {/* 右侧下方：B站视频等内容 */}
          {rightBottomContent && (
            <div className="flex flex-col gap-2 mt-auto">
              {rightBottomContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailHeader;

