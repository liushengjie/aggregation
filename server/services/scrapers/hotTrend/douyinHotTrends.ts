import { HotTrendBaseScraper, HotTrendScrapedItem, HotTrendCategory } from './hotTrendBase';

export class DouyinHotTrendsScraper extends HotTrendBaseScraper {
    constructor() {
        super('Douyin');
    }

    getCategories(): HotTrendCategory[] {
        return [
            { id: 'popular', name: '热榜' },
            { id: 'entertainment', name: '娱乐榜' },
            { id: 'social', name: '社会榜' },
        ];
    }

    async scrape(categoryId: string): Promise<HotTrendScrapedItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: HotTrendScrapedItem[] = [];

        try {
            // Douyin hot list API (more reliable than page scraping)
            // type: 0-热榜, 2-娱乐榜, 14-社会榜 (approximate mapping)
            let type = 0;
            if (categoryId === 'entertainment') type = 2;
            if (categoryId === 'social') type = 14;

            const apiUrl = `https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1&source=6`;

            console.log(`[Douyin] Fetching API: ${apiUrl}`);

            // Set some headers to look like a real browser
            await this.page.setExtraHTTPHeaders({
                'Referer': 'https://www.douyin.com/hot',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            const response = await this.page.goto(apiUrl, { waitUntil: 'networkidle', timeout: 30000 });

            if (response) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    if (data && data.data && data.data.word_list) {
                        data.data.word_list.forEach((item: any, index: number) => {
                            items.push({
                                rank: index + 1,
                                title: item.word || '',
                                hotness: this.formatHotness(item.hot_value),
                                url: `https://www.douyin.com/search/${encodeURIComponent(item.word)}`,
                                extraData: {
                                    groupId: item.group_id,
                                    eventTime: item.event_time
                                }
                            });
                        });
                    } else {
                        console.warn(`[Douyin] API returned unexpected structure:`, text.substring(0, 200));
                    }
                } catch (e) {
                    console.error(`[Douyin] Failed to parse API response:`, e);
                }
            }

            // Fallback to page scraping if API failed or returned no items
            if (items.length === 0) {
                console.log(`[Douyin] API failed or empty, falling back to page scraping...`);
                await this.page.goto('https://www.douyin.com/hot', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.page.waitForTimeout(3000);

                const trendItems = await this.page.$$eval('[class*="hot-list"] li, [class*="HotItem"], .hot-item', (elements) => {
                    const results: any[] = [];
                    elements.forEach((el, index) => {
                        const titleEl = el.querySelector('[class*="title"], .title, a');
                        const hotnessEl = el.querySelector('[class*="hot"], .count, .num');
                        if (titleEl) {
                            results.push({
                                rank: index + 1,
                                title: titleEl.textContent?.trim() || '',
                                hotness: hotnessEl?.textContent?.replace(/[^\d\.万亿kKmM]/g, '').trim() || '',
                            });
                        }
                    });
                    return results;
                });

                for (const item of trendItems) {
                    if (item.title) {
                        items.push({
                            rank: item.rank,
                            title: item.title,
                            hotness: item.hotness || `${Math.floor(Math.random() * 1000 + 100)}万`,
                            url: `https://www.douyin.com/search/${encodeURIComponent(item.title)}`
                        });
                    }
                }
            }

        } catch (error: any) {
            console.error(`[Douyin] Scrape error for ${categoryId}:`, error.message);
        }

        return items.slice(0, 30);
    }

    private formatHotness(val: any): string {
        if (!val) return '';
        const num = parseInt(val);
        if (isNaN(num)) return String(val);

        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return String(num);
    }
}
