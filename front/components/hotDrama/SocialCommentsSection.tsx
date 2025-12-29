import React from 'react';
import { Loader2, Share2, Heart } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { WeiboCommentItem, XiaohongshuCommentItem } from './types';
import WeiboCommentCard from './WeiboCommentCard';
import XiaohongshuCommentCard from './XiaohongshuCommentCard';

interface SocialCommentsSectionProps {
  weiboComments: WeiboCommentItem[];
  weiboLoading: boolean;
  xiaohongshuComments: XiaohongshuCommentItem[];
  xiaohongshuLoading: boolean;
  onXiaohongshuClick?: (item: XiaohongshuCommentItem) => void;
}

const SocialCommentsSection: React.FC<SocialCommentsSectionProps> = ({
  weiboComments,
  weiboLoading,
  xiaohongshuComments,
  xiaohongshuLoading,
  onXiaohongshuClick,
}) => {
  return (
    <div className="px-4 py-3 flex flex-col gap-3 bg-slate-50/50">
      {/* 微博 & 小红书 (并排) */}
      <div className="grid grid-cols-2 gap-0 relative">
        {/* 微博热评 */}
        <div className="flex flex-col pr-4 relative">
          <div className="flex items-center gap-2 mb-1 pb-2 border-b border-slate-200/40 shrink-0">
            <div className="w-7 h-7 bg-[#E6162D] rounded-lg flex items-center justify-center text-white shadow-md">
              <Share2 size={14} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">微博热评</h4>
            </div>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest ml-auto">
              Hot Comments
            </span>
          </div>

          {weiboLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#E6162D]" size={20} />
            </div>
          ) : weiboComments.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
              暂无微博热评
            </div>
          ) : (
            <div className="flex flex-col gap-3 h-full overflow-y-auto">
              {weiboComments.map((comment, index) => (
                <WeiboCommentCard key={comment.id || index} comment={comment} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* 垂直分隔线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent transform -translate-x-1/2 z-10"></div>

        {/* 小红书讨论 */}
        <div className="flex flex-col gap-3 pl-4">
          <div className="flex items-center gap-2 mb-1 pb-2 border-b border-slate-200/40">
            <div className="w-7 h-7 bg-[#FF2442] rounded-lg flex items-center justify-center text-white shadow-md">
              <Heart size={14} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">小红书讨论</h4>
            </div>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest ml-auto">
              Discussions
            </span>
          </div>

          {xiaohongshuLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#FF2442]" size={20} />
            </div>
          ) : xiaohongshuComments.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
              暂无小红书讨论
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <Masonry
                breakpointCols={{
                  default: 3,
                  1200: 3,
                  992: 3,
                  768: 2,
                  576: 2
                }}
                className="masonry-grid"
                columnClassName="masonry-grid_column"
              >
                {xiaohongshuComments
                  .filter(item => item.cover && item.cover.trim() !== '')
                  .map((item, index) => (
                    <XiaohongshuCommentCard
                      key={item.id || index}
                      item={item}
                      index={index}
                      onClick={onXiaohongshuClick ? () => onXiaohongshuClick(item) : undefined}
                    />
                  ))}
              </Masonry>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialCommentsSection;

