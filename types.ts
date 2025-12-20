
export type Platform = 'Weibo' | 'Xiaohongshu' | 'Bilibili';

export interface SocialItem {
  id: string;
  platform: Platform;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  timestamp: string;
  stats: {
    likes: number;
    comments: number;
    shares?: number;
    views?: number;
  };
  tags: string[];
}

export interface AccountConfig {
  id: string;
  platform: Platform;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}
