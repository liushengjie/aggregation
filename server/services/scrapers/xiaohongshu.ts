import { BaseScraper, SocialItem, ScraperConfig } from './base';

const XIAOHONGSHU_CONFIG: ScraperConfig = {
    platform: 'Xiaohongshu',
    loginUrl: 'https://www.xiaohongshu.com/explore',
    homeUrl: 'https://www.xiaohongshu.com/explore',
};

export class XiaohongshuScraper extends BaseScraper {
    constructor() {
        super(XIAOHONGSHU_CONFIG);
    }

    /**
     * Wait for Xiaohongshu login to complete
     */
    async waitForLogin(): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            // Xiaohongshu uses modal login, wait for modal to close
            await this.page.waitForFunction(() => {
                const modal = document.querySelector('.login-container, .qrcode-container');
                return !modal;
            }, { timeout: 300000 });

            await this.page.waitForTimeout(2000);
            return await this.isLoggedIn();
        } catch (error) {
            console.error('Login timeout or error:', error);
            return false;
        }
    }

    /**
     * Check if logged into Xiaohongshu
     */
    async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Check for user avatar or login trigger absence
            const userElement = await this.page.$('.user-avatar, .header-user-icon');
            const loginTrigger = await this.page.$('.login-btn, .login-container');
            return userElement !== null && loginTrigger === null;
        } catch {
            return false;
        }
    }

    /**
     * Fetch content from Xiaohongshu feed
     */
    async fetchContent(): Promise<SocialItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: SocialItem[] = [];

        try {
            // Navigate to explore page
            await this.page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // Scroll to load more content
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.page.waitForTimeout(1500);
            }

            // Extract note cards
            const feedItems = await this.page.$$eval('.note-item, .feed-item, section[class*="note"]', (elements) => {
                return elements.slice(0, 30).map((el, index) => {
                    const titleEl = el.querySelector('.title, .note-title, span[class*="title"]');
                    const authorEl = el.querySelector('.name, .author-name, span[class*="name"]');
                    const coverEl = el.querySelector('img') as HTMLImageElement;
                    const linkEl = el.querySelector('a[href*="/explore/"]') as HTMLAnchorElement;

                    // Get stats
                    const likeEl = el.querySelector('.like-count, .like-wrapper span, .count');

                    const extractNumber = (text: string | null) => {
                        if (!text) return 0;
                        const match = text.match(/([\d.]+)/);
                        if (!match) return 0;
                        let num = parseFloat(match[1]);
                        if (text.includes('万')) num *= 10000;
                        return Math.floor(num);
                    };

                    return {
                        externalId: linkEl?.href?.match(/\/explore\/(\w+)/)?.[1] || `xhs-${index}`,
                        title: titleEl?.textContent?.trim() || '',
                        author: authorEl?.textContent?.trim() || '',
                        thumbnail: coverEl?.src || '',
                        url: linkEl?.href || '',
                        likes: extractNumber(likeEl?.textContent || ''),
                        comments: 0,
                        shares: 0,
                        views: 0,
                        tags: [],
                    };
                });
            });

            items.push(...feedItems.filter(item => item.title));
        } catch (error) {
            console.error('Error fetching Xiaohongshu content:', error);
        }

        return items;
    }
}
