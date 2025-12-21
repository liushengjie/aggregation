import { SocialItem, AccountConfig, Platform } from './types';

export const PLATFORM_NAMES: Record<Platform, string> = {
  Weibo: '微博',
  Xiaohongshu: '小红书',
  Bilibili: '哔哩哔哩',
  Douyin: '抖音'
};

export const PLATFORMS_CONFIG = {
  Weibo: {
    color: 'bg-[#E6162D]', // 微博品牌红色 #E6162D
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        {/* 微博Logo - 眼睛形状 */}
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        <ellipse cx="9" cy="10" rx="1.5" ry="1.5"/>
        <ellipse cx="15" cy="10" rx="1.5" ry="1.5"/>
      </svg>
    )
  },
  Xiaohongshu: {
    color: 'bg-[#FF2442]', // 小红书品牌红色 #FF2442
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        {/* 小红书Logo - X字母形状 */}
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-12h4v2h-4zm0 4h4v6h-4z"/>
      </svg>
    )
  },
  Bilibili: {
    color: 'bg-[#00A1D6]', // 哔哩哔哩品牌蓝色 #00A1D6
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        {/* 哔哩哔哩Logo - TV形状 */}
        <path d="M18.7 5.8h-1.6c.4-.9.6-1.9.6-2.9 0-.6-.4-1-1-1-.6 0-1 .4-1 1 0 .6-.1 1.2-.4 1.7L13.8 3c-.4-.2-.8-.3-1.3-.3H11c-.5 0-.9.1-1.3.3L8.3 4.6c-.3-.5-.4-1.1-.4-1.7 0-.6-.4-1-1-1-.6 0-1 .4-1 1 0 1 .2 2 .6 2.9H4.8C2.1 5.8 0 8 0 10.6v7.3C0 20.5 2.1 22.7 4.8 22.7h13.9c2.7 0 4.8-2.2 4.8-4.8v-7.3c0-2.6-2.1-4.8-4.8-4.8zM8 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
      </svg>
    )
  },
  Douyin: {
    color: 'bg-black', // 抖音品牌黑色
    icon: (className: string) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        {/* 抖音Logo - 音符形状 */}
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    )
  }
};

