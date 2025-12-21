import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';

export type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';

export interface SocialItem {
    externalId: string;
    title: string;
    author: string;
    thumbnail: string;
    url: string;
    content?: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    tags: string[];
}

export interface ScraperConfig {
    platform: Platform;
    loginUrl: string;
    homeUrl: string;
}

export abstract class BaseScraper {
    protected browser: Browser | null = null;
    protected context: BrowserContext | null = null;
    protected page: Page | null = null;
    protected config: ScraperConfig;

    constructor(config: ScraperConfig) {
        this.config = config;
    }

    /**
     * Initialize the browser instance
     */
    async init(headless: boolean = false): Promise<void> {
        this.browser = await chromium.launch({
            headless,
            args: ['--disable-blink-features=AutomationControlled'],
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        this.page = await this.context.newPage();
    }

    /**
     * Navigate to login page and wait for user to complete login
     */
    async openLoginPage(): Promise<void> {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.goto(this.config.loginUrl);
        console.log(`Opened login page for ${this.config.platform}`);
        console.log('Please complete the login manually in the browser window...');
    }

    /**
     * Wait for login to complete (subclass should override to detect login success)
     */
    abstract waitForLogin(): Promise<boolean>;

    /**
     * Get cookies after successful login
     */
    async getCookies(): Promise<Cookie[]> {
        if (!this.context) throw new Error('Browser context not initialized');
        return await this.context.cookies();
    }

    /**
     * Set cookies (for resuming session)
     */
    async setCookies(cookies: Cookie[]): Promise<void> {
        if (!this.context) throw new Error('Browser context not initialized');
        await this.context.addCookies(cookies);
    }

    /**
     * Fetch content from the platform
     */
    abstract fetchContent(): Promise<SocialItem[]>;

    /**
     * Check if logged in
     */
    abstract isLoggedIn(): Promise<boolean>;

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}
