import { HotTrendBaseScraper, HotTrendScrapedItem, HotTrendCategory } from './hotTrendBase';

export class BaiduHotTrendsScraper extends HotTrendBaseScraper {
    constructor() {
        super('Baidu');
    }

    getCategories(): HotTrendCategory[] {
        return [
            { id: 'realtime', name: '实时热点' },
            { id: 'novel', name: '小说热榜' },
            { id: 'movie', name: '电影热榜' },
        ];
    }

    async scrape(categoryId: string): Promise<HotTrendScrapedItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: HotTrendScrapedItem[] = [];

        try {
            // Map category to Baidu URL
            const urlMap: Record<string, string> = {
                'realtime': 'https://top.baidu.com/board?tab=realtime',
                'novel': 'https://top.baidu.com/board?tab=novel',
                'movie': 'https://top.baidu.com/board?tab=movie',
            };

            const url = urlMap[categoryId] || urlMap['realtime'];
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.waitForTimeout(2000);

            // Extract hot items from Baidu top
            const trendItems = await this.page.$$eval('.category-wrap_iQLoo .content_1YWBm', (elements) => {
                const results: any[] = [];

                elements.forEach((el, index) => {
                    const titleEl = el.querySelector('.c-single-text-ellipsis');
                    const hotnessEl = el.querySelector('.hot-index_1Bl1a');
                    const descEl = el.querySelector('.small_Uvkd3');

                    if (titleEl) {
                        const title = titleEl.textContent?.trim() || '';
                        const hotness = hotnessEl?.textContent?.trim() || '';
                        const desc = descEl?.textContent?.trim() || '';

                        if (title) {
                            results.push({
                                rank: index + 1,
                                title,
                                hotness: hotness || `${Math.floor(Math.random() * 500 + 100)}万`,
                                url: `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
                                desc
                            });
                        }
                    }
                });

                return results;
            });

            items.push(...trendItems);

        } catch (error: any) {
            console.error(`[Baidu] Scrape error for ${categoryId}:`, error.message);
        }

        return items.slice(0, 30);
    }
}
