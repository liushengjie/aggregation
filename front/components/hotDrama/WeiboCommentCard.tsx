import React from 'react';
import { Share2, MessageSquare, Heart, User } from 'lucide-react';
import { WeiboCommentItem } from './types';
import { getImageProxyUrl } from '../utils/imageProxyUtils';

interface WeiboCommentCardProps {
  comment: WeiboCommentItem;
  index?: number;
}

const WeiboCommentCard: React.FC<WeiboCommentCardProps> = ({ comment, index = 0 }) => {
  const avatarUrl = comment.author?.avatar ? getImageProxyUrl(comment.author.avatar) : '';

  // 格式化微博文本，处理话题和@提及
  const formatWeiboText = (text: string) => {
    let parts: any[] = [];
    let lastIndex = 0;
    const topicRegex = /#([^#]+)#/g;
    const mentionRegex = /@([^\s@]+)/g;
    const allMatches: Array<{ type: 'topic' | 'mention'; match: string; index: number; length: number }> = [];
    let match;

    while ((match = topicRegex.exec(text)) !== null) {
      allMatches.push({ type: 'topic', match: match[0], index: match.index, length: match[0].length });
    }
    topicRegex.lastIndex = 0;
    while ((match = mentionRegex.exec(text)) !== null) {
      allMatches.push({ type: 'mention', match: match[0], index: match.index, length: match[0].length });
    }
    allMatches.sort((a, b) => a.index - b.index);
    allMatches.forEach(({ type, match, index, length }) => {
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      parts.push(
        <span key={`${index}-${type}`} className={type === 'topic' ? 'text-rose-600 font-bold' : 'text-blue-600'}>
          {match}
        </span>
      );
      lastIndex = index + length;
    });
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div
      className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => comment.url && window.open(comment.url, '_blank')}
    >
      <div className="flex gap-2 mb-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt={comment.author?.name} className="w-8 h-8 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-black text-slate-800 truncate">{comment.author?.name || '微博用户'}</span>
            {comment.publishTime && (
              <span className="text-[9px] text-slate-400 whitespace-nowrap">{comment.publishTime}</span>
            )}
          </div>
          {comment.publishFrom && (
            <div className="text-[9px] text-slate-400">{comment.publishFrom}</div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed mb-2">{formatWeiboText(comment.text)}</p>
      {comment.images && comment.images.length > 0 && (
        <div className={`grid gap-1 mb-2 ${comment.images.length === 1 ? 'grid-cols-1' : comment.images.length <= 4 ? 'grid-cols-4' : 'grid-cols-4'}`}>
          {comment.images.slice(0, 9).map((img, imgIndex) => (
            <img key={imgIndex} src={getImageProxyUrl(img)} alt="" className="w-full h-20 object-cover rounded" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-[9px] text-slate-400">
        <span>转发 {comment.stats?.reposts || 0}</span>
        <span>评论 {comment.stats?.comments || 0}</span>
        <span>点赞 {comment.stats?.likes || 0}</span>
      </div>
    </div>
  );
};

export default WeiboCommentCard;

