import { hotTrendOps } from './database';

export interface HotTrendItem {
    rank: number;
    title: string;
    hotness: string;
    url: string;
    category?: string;
    extraData?: Record<string, any>;
}

export interface PlatformHotTrends {
    platform: string;
    categories: {
        id: string;
        name: string;
        items: HotTrendItem[];
    }[];
}

// Category definitions for each platform
const PLATFORM_CATEGORIES: Record<string, { id: string, name: string }[]> = {
    'Weibo': [
        { id: 'hot_search', name: '热搜榜' },
        { id: 'entertainment', name: '文娱榜' },
        { id: 'sports', name: '体育榜' },
        { id: 'news', name: '要闻榜' }
    ],
    'Douyin': [
        { id: 'popular', name: '热榜' },
        { id: 'entertainment', name: '娱乐榜' },
        { id: 'social', name: '社会榜' }
    ],
    'Baidu': [
        { id: 'realtime', name: '实时热点' },
        { id: 'novel', name: '小说热榜' },
        { id: 'movie', name: '电影热榜' }
    ],
    'Bilibili': [
        { id: 'popular', name: '全站榜' },
        { id: 'anime', name: '番剧榜' },
        { id: 'gaming', name: '游戏榜' }
    ]
};

class HotTrendService {
    /**
     * Get hot trends from database
     */
    async getHotTrends(platform: string, categoryId?: string): Promise<HotTrendItem[]> {
        try {
            const categories = PLATFORM_CATEGORIES[platform] || [];
            const targetCategory = categoryId || categories[0]?.id || 'popular';

            // Query database for all hot trends (no batch filtering - returns all items for the platform/category)
            const items = hotTrendOps.findLatest.all(platform, targetCategory) as any[];

            // Log query results for debugging
            if (items && items.length > 0) {
                console.log(`[HotTrendService] Found ${items.length} items for ${platform}/${targetCategory}`);
                return items.map(item => ({
                    rank: item.rank,
                    title: item.title,
                    hotness: item.hotness || '',
                    url: item.url || '',
                    category: item.category_id,
                    extraData: item.extra_data ? JSON.parse(item.extra_data) : undefined,
                }));
            }

            // Return empty array if no data in database
            console.log(`[HotTrendService] No items found for ${platform}/${targetCategory}`);
            return [];
        } catch (error) {
            console.error(`[HotTrendService] Error getting hot trends for ${platform}/${categoryId}:`, error);
            return [];
        }
    }

    /**
     * Get platform categories
     */
    getPlatformCategories(platform: string) {
        return PLATFORM_CATEGORIES[platform] || [];
    }

    /**
     * Get last fetch time for a platform/category
     */
    getLastFetchTime(platform: string, categoryId: string): Date | null {
        try {
            const result = hotTrendOps.getLatestFetchTime.get(platform, categoryId) as { latest: string } | undefined;
            if (result?.latest) {
                return new Date(result.latest);
            }
        } catch (error) {
            console.error(`[HotTrendService] Error getting last fetch time:`, error);
        }
        return null;
    }

    /**
     * Check if data exists for a platform
     */
    hasData(platform: string): boolean {
        try {
            const categories = PLATFORM_CATEGORIES[platform] || [];
            if (categories.length === 0) return false;

            const items = hotTrendOps.findLatest.all(platform, categories[0].id) as any[];
            return items && items.length > 0;
        } catch (error) {
            return false;
        }
    }
}

export const hotTrendService = new HotTrendService();
