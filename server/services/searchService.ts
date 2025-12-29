/**
 * 搜索服务 - 保存搜索结果到数据库
 */

import { searchOps } from './database.js';

/**
 * 保存B站搜索结果到数据库
 */
export async function saveBilibiliSearchResults(keyword: string, page: number, results: any[]): Promise<void> {
    for (const result of results) {
        try {
            searchOps.insertBilibiliSearch.run(
                keyword,
                page,
                result.id,
                result.title || '',
                result.desc || null,
                result.author?.name || null,
                result.author?.mid || null,
                result.author?.avatar || null,
                result.author?.profileUrl || null,
                result.cover || null,
                result.duration || null,
                result.publishTime || null,
                result.url || '',
                result.type || 'video',
                result.stats?.views || 0,
                result.stats?.danmaku || 0,
                result.stats?.likes || 0,
                result.stats?.coins || 0,
                result.stats?.favorites || 0,
                result.stats?.shares || 0,
                result.stats?.replies || 0,
                result.tags ? JSON.stringify(result.tags) : null,
                result.bvid || null,
                result.aid || null
            );
        } catch (error: any) {
            console.error(`[SearchService] Error saving Bilibili search result: ${error.message}`);
        }
    }
}

/**
 * 保存微博搜索结果到数据库
 */
export async function saveWeiboSearchResults(keyword: string, page: number, results: any[]): Promise<void> {
    for (const result of results) {
        try {
            searchOps.insertWeiboSearch.run(
                keyword,
                page,
                result.id,
                result.text || '',
                result.author?.name || null,
                result.author?.avatar || null,
                result.author?.profileUrl || null,
                result.publishTime || null,
                result.publishFrom || null,
                result.url || '',
                result.images ? JSON.stringify(result.images) : null,
                result.video?.cover || null,
                result.video?.url || null,
                result.video?.duration || null,
                result.stats?.reposts || 0,
                result.stats?.comments || 0,
                result.stats?.likes || 0,
                result.stats?.views || 0,
                result.topics ? JSON.stringify(result.topics) : null,
                result.mentions ? JSON.stringify(result.mentions) : null,
                result.isRepost ? 1 : 0,
                result.originalWeibo?.id || null,
                result.originalWeibo?.text || null,
                result.originalWeibo?.author || null
            );
        } catch (error: any) {
            console.error(`[SearchService] Error saving Weibo search result: ${error.message}`);
        }
    }
}

/**
 * 保存小红书搜索结果到数据库
 */
export async function saveXiaohongshuSearchResults(keyword: string, page: number, results: any[]): Promise<void> {
    for (const result of results) {
        try {
            searchOps.insertXiaohongshuSearch.run(
                keyword,
                page,
                result.id,
                result.title || '',
                result.desc || null,
                result.author?.name || null,
                result.author?.avatar || null,
                result.author?.userId || null,
                result.cover || null,
                result.stats?.likes || 0,
                result.stats?.comments || 0,
                result.stats?.collects || 0,
                result.type || 'normal',
                result.url || ''
            );
        } catch (error: any) {
            console.error(`[SearchService] Error saving Xiaohongshu search result: ${error.message}`);
        }
    }
}

