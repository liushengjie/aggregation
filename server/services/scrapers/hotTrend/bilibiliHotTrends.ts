import { HotTrendBaseScraper, HotTrendScrapedItem, HotTrendCategory } from './hotTrendBase';

export class BilibiliHotTrendsScraper extends HotTrendBaseScraper {
    constructor() {
        super('Bilibili');
    }

    getCategories(): HotTrendCategory[] {
        return [
            { id: 'popular', name: '全站榜' },
            { id: 'anime', name: '番剧榜' },
            { id: 'gaming', name: '游戏榜' },
        ];
    }

    async scrape(categoryId: string): Promise<HotTrendScrapedItem[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const items: HotTrendScrapedItem[] = [];

        try {
            // Use Bilibili API for ranking data
            let apiUrl = '';
            let isPgc = false;

            switch (categoryId) {
                case 'popular':
                    apiUrl = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all';
                    break;
                case 'anime':
                    // PGC ranking API for Anime
                    apiUrl = 'https://api.bilibili.com/pgc/web/rank/list?day=3&season_type=1';
                    isPgc = true;
                    break;
                case 'gaming':
                    apiUrl = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=4&type=all';
                    break;
                default:
                    apiUrl = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all';
            }

            // Fetch API directly
            const response = await this.page.goto(apiUrl, { waitUntil: 'networkidle', timeout: 30000 });

            if (response) {
                const text = await response.text();
                const data = JSON.parse(text);

                if (isPgc) {
                    // Handle PGC API structure
                    if (data.code === 0 && data.result?.list) {
                        data.result.list.forEach((item: any, index: number) => {
                            if (index < 30) {
                                items.push({
                                    rank: index + 1,
                                    title: item.title || '',
                                    hotness: this.formatNumber(item.stat?.view || 0),
                                    url: item.url || `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
                                    extraData: {
                                        rating: item.rating,
                                        cover: item.cover,
                                        newEp: item.new_ep?.index_show,
                                    }
                                });
                            }
                        });
                    }
                } else {
                    // Handle UGC API structure
                    if (data.code === 0 && data.data?.list) {
                        data.data.list.forEach((item: any, index: number) => {
                            if (index < 30) {
                                items.push({
                                    rank: index + 1,
                                    title: item.title || '',
                                    hotness: this.formatNumber(item.stat?.view || 0),
                                    url: `https://www.bilibili.com/video/${item.bvid}`,
                                    extraData: {
                                        author: item.owner?.name || '',
                                        cover: item.pic || '',
                                        bvid: item.bvid || '',
                                    }
                                });
                            }
                        });
                    }
                }
            }

        } catch (error: any) {
            console.error(`[Bilibili] Scrape error for ${categoryId}:`, error.message);

            // Fallback: try scraping the webpage
            if (items.length === 0) {
                try {
                    await this.page.goto('https://www.bilibili.com/v/popular/rank/all', {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    await this.page.waitForTimeout(2000);

                    const fallbackItems = await this.page.$$eval('.rank-list .rank-item, .video-card', (elements) => {
                        return elements.slice(0, 30).map((el, index) => {
                            const titleEl = el.querySelector('.title, .info .title');
                            const viewEl = el.querySelector('.data-box, .play-num');

                            return {
                                rank: index + 1,
                                title: titleEl?.textContent?.trim() || '',
                                hotness: viewEl?.textContent?.trim() || '',
                                url: (el.querySelector('a') as HTMLAnchorElement)?.href || '',
                            };
                        });
                    });

                    items.push(...fallbackItems.filter(item => item.title));
                } catch (fallbackError: any) {
                    console.error(`[Bilibili] Fallback scrape also failed:`, fallbackError.message);
                }
            }
        }

        return items;
    }

    private formatNumber(num: number): string {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }
}
