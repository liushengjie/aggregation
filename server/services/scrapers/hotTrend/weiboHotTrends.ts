import { HotTrendBaseScraper, HotTrendScrapedItem, HotTrendCategory } from './hotTrendBase';

export class WeiboHotTrendsScraper extends HotTrendBaseScraper {
    constructor() {
        super('Weibo');
    }

    getCategories(): HotTrendCategory[] {
        return [
            { id: 'hot_search', name: '热搜榜' },
            { id: 'entertainment', name: '文娱榜' },
            { id: 'sports', name: '体育榜' },
            { id: 'news', name: '要闻榜' },
        ];
    }

    async scrape(categoryId: string): Promise<HotTrendScrapedItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: HotTrendScrapedItem[] = [];

        try {
            // Map category to Weibo URL
            const urlMap: Record<string, string> = {
                'hot_search': 'https://s.weibo.com/top/summary?cate=realtimehot',
                'entertainment': 'https://s.weibo.com/top/summary?cate=entrank',
                'sports': 'https://s.weibo.com/top/summary?cate=sportshot',
                'news': 'https://s.weibo.com/top/summary?cate=socialevent',
            };

            const url = urlMap[categoryId] || urlMap['hot_search'];
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.waitForTimeout(2000);

            // Try to extract from the hot search table
            const trendItems = await this.page.$$eval('#pl_top_realtimehot tbody tr, .td-02', (elements) => {
                const results: any[] = [];

                elements.forEach((el, index) => {
                    // For table rows
                    const rankEl = el.querySelector('.td-01') || el.querySelector('.ranktop');
                    const titleEl = el.querySelector('.td-02 a') || el.querySelector('a');
                    const hotnessEl = el.querySelector('.td-02 span') || el.querySelector('span');

                    if (titleEl) {
                        const rankText = rankEl?.textContent?.trim() || '';
                        const rank = parseInt(rankText) || (index + 1);
                        const title = titleEl.textContent?.trim() || '';
                        const hotness = hotnessEl?.textContent?.trim() || '';
                        const href = titleEl.getAttribute('href') || '';
                        const url = href.startsWith('http') ? href : `https://s.weibo.com${href}`;

                        if (title && rank <= 50) {
                            results.push({ rank, title, hotness, url });
                        }
                    }
                });

                return results;
            });

            // Deduplicate and sort
            const seen = new Set<string>();
            for (const item of trendItems) {
                if (!seen.has(item.title) && item.title) {
                    seen.add(item.title);
                    items.push(item);
                }
            }

            items.sort((a, b) => a.rank - b.rank);

        } catch (error: any) {
            console.error(`[Weibo] Scrape error for ${categoryId}:`, error.message);
        }

        return items.slice(0, 30); // Return top 30
    }
}
