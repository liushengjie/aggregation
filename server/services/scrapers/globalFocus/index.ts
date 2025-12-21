export { BaseScraper, type Platform, type SocialItem, type ScraperConfig } from './base';
export { WeiboScraper } from './weibo';
export { BilibiliScraper } from './bilibili';
export { XiaohongshuScraper } from './xiaohongshu';
export { DouyinScraper } from './douyin';

import { BaseScraper, Platform } from './base';
import { WeiboScraper } from './weibo';
import { BilibiliScraper } from './bilibili';
import { XiaohongshuScraper } from './xiaohongshu';
import { DouyinScraper } from './douyin';

export function createScraper(platform: Platform): BaseScraper {
    switch (platform) {
        case 'Weibo':
            return new WeiboScraper();
        case 'Bilibili':
            return new BilibiliScraper();
        case 'Xiaohongshu':
            return new XiaohongshuScraper();
        case 'Douyin':
            return new DouyinScraper();
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}
