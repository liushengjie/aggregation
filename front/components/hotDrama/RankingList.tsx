import React, { forwardRef } from 'react';
import { Loader2, Film, Tv, Sparkles } from 'lucide-react';
import RankingListItem from './RankingListItem';
import { BaseRankingItem } from './types';

interface RankingListProps<T extends BaseRankingItem> {
  items: T[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (item: T) => void;
  type?: 'movie' | 'webSeries' | 'variety';
  title: string;
}

const RankingList = <T extends BaseRankingItem>(
  {
    items,
    loading,
    selectedId,
    onSelect,
    type = 'movie',
    title,
  }: RankingListProps<T>,
  ref?: React.Ref<HTMLDivElement>
) => {
  const getEmptyIcon = () => {
    switch (type) {
      case 'movie':
        return <Film size={32} className="text-slate-400" />;
      case 'webSeries':
        return <Tv size={32} className="text-slate-400" />;
      case 'variety':
        return <Sparkles size={32} className="text-slate-400" />;
      default:
        return <Film size={32} className="text-slate-400" />;
    }
  };

  return (
    <div className="w-1/4 flex flex-col bg-white/40 backdrop-blur-md rounded-md border border-white/60 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/60 bg-gradient-to-r from-rose-50/80 to-pink-50/80">
        <h3 className="text-xs font-black text-slate-800">{title}</h3>
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-rose-600" size={24} />
            <p className="text-slate-400 font-bold text-xs mt-3">加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            {getEmptyIcon()}
            <p className="text-slate-500 font-medium text-sm mt-3">暂无数据</p>
          </div>
        ) : (
          <div className="divide-y divide-white/40">
            {items.map((item, index) => (
              <RankingListItem
                key={item.id}
                item={item}
                index={index}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
                type={type}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 使用 forwardRef 包装组件以支持 ref
const RankingListWithRef = forwardRef(RankingList) as <T extends BaseRankingItem>(
  props: RankingListProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;

export default RankingListWithRef;

