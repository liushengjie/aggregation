import { BaseScraper, SocialItem, ScraperConfig } from './base';

const DOUYIN_CONFIG: ScraperConfig = {
    platform: 'Douyin',
    loginUrl: 'https://www.douyin.com/',
    homeUrl: 'https://www.douyin.com/',
};

export class DouyinScraper extends BaseScraper {
    constructor() {
        super(DOUYIN_CONFIG);
    }

    /**
     * Wait for Douyin login to complete
     */
    async waitForLogin(): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            // Wait for redirect to home page or user profile
            await this.page.waitForURL(/douyin\.com\/($|user\/|feed\/)/, {
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
     * Check if logged into Douyin
     */
    async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Check for user avatar or login button absence
            const userElement = await this.page.$('.avatar-wrapper, .user-avatar, [class*="avatar"]');
            const loginTrigger = await this.page.$('.login-button, .login-btn, [class*="login"]');
            return userElement !== null && loginTrigger === null;
        } catch {
            return false;
        }
    }

    /**
     * Fetch content from Douyin feed
     */
    async fetchContent(): Promise<SocialItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: SocialItem[] = [];

        try {
            // Navigate to home feed
            await this.page.goto('https://www.douyin.com/', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // Scroll to load more content
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.page.waitForTimeout(1500);
            }

            // Extract video items
            const feedItems = await this.page.$$eval('[class*="video-card"], [data-e2e*="video"], .feed-video-item', (elements) => {
                return elements.slice(0, 30).map((el, index) => {
                    const titleEl = el.querySelector('[class*="title"], [class*="desc"], [data-e2e*="title"]');
                    const authorEl = el.querySelector('[class*="author"], [class*="username"], [data-e2e*="author"]');
                    const coverEl = el.querySelector('img') as HTMLImageElement;
                    const linkEl = el.querySelector('a[href*="/video/"]') as HTMLAnchorElement;

                    // Get stats
                    const likeEl = el.querySelector('[class*="like"], [data-e2e*="like"], .digg-count');
                    const commentEl = el.querySelector('[class*="comment"], [data-e2e*="comment"], .comment-count');

                    const extractNumber = (text: string | null) => {
                        if (!text) return 0;
                        const match = text.match(/([\d.]+)/);
                        if (!match) return 0;
                        let num = parseFloat(match[1]);
                        if (text.includes('万') || text.includes('w')) num *= 10000;
                        if (text.includes('k') || text.includes('K')) num *= 1000;
                        return Math.floor(num);
                    };

                    const href = linkEl?.href || '';
                    const videoMatch = href.match(/\/video\/(\d+)/);
                    const externalId = videoMatch?.[1] || `douyin-${index}`;

                    return {
                        externalId: externalId,
                        title: titleEl?.textContent?.trim() || '',
                        author: authorEl?.textContent?.trim() || '',
                        thumbnail: coverEl?.src || '',
                        url: linkEl?.href || `https://www.douyin.com/video/${externalId}`,
                        likes: extractNumber(likeEl?.textContent || ''),
                        comments: extractNumber(commentEl?.textContent || ''),
                        shares: 0,
                        views: 0,
                        tags: [],
                    };
                });
            });

            items.push(...feedItems.filter(item => item.title));
        } catch (error) {
            console.error('Error fetching Douyin content:', error);
        }

        return items;
    }
}

