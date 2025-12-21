import { BaseScraper, SocialItem, ScraperConfig } from './base';

const BILIBILI_CONFIG: ScraperConfig = {
    platform: 'Bilibili',
    loginUrl: 'https://passport.bilibili.com/login',
    homeUrl: 'https://www.bilibili.com',
};

export class BilibiliScraper extends BaseScraper {
    constructor() {
        super(BILIBILI_CONFIG);
    }

    /**
     * Wait for Bilibili login to complete
     */
    async waitForLogin(): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            // Wait for redirect to home page
            await this.page.waitForURL(/bilibili\.com\/?$/, {
                timeout: 300000, // 5 minutes for manual login
            });

            await this.page.waitForTimeout(2000);
            return await this.isLoggedIn();
        } catch (error) {
            console.error('Login timeout or error:', error);
            return false;
        }
    }

    /**
     * Check if logged into Bilibili
     */
    async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Check for user avatar in header
            const userElement = await this.page.$('.bili-avatar, .header-avatar-wrap, .v-popover-wrap');
            return userElement !== null;
        } catch {
            return false;
        }
    }

    /**
     * Fetch content from Bilibili feed
     */
    async fetchContent(): Promise<SocialItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: SocialItem[] = [];

        try {
            // Navigate to home feed
            await this.page.goto('https://www.bilibili.com', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // Scroll to load more content
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.page.waitForTimeout(1500);
            }

            // Extract video cards
            const feedItems = await this.page.$$eval('.bili-video-card, .video-card, .feed-card', (elements) => {
                return elements.slice(0, 30).map((el, index) => {
                    const titleEl = el.querySelector('.bili-video-card__info--tit, .title, a[title]');
                    const authorEl = el.querySelector('.bili-video-card__info--author, .up-name, .name');
                    const coverEl = el.querySelector('.bili-video-card__cover img, .cover img, .lazy-img') as HTMLImageElement;
                    const linkEl = el.querySelector('a[href*="/video/"]') as HTMLAnchorElement;

                    // Get stats
                    const viewEl = el.querySelector('.bili-video-card__stats--item, .play-text, .view');
                    const danmakuEl = el.querySelector('.bili-video-card__stats--item:nth-child(2), .like-text');

                    const extractNumber = (text: string | null) => {
                        if (!text) return 0;
                        const match = text.match(/([\d.]+)/);
                        if (!match) return 0;
                        let num = parseFloat(match[1]);
                        if (text.includes('万')) num *= 10000;
                        return Math.floor(num);
                    };

                    return {
                        externalId: linkEl?.href?.match(/\/video\/(BV\w+)/)?.[1] || `bilibili-${index}`,
                        title: titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || '',
                        author: authorEl?.textContent?.trim() || '',
                        thumbnail: coverEl?.src || coverEl?.getAttribute('data-src') || '',
                        url: linkEl?.href || '',
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        views: extractNumber(viewEl?.textContent || ''),
                        tags: [],
                    };
                });
            });

            items.push(...feedItems.filter(item => item.title));
        } catch (error) {
            console.error('Error fetching Bilibili content:', error);
        }

        return items;
    }
}
