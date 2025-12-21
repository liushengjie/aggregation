import { SocialItem, AccountConfig, Platform } from './types';

export const PLATFORM_NAMES: Record<Platform, string> = {
  Weibo: '微博',
  Xiaohongshu: '小红书',
  Bilibili: '哔哩哔哩'
};

export const PLATFORMS_CONFIG = {
  Weibo: {
    color: 'text-red-500', // Changed to text- for icon color usage
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09c-2.38.63-4.69-.82-5.16-3.23-.47-2.41 1.06-4.82 3.44-5.45 2.38-.63 4.69.82 5.16 3.23.47 2.41-1.06 4.82-3.44 5.45zm3.12-6.5c-.92-.25-1.83.32-2.02 1.27-.19.95.41 1.9 1.33 2.15.92.25 1.83-.32 2.02-1.27.19-.95-.41-1.9-1.33-2.15z" />
      </svg>
    )
  },
  Xiaohongshu: {
    color: 'text-rose-600',
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM12 18a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm1-8h-2V7h2v3z" />
      </svg>
    )
  },
  Bilibili: {
    color: 'text-blue-400',
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.7 5.8h-1.6c.4-.9.6-1.9.6-2.9 0-.6-.4-1-1-1-.6 0-1 .4-1 1 0 .6-.1 1.2-.4 1.7L13.8 3c-.4-.2-.8-.3-1.3-.3H11c-.5 0-.9.1-1.3.3L8.3 4.6c-.3-.5-.4-1.1-.4-1.7 0-.6-.4-1-1-1-.6 0-1 .4-1 1 0 1 .2 2 .6 2.9H4.8C2.1 5.8 0 8 0 10.6v7.3C0 20.5 2.1 22.7 4.8 22.7h13.9c2.7 0 4.8-2.2 4.8-4.8v-7.3c0-2.6-2.1-4.8-4.8-4.8zM8 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      </svg>
    )
  }
};

