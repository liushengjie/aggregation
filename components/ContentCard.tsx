import React, { useState, useEffect } from 'react';
import { SocialItem } from '../types';
import { PLATFORMS_CONFIG, PLATFORM_NAMES } from '../constants';
import { ExternalLink, Heart, MessageSquare, Eye, Play, MoreHorizontal, Share2, Bookmark, Image as ImageIcon } from 'lucide-react';

// Get API base URL (same logic as api.ts)
const getApiBase = () => {
    if (typeof window !== 'undefined') {
        // 浏览器环境
        const hostname = window.location.hostname;
        const port = hostname === 'localhost' || hostname === '127.0.0.1' ? '3351' : window.location.port || '3351';
        return `${window.location.protocol}//${hostname}:${port}/api`;
    }
    // Node.js环境（开发时）
    return 'http://localhost:3351/api';
};

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

  // Platform badge gradient styles
  const badgeStyles = item.platform === 'Weibo' 
    ? 'bg-gradient-to-r from-[#ff8200] to-[#ff4500] shadow-red-200/50' 
    : item.platform === 'Xiaohongshu' 
    ? 'bg-gradient-to-r from-[#ff2442] to-[#e6162d] shadow-rose-200/50' 
    : 'bg-gradient-to-r from-[#00aeec] to-[#007ec4] shadow-blue-200/50';

  // Determine image source
  const imageSrc = item.thumbnail || '';
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Reset image loaded state when image source changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    
    // Check if image is already loaded (from cache)
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
      setImageLoaded(true);
    }
  }, [imageSrc]);

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
      <div className="ipad-glass rounded-md overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-white/60 flex flex-col bg-white/70">
        {/* Image Area */}
        {imageSrc && !imageError ? (
          <div className="relative overflow-hidden bg-slate-100 m-1 rounded-md shrink-0">
            {/* Skeleton placeholder - shows while image is loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 w-full aspect-[4/3] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse rounded-md" />
            )}
            
            {/* Actual image - fades in when loaded, maintains natural aspect ratio */}
            <img
              ref={imgRef}
              src={`${getApiBase()}/image/proxy?url=${encodeURIComponent(imageSrc)}`}
              alt={item.title}
              className={`w-full h-auto block rounded-md group-hover:scale-105 transition-transform duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-200`}
              loading="lazy"
              onLoad={() => {
                setImageLoaded(true);
              }}
              onError={(e) => { 
                setImageError(true);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            
            {/* Hover overlay - only show when image is loaded */}
            {imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            )}

            {/* Platform Label for Image Cards */}
            <div className="absolute top-2 left-2 z-10">
              <div className={`${badgeStyles} bg-opacity-95 backdrop-blur-sm text-white px-2 h-5 rounded-full shadow-sm border border-white/20 flex items-center justify-center`}>
                <span className="text-[9px] font-black tracking-wider uppercase leading-none relative top-[0.5px]">{platformName}</span>
              </div>
            </div>

            {/* Bilibili Duration */}
            {item.platform === 'Bilibili' && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                12:34
              </div>
            )}
          </div>
        ) : (
          /* Text-only Card Header */
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <div className={`${badgeStyles} bg-opacity-95 backdrop-blur-sm text-white px-2 h-5 rounded-full shadow-sm border border-white/20 flex items-center justify-center`}>
              <span className="text-[9px] font-black tracking-wider uppercase leading-none relative top-[0.5px]">{platformName}</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-3 pb-3 pt-1.5 flex flex-col flex-1">
          <h3 className={`font-bold text-slate-800 text-base leading-tight mb-3 group-hover:text-indigo-600 transition-colors ${!imageSrc ? 'line-clamp-[12]' : 'line-clamp-3'}`}>
            {item.title}
          </h3>

          <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100/50">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full ring-1 ring-white shadow-sm overflow-hidden shrink-0 bg-slate-200 flex items-center justify-center">
                <span className="text-[8px] font-black text-slate-400">
                  {item.author ? item.author.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">{item.author || '未知用户'}</span>
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

const ContentCard: React.FC<ContentCardProps> = React.memo(({ item }) => {
  return <UnifiedCard item={item} />;
}, (prevProps, nextProps) => {
  // Only re-render if item data actually changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.thumbnail === nextProps.item.thumbnail &&
    prevProps.item.title === nextProps.item.title
  );
});

ContentCard.displayName = 'ContentCard';

export default ContentCard;