import React from 'react';
import { Star, Calendar, Ticket, TrendingUp, Monitor, PieChart, Users, Tv } from 'lucide-react';
import { BaseRankingItem } from './types';

interface RankingListItemProps {
  item: BaseRankingItem;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  type?: 'movie' | 'webSeries' | 'variety';
}

const RankingListItem: React.FC<RankingListItemProps> = ({
  item,
  index,
  isSelected,
  onClick,
  type = 'movie',
}) => {
  const getRankColor = () => {
    if (index === 0) return 'text-red-500';
    if (index === 1) return 'text-orange-500';
    if (index === 2) return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer transition-all hover:bg-white/60 ${
        isSelected ? 'bg-rose-50/80 border-l-4 border-rose-600' : ''
      }`}
    >
      {/* 第一行：排名 + 标题 */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[10px] font-black flex-shrink-0 w-5 ${getRankColor()}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <h4 className="text-sm font-black text-slate-800 truncate flex-1">
            {item.title}
          </h4>
          {isSelected && (
            <Star size={12} className="text-rose-600 fill-rose-600 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* 第二行：平台/上映信息 + 热度/票房 */}
      <div className="flex items-center gap-2 mb-1">
        {item.releaseInfo && (
          <div className="flex items-center gap-1 overflow-hidden">
            <Calendar size={10} className="text-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">{item.releaseInfo}</span>
          </div>
        )}
        {item.platformDesc && (
          <div className="flex items-center gap-1 overflow-hidden">
            <Monitor size={10} className="text-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">{item.platformDesc}</span>
          </div>
        )}
        
        {/* 电影：今日票房 */}
        {type === 'movie' && item.boxOffice !== null && item.boxOffice !== undefined && (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Ticket size={10} className="text-rose-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 font-normal">今日</span>
            <span className="text-[10px] text-rose-600 font-black">
              {item.boxOffice.toFixed(1)}万
            </span>
          </div>
        )}
        
        {/* 网剧/综艺：当前热度 */}
        {(type === 'webSeries' || type === 'variety') && item.currHeatDesc && (
          <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
            <TrendingUp size={10} className="text-rose-500 flex-shrink-0" />
            <span className="text-[10px] text-rose-600 font-black">{item.currHeatDesc}</span>
          </div>
        )}
        
        {/* 电影：总票房 */}
        {type === 'movie' && item.sumBoxDesc && (
          <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
            <TrendingUp size={10} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-600 font-medium">{item.sumBoxDesc}</span>
          </div>
        )}
      </div>

      {/* 第三行：类型/分账票房/数据指标（仅电影） */}
      {type === 'movie' ? (
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {item.sumSplitBoxDesc && (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <TrendingUp size={10} className="text-amber-500 flex-shrink-0" />
              <span className="text-amber-600 font-medium">{item.sumSplitBoxDesc}</span>
            </div>
          )}
          {item.boxRate && (
            <div className="flex items-center gap-1">
              <PieChart size={10} className="text-violet-500" />
              <span className="font-medium">占比 {item.boxRate}</span>
            </div>
          )}
          {item.showCountRate && (
            <div className="flex items-center gap-1">
              <Monitor size={10} className="text-sky-500" />
              <span>排片 {item.showCountRate}</span>
            </div>
          )}
          {item.avgSeatView && (
            <div className="flex items-center gap-1 ml-auto">
              <Users size={10} className="text-amber-500" />
              <span>上座 {item.avgSeatView}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {/* 显示类型标识：电视剧或网络剧 */}
          {type === 'webSeries' && item.type && (
            <div className="flex items-center gap-1">
              <Tv size={10} className={item.type === 'tv' ? 'text-blue-500' : 'text-purple-500'} />
              <span className={`font-medium ${item.type === 'tv' ? 'text-blue-600' : 'text-purple-600'}`}>
                {item.type === 'tv' ? '电视剧' : '网络剧'}
              </span>
            </div>
          )}
          {item.category && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{item.category}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RankingListItem;

