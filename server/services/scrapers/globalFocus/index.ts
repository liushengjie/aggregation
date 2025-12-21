export { BaseScraper, type Platform, type SocialItem, type ScraperConfig } from './base';
export { WeiboScraper } from './weibo';
export { BilibiliScraper } from './bilibili';
export { XiaohongshuScraper } from './xiaohongshu';

import { BaseScraper, Platform } from './base';
import { WeiboScraper } from './weibo';
import { BilibiliScraper } from './bilibili';
import { XiaohongshuScraper } from './xiaohongshu';

export function createScraper(platform: Platform): BaseScraper {
    switch (platform) {
        case 'Weibo':
            return new WeiboScraper();
        case 'Bilibili':
            return new BilibiliScraper();
        case 'Xiaohongshu':
            return new XiaohongshuScraper();
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}
