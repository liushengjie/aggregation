
import React from 'react';
// Added Platform to the import list
import { SocialItem, AccountConfig, Platform } from './types';

export const PLATFORMS_CONFIG = {
  Weibo: {
    color: 'bg-red-500',
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm3.84 13.91c-.48.77-1.43 1.14-2.5 1.14-2.18 0-4.32-1.39-4.32-3.13 0-1.11.83-2.16 2.21-2.16.48 0 .93.11 1.3.31.22.12.42.27.6.45.18-.18.38-.33.6-.45.37-.2.82-.31 1.3-.31 1.38 0 2.21 1.05 2.21 2.16 0 1.74-2.14 3.13-4.32 3.13-1.07 0-2.02-.37-2.5-1.14-.1-.16-.14-.35-.14-.54 0-.19.04-.38.14-.54.48-.77 1.43-1.14 2.5-1.14 2.18 0 4.32 1.39 4.32 3.13 0 .19-.04.38-.14.54-.48.77-1.43 1.14-2.5 1.14z"/>
      </svg>
    )
  },
  Xiaohongshu: {
    color: 'bg-rose-600',
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  },
  Bilibili: {
    color: 'bg-blue-400',
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.765-1.004.995-2.263 1.519-3.773 1.573H5.32c-1.51-.054-2.769-.578-3.773-1.573C.543 20.119.023 18.865 0 17.353v-7.36c.036-1.511.556-2.765 1.56-3.76C2.564 5.237 3.823 4.713 5.333 4.66h.854l-1.802-1.79a.639.639 0 0 1 0-.915.639.639 0 0 1 .914 0l2.469 2.453h8.464l2.469-2.453a.639.639 0 0 1 .914 0 .639.639 0 0 1 0 .915l-1.802 1.783zm-5.813 13.093c1.757 0 3.187-1.43 3.187-3.187 0-1.757-1.43-3.187-3.187-3.187-1.757 0-3.187 1.43-3.187 3.187 0 1.757 1.43 3.187 3.187 3.187z"/>
      </svg>
    )
  }
};

export const MOCK_ACCOUNTS: AccountConfig[] = [
  { id: '1', platform: 'Weibo', username: 'TechNews_Daily', status: 'connected', lastSync: '10 mins ago' },
  { id: '2', platform: 'Xiaohongshu', username: 'Lifestyle_Creator', status: 'connected', lastSync: '25 mins ago' },
  { id: '3', platform: 'Bilibili', username: 'CodeMaster_Bili', status: 'error', lastSync: '2 hours ago' },
];

export const MOCK_ITEMS: SocialItem[] = Array.from({ length: 30 }).map((_, i) => {
  const platforms: Platform[] = ['Weibo', 'Xiaohongshu', 'Bilibili'];
  const platform = platforms[i % 3];
  return {
    id: `item-${i}`,
    platform,
    title: i % 2 === 0 ? `今天的${platform}热门推荐：探索2024年最火的技术趋势与生活方式` : `${platform}独家深度解析：为什么这个话题突然爆红？`,
    author: `创作者_${i + 100}`,
    thumbnail: `https://picsum.photos/seed/${i + 400}/600/400`,
    url: 'https://example.com',
    timestamp: '2024-03-20 10:30',
    stats: {
      likes: Math.floor(Math.random() * 10000),
      comments: Math.floor(Math.random() * 2000),
      views: Math.floor(Math.random() * 50000),
    },
    tags: ['科技', '数码', '生活', '推荐'],
  };
});
