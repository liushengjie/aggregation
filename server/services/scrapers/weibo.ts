import { BaseScraper, SocialItem, ScraperConfig } from './base';

const WEIBO_CONFIG: ScraperConfig = {
    platform: 'Weibo',
    loginUrl: 'https://weibo.com/login.php',
    homeUrl: 'https://weibo.com',
};

export class WeiboScraper extends BaseScraper {
    constructor() {
        super(WEIBO_CONFIG);
    }

    /**
     * Wait for Weibo login to complete
     */
    async waitForLogin(): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            // Wait for redirect to home page or user profile
            await this.page.waitForURL(/weibo\.com\/(u\/|home|$)/, {
                timeout: 300000, // 5 minutes for manual login
            });

            // Additional check for login success
            await this.page.waitForTimeout(2000);
            return await this.isLoggedIn();
        } catch (error) {
            console.error('Login timeout or error:', error);
            return false;
        }
    }

    /**
     * Check if logged into Weibo
     */
    async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Check for user avatar or login button
            const userElement = await this.page.$('.gn_name, .NavBar_avatar');
            return userElement !== null;
        } catch {
            return false;
        }
    }

    /**
     * Fetch content from Weibo feed
     */
    async fetchContent(): Promise<SocialItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: SocialItem[] = [];

        try {
            // Navigate to home feed
            await this.page.goto('https://weibo.com', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // Scroll to load more content
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.page.waitForTimeout(1500);
            }

            // Extract feed items
            const feedItems = await this.page.$$eval('.Feed_wrap_3NP5t, .WB_card, .vue-recycle-scroller__item-view', (elements) => {
                return elements.slice(0, 30).map((el, index) => {
                    const titleEl = el.querySelector('.woo-lg-cut-2, .WB_text, .Detail_content');
                    const authorEl = el.querySelector('.head_name_24eEB, .WB_info a, .head-info_name');
                    const avatarEl = el.querySelector('.woo-avatar-img, .WB_face img, .head_avatar') as HTMLImageElement;
                    const linkEl = el.querySelector('a[href*="/status/"]') as HTMLAnchorElement;

                    // Get stats
                    const likeEl = el.querySelector('[title*="赞"], .WB_like, .toolbar_like');
                    const commentEl = el.querySelector('[title*="评论"], .WB_comment, .toolbar_comment');
                    const shareEl = el.querySelector('[title*="转发"], .WB_forward, .toolbar_repost');

                    const extractNumber = (text: string | null) => {
                        if (!text) return 0;
                        const match = text.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    };

                    return {
                        externalId: linkEl?.href?.match(/\/status\/(\d+)/)?.[1] || `weibo-${index}`,
                        title: titleEl?.textContent?.trim() || '',
                        author: authorEl?.textContent?.trim() || '',
                        thumbnail: avatarEl?.src || '',
                        url: linkEl?.href || '',
                        likes: extractNumber(likeEl?.textContent || ''),
                        comments: extractNumber(commentEl?.textContent || ''),
                        shares: extractNumber(shareEl?.textContent || ''),
                        views: 0,
                        tags: [],
                    };
                });
            });

            items.push(...feedItems.filter(item => item.title));
        } catch (error) {
            console.error('Error fetching Weibo content:', error);
        }

        return items;
    }
}
