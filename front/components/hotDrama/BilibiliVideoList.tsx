import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { BilibiliVideoItem } from './types';
import { getImageProxyUrl } from '../utils/imageProxyUtils';

interface BilibiliVideoListProps {
  videos: BilibiliVideoItem[];
  loading: boolean;
  title?: string;
}

const BilibiliVideoList: React.FC<BilibiliVideoListProps> = ({
  videos,
  loading,
  title = 'B站影视解说',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 格式化时长显示
  const formatDuration = (duration: string | number | undefined): string => {
    if (!duration) return '';
    if (typeof duration === 'string' && /^\d+:\d+$/.test(duration)) {
      return duration;
    }
    const seconds = typeof duration === 'number' ? duration : parseInt(duration);
    if (!isNaN(seconds) && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return '';
  };

  // 格式化播放量
  const formatViews = (views: number | undefined): string => {
    if (!views) return '0';
    if (views >= 10000) return `${(views / 10000).toFixed(1)}万`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
    return String(views);
  };

  // 检查滚动状态
  useEffect(() => {
    const checkScrollability = () => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        setCanScrollRight(currentScroll < maxScroll - 10);
      }
    };

    checkScrollability();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [videos]);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const scrollAmount = container.clientWidth;
      container.scrollTo({
        left: container.scrollLeft - scrollAmount,
        behavior: 'smooth',
      });
      setScrollIndex(Math.max(0, scrollIndex - 1));
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const scrollAmount = container.clientWidth;
      container.scrollTo({
        left: container.scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
      setScrollIndex(scrollIndex + 1);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    const currentIndex = Math.round(scrollLeft / clientWidth);
    setScrollIndex(currentIndex);
    setCanScrollRight(scrollLeft < maxScroll - 10);
  };

  return (
    <div className="flex flex-col gap-2 mt-auto">
      {title && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#00AEEC] rounded flex items-center justify-center text-white shadow-sm">
            <Play size={12} fill="currentColor" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800">{title}</h4>
          </div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest ml-auto">
            Deep Analysis
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-[#00AEEC]" size={20} />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
          暂无B站解说数据
        </div>
      ) : (
        <div className="relative">
          {/* 左箭头 */}
          {scrollIndex > 0 && (
            <button
              onClick={handleScrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-slate-200"
            >
              <ChevronLeft size={16} className="text-slate-700" />
            </button>
          )}

          {/* 滚动容器 */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
            onScroll={handleScroll}
          >
            {videos.map((item, i) => {
              const videoUrl = item.url || (item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : '#');
              const coverUrl = item.cover || '';
              const title = item.title || '无标题';
              const authorName = item.author?.name || 'UP主';
              const views = item.stats?.views || 0;
              const duration = formatDuration(item.duration);
              const imageUrl = getImageProxyUrl(coverUrl);

              return (
                <div
                  key={item.id || `bili-${i}`}
                  className="flex-shrink-0 w-56 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  <div className="relative">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.parentElement?.querySelector('.img-placeholder') as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="img-placeholder hidden w-full h-32 bg-gradient-to-br from-[#00AEEC]/20 to-[#00AEEC]/5 items-center justify-center absolute inset-0">
                          <Play size={24} className="text-[#00AEEC]" />
                        </div>
                        {/* 视频播放图标 */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-100 transition-all">
                            <Play size={16} className="text-[#00AEEC] ml-0.5" fill="#00AEEC" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                        <Play size={24} className="text-blue-300" />
                      </div>
                    )}
                    {duration && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded font-medium">
                        {duration}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-rose-600 transition-colors">
                      {title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                      {authorName && (
                        <>
                          <span className="truncate">{authorName}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatViews(views)}播放</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右箭头 */}
          {canScrollRight && (
            <button
              onClick={handleScrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-slate-200"
            >
              <ChevronRight size={16} className="text-slate-700" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BilibiliVideoList;

