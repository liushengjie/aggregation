import React from 'react';
import { SocialItem } from '../types';
import { PLATFORMS_CONFIG, PLATFORM_NAMES } from '../constants';
import { ExternalLink, Heart, MessageSquare, Eye, Play, MoreHorizontal, Share2, Bookmark, Image as ImageIcon } from 'lucide-react';

interface ContentCardProps {
  item: SocialItem;
}

const formatNumber = (num: number) => {
  return num > 10000 ? (num / 10000).toFixed(1) + 'w' : num > 1000 ? (num / 1000).toFixed(1) + 'k' : num;
};

// --- Unified Card Component ---
// All platforms now share a consistent structure for the Uniform Grid layout
const UnifiedCard: React.FC<{ item: SocialItem }> = ({ item }) => {
  const config = PLATFORMS_CONFIG[item.platform];
  const platformName = PLATFORM_NAMES[item.platform];

  // Determine image source
  const imageSrc = item.thumbnail || `https://picsum.photos/seed/${item.id}/400/300`;

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group h-full">
      <div className="ipad-glass rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-white/60 h-full flex flex-col bg-white/70">
        {/* Unified Image Area - Aspect Ratio 4:3 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 m-1.5 rounded-md shrink-0">
          <img
            src={imageSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/400/300`; }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Platform Label - High Visibility Small Design */}
          <div className="absolute top-1.5 left-1.5 z-10">
            <div className="bg-white text-slate-900 px-1 py-0.5 rounded shadow-md flex items-center gap-0.5 border border-slate-100/50 scale-95 origin-top-left">
              {config.icon(`w-2.5 h-2.5 ${config.color.replace('text-', 'text-')}`)}
              <span className="text-[8px] font-black tracking-wide leading-none">{platformName}</span>
            </div>
          </div>

          {/* Duration / Type Badge - Bottom Right */}
          {item.platform === 'Bilibili' && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              12:34
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-3 pb-3 pt-0.5 flex flex-col flex-1">
          <h3 className="font-bold text-slate-800 text-[13px] line-clamp-2 mb-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>

          <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100/50">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full ring-1 ring-white shadow-sm overflow-hidden shrink-0">
                <img src={`https://picsum.photos/seed/${item.author}/64/64`} alt={item.author} className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">{item.author}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
              {item.platform === 'Xiaohongshu' ? (
                <>
                  <span className="flex items-center gap-0.5"><Heart size={10} /> {formatNumber(item.stats.likes)}</span>
                </>
              ) : item.platform === 'Bilibili' ? (
                <>
                  <span className="flex items-center gap-0.5"><Play size={10} /> {formatNumber(item.stats.views)}</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {formatNumber(item.stats.comments)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
};

const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
  return <UnifiedCard item={item} />;
};

export default ContentCard;