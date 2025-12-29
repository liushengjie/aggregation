import React from 'react';
import { Play, Heart } from 'lucide-react';
import { XiaohongshuCommentItem } from './types';
import { getImageProxyUrl } from '../utils/imageProxyUtils';

interface XiaohongshuCommentCardProps {
  item: XiaohongshuCommentItem;
  index?: number;
  onClick?: () => void;
}

const XiaohongshuCommentCard: React.FC<XiaohongshuCommentCardProps> = ({
  item,
  index = 0,
  onClick,
}) => {
  const imageUrl = getImageProxyUrl(item.cover || '');

  return (
    <div
      className="group flex flex-col rounded-lg overflow-hidden bg-slate-200 border border-slate-100 shadow-sm hover:shadow-md transition-all mb-2 cursor-pointer"
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (item.url) {
          window.open(item.url, '_blank');
        }
      }}
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
            <Heart size={16} className="text-rose-300" />
          </div>
        )}
        {/* 视频标识 */}
        {item.type === 'video' && (
          <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-black/60 rounded flex items-center justify-center">
            <Play size={8} className="text-white" fill="white" />
          </div>
        )}
      </div>
      {/* 标题和统计信息 */}
      <div className="p-2 bg-white">
        <p className="text-xs font-bold text-slate-800 line-clamp-2 mb-1">
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
};

export default XiaohongshuCommentCard;

