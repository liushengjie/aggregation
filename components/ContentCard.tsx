import React from 'react';
import { SocialItem } from '../types';
import { PLATFORMS_CONFIG } from '../constants';
import { ExternalLink, Heart, MessageSquare, Eye, Play, MoreHorizontal, User } from 'lucide-react';

interface ContentCardProps {
  item: SocialItem;
}

const formatNumber = (num: number) => {
  return num > 10000 ? (num / 10000).toFixed(1) + 'w' : num > 1000 ? (num / 1000).toFixed(1) + 'k' : num;
};

// --- Bilibili Style Card (Video Centric) ---
const BilibiliCard: React.FC<{ item: SocialItem }> = ({ item }) => {
  const config = PLATFORMS_CONFIG['Bilibili'];
  return (
    <div className="group bg-white rounded-sm overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 break-inside-avoid mb-4">
      {/* 16:9 Video Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
        />
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
            <Play size={18} className="text-blue-500 ml-1" fill="currentColor" />
          </div>
        </div>
        {/* Duration Badge */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-1 backdrop-blur-sm">
          <span>12:34</span>
        </div>
        {/* Platform Icon */}
        <div className="absolute top-1.5 left-1.5">
           <div className={`${config.color} text-white p-1 rounded-sm shadow-sm`}>
            {config.icon("w-3 h-3")}
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-2 leading-tight group-hover:text-blue-500 transition-colors">
          {item.title}
        </h3>
        
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-50">
              <img src={`https://picsum.photos/seed/${item.author}/32/32`} alt={item.author} className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] hover:text-blue-400 cursor-pointer">{item.author}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
             <div className="flex items-center gap-1">
                <Eye size={12} />
                <span>{formatNumber(item.stats.views || 0)}</span>
             </div>
             <div className="flex items-center gap-1">
                <MessageSquare size={12} />
                <span>{item.stats.comments}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Xiaohongshu Style Card (Portrait Note) ---
const XHSCard: React.FC<{ item: SocialItem }> = ({ item }) => {
  // Use a taller aspect ratio for XHS to mimic the mobile app feed
  const config = PLATFORMS_CONFIG['Xiaohongshu'];
  return (
    <div className="group bg-white rounded-md overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 break-inside-avoid mb-4">
      {/* 3:4 or 4:5 Portrait Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex gap-1">
           <div className="bg-white/90 backdrop-blur-md text-rose-600 text-[8px] font-bold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1">
            {config.icon("w-2.5 h-2.5")}
            <span>笔记</span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-gray-900 text-[13px] line-clamp-2 mb-2.5 leading-snug">
          {item.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0">
               <img src={`https://picsum.photos/seed/${item.author}/32/32`} alt={item.author} className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{item.author}</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-400 group-hover:text-rose-500 transition-colors">
            <Heart size={12} className={item.stats.likes > 100 ? "fill-rose-50 text-rose-500" : ""} />
            <span className="text-[10px] font-medium">{formatNumber(item.stats.likes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Weibo Style Card (Microblog/Post) ---
const WeiboCard: React.FC<{ item: SocialItem }> = ({ item }) => {
  const config = PLATFORMS_CONFIG['Weibo'];
  return (
    <div className="group bg-white rounded-md overflow-hidden border border-gray-100 shadow-sm hover:border-gray-200 transition-all duration-200 break-inside-avoid mb-4">
      <div className="p-3">
        {/* Header: User Info similar to a Tweet */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full border border-gray-100 p-0.5">
                <img src={`https://picsum.photos/seed/${item.author}/64/64`} alt={item.author} className="w-full h-full object-cover rounded-full" />
             </div>
             <div>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-bold text-gray-900">{item.author}</span>
                 <div className="bg-[#f00] text-white text-[8px] px-1 rounded-sm flex items-center">V</div>
               </div>
               <span className="text-[9px] text-gray-400 block">3小时前 · 来自 iPhone</span>
             </div>
          </div>
          <button className="text-gray-300 hover:text-gray-600">
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Content: Text First */}
        <div className="mb-2">
           <p className="text-sm text-gray-800 leading-normal line-clamp-3">
             <span className="text-blue-500 mr-1">#{item.tags[0] || '热门话题'}#</span>
             {item.title} 
             {item.tags.length > 1 && <span className="text-blue-500 ml-1">...全文</span>}
           </p>
        </div>

        {/* Media: Image (16:9 for single image simulation) */}
        <div className="relative aspect-[16/9] rounded-sm overflow-hidden bg-gray-50 mb-3 border border-gray-50">
           <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
           <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold">
              GIF
           </div>
        </div>

        {/* Footer: Actions */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
          <div className="flex items-center gap-4 w-full">
             <div className="flex items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors flex-1 justify-center">
                <ExternalLink size={14} />
                <span className="text-[10px]">转发</span>
             </div>
             <div className="flex items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors flex-1 justify-center border-l border-gray-100">
                <MessageSquare size={14} />
                <span className="text-[10px]">{formatNumber(item.stats.comments)}</span>
             </div>
             <div className="flex items-center gap-1 text-gray-500 hover:text-orange-500 transition-colors flex-1 justify-center border-l border-gray-100">
                <Heart size={14} />
                <span className="text-[10px]">{formatNumber(item.stats.likes)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
  switch (item.platform) {
    case 'Xiaohongshu':
      return <XHSCard item={item} />;
    case 'Weibo':
      return <WeiboCard item={item} />;
    case 'Bilibili':
    default:
      return <BilibiliCard item={item} />;
  }
};

export default ContentCard;