import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';

export interface HotTrendScrapedItem {
    rank: number;
    title: string;
    hotness: string;
    url: string;
    extraData?: Record<string, any>;
}

export interface HotTrendCategory {
    id: string;
    name: string;
}

export abstract class HotTrendBaseScraper {
    protected browser: Browser | null = null;
    protected context: BrowserContext | null = null;
    protected page: Page | null = null;
    protected platform: string;

    constructor(platform: string) {
        this.platform = platform;
    }

    /**
     * Initialize browser for scraping
     */
    async init(cookies?: Cookie[]): Promise<void> {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--disable-blink-features=AutomationControlled'],
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        if (cookies && cookies.length > 0) {
            await this.context.addCookies(cookies);
        }

        this.page = await this.context.newPage();
    }

    /**
     * Close browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }

    /**
     * Get available categories for this platform
     */
    abstract getCategories(): HotTrendCategory[];

    /**
     * Scrape hot trends for a specific category
     */
    abstract scrape(categoryId: string): Promise<HotTrendScrapedItem[]>;

    /**
     * Scrape all categories for this platform
     */
    async scrapeAll(): Promise<Map<string, HotTrendScrapedItem[]>> {
        const results = new Map<string, HotTrendScrapedItem[]>();
        const categories = this.getCategories();

        for (const category of categories) {
            try {
                console.log(`[${this.platform}] Scraping category: ${category.name}`);
                const items = await this.scrape(category.id);
                results.set(category.id, items);
                console.log(`[${this.platform}] Got ${items.length} items for ${category.name}`);

                // Small delay between categories to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: any) {
                console.error(`[${this.platform}] Error scraping ${category.name}:`, error.message);
                results.set(category.id, []);
            }
        }

        return results;
    }

    /**
     * Helper to safely extract text content
     */
    protected async safeTextContent(selector: string): Promise<string | null> {
        if (!this.page) return null;
        try {
            const element = await this.page.$(selector);
            if (element) {
                return await element.textContent();
            }
        } catch {
            // ignore
        }
        return null;
    }
}
