// TMDB API 服务
// 使用 The Movie Database 作为数据源
// 限流: 40 请求/10秒

import type { MaoyanMovieItem, MaoyanMovieListResponse, MaoyanWebSeriesItem, MaoyanWebSeriesListResponse } from './scrapers/hotDrama/maoyanScraper.js';
import { refreshMaoyanData } from './schedulers/hotDramaSchedulerService.js';
import { scrapeWeiboSearch } from './scrapers/search/weiboSearchScraper.js';
import { scrapeXiaohongshuSearch } from './scrapers/search/xiaohongshuSearchScraper.js';
import { scrapeBilibiliSearch } from './scrapers/search/bilibiliSearchScraper.js';
import { saveBilibiliSearchResults, saveWeiboSearchResults, saveXiaohongshuSearchResults } from './searchService.js';
import { searchOps, maoyanOps } from './database.js';
import { scrapeMaoyanWebSeriesList, scrapeMaoyanVarietyList } from './scrapers/hotDrama/maoyanScraper.js';

const TMDB_API_KEY = '9d0a3769b77fee44cfbf912cd84e62f1';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 简单限流：每秒最多 3 个请求（保守值）
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledFetch(url: string, timeoutMs: number): Promise<Response | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    return null;
  }
}

interface MovieResult {
  id: string;
  title: string;
  original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  vote_average: number | null;
  media_type: 'movie' | 'tv';
}

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: string;
}

/**
 * 搜索 TMDB 电影/电视剧（多类型搜索）
 */
export const searchTMDB = async (query: string, timeoutMs: number = 10000): Promise<MovieResult | null> => {
  if (!TMDB_API_KEY) {
    console.error('[TMDB] API key not configured');
    return null;
  }

  try {
    // 清理搜索词
    const cleanQuery = query
      .replace(/第[一二三四五六七八九十\d]+季/g, '')
      .replace(/Season\s*\d+/gi, '')
      .replace(/S\d+/gi, '')
      .replace(/\s*\d+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 使用 multi search 同时搜索电影和电视剧
    const searchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanQuery)}&language=zh-CN&page=1`;

    const response = await throttledFetch(searchUrl, timeoutMs);

    if (!response || !response.ok) {
      return null;
    }

    const data = await response.json();
    const results: TMDBSearchResult[] = data.results || [];

    // 只取电影和电视剧结果
    const filtered = results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');

    if (filtered.length === 0) {
      return null;
    }

    const first = filtered[0];
    const isMovie = first.media_type === 'movie';

    const result: MovieResult = {
      id: String(first.id),
      title: (isMovie ? first.title : first.name) || query,
      original_title: (isMovie ? first.original_title : first.original_name) || null,
      poster_path: first.poster_path ? `https://image.tmdb.org/t/p/w500${first.poster_path}` : null,
      backdrop_path: first.backdrop_path ? `https://image.tmdb.org/t/p/w780${first.backdrop_path}` : null,
      overview: first.overview || null,
      release_date: (isMovie ? first.release_date : first.first_air_date) || null,
      vote_average: first.vote_average || null,
      media_type: isMovie ? 'movie' : 'tv'
    };

    return result;

  } catch (error: any) {
    return null;
  }
};

/**
 * 根据 TMDB ID 获取详细信息
 */
export const getTMDBDetails = async (id: number, type: 'movie' | 'tv', timeoutMs: number = 10000): Promise<MovieResult | null> => {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const detailUrl = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=zh-CN`;

    const response = await throttledFetch(detailUrl, timeoutMs);

    if (!response || !response.ok) {
      return null;
    }

    const data = await response.json();
    const isMovie = type === 'movie';

    return {
      id: String(data.id),
      title: (isMovie ? data.title : data.name) || '',
      original_title: (isMovie ? data.original_title : data.original_name) || null,
      poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null,
      overview: data.overview || null,
      release_date: (isMovie ? data.release_date : data.first_air_date) || null,
      vote_average: data.vote_average || null,
      media_type: type
    };

  } catch (error: any) {
    return null;
  }
};

// 兼容旧接口名称
export const searchDouban = searchTMDB;
export const searchMaoyan = searchTMDB;
export const getDoubanDetails = async (id: string, timeoutMs?: number) => getTMDBDetails(parseInt(id), 'movie', timeoutMs);
export const getMaoyanDetails = getDoubanDetails;

// 清理函数（HTTP API 不需要清理）
export const cleanup = async () => { };

// ============================================
// 猫眼数据服务
// ============================================

import { scrapeMaoyanMovieList } from './scrapers/hotDrama/maoyanScraper.js';

/**
 * 将猫眼电影数据保存到数据库
 * @param movies 电影列表数据
 * @returns 保存的电影数量
 */
export async function saveMaoyanMoviesToDatabase(movies: MaoyanMovieItem[]): Promise<number> {
  try {
    if (movies.length === 0) {
      console.log('[MaoyanService] No movies to save');
      return 0;
    }

    // 先删除所有旧数据
    maoyanOps.deleteAllMovieList.run();

    // 保存新数据到数据库
    const fetchedAt = new Date().toISOString();
    for (const movie of movies) {
      maoyanOps.insertMovie.run(
        movie.movieId,
        movie.title,
        movie.releaseInfo || null,
        movie.boxOffice || null,
        movie.boxOfficeUnit || null,
        movie.sumBoxDesc || null,
        movie.sumSplitBoxDesc || null,
        movie.boxRate || null,
        movie.boxSplitRate || null,
        movie.showCount || null,
        movie.showCountRate || null,
        movie.avgSeatView || null,
        movie.avgShowView || null,
        fetchedAt
      );
    }

    console.log(`[MaoyanService] Successfully saved ${movies.length} movies to database`);
    return movies.length;
  } catch (error: any) {
    console.error('[MaoyanService] Error saving movies to database:', error.message);
    throw error;
  }
}

/**
 * 刷新猫眼数据:抓取并保存到数据库
 * @returns 抓取和保存的结果
 */
export async function refreshAndSaveMaoyanData(): Promise<{
  success: boolean;
  total: number;
  movies: MaoyanMovieItem[];
  error?: string;
}> {
  try {
    console.log('[MaoyanService] Starting Maoyan data refresh...');

    // 调用爬虫抓取数据
    const result = await scrapeMaoyanMovieList();

    if (result.movies.length > 0) {
      // 保存到数据库
      await saveMaoyanMoviesToDatabase(result.movies);

      return {
        success: true,
        total: result.total,
        movies: result.movies
      };
    } else {
      return {
        success: false,
        total: 0,
        movies: [],
        error: 'No movies fetched'
      };
    }
  } catch (error: any) {
    console.error('[MaoyanService] Error refreshing Maoyan data:', error.message);
    return {
      success: false,
      total: 0,
      movies: [],
      error: error.message
    };
  }
}

/**
 * 从数据库加载猫眼电影列表数据
 */
function loadMaoyanMovieListFromDatabase(): MaoyanMovieItem[] {
  try {
    const rows = maoyanOps.getLatestMovieList.all() as Array<{
      movieId: string;
      title: string;
      releaseInfo: string | null;
      boxOffice: number | null;
      boxOfficeUnit: string | null;
      sumBoxDesc: string | null;
      sumSplitBoxDesc: string | null;
      boxRate: string | null;
      boxSplitRate: string | null;
      showCount: number | null;
      showCountRate: string | null;
      avgSeatView: string | null;
      avgShowView: string | null;
      fetchedAt: string;
    }>;

    return rows.map(row => ({
      movieId: row.movieId,
      title: row.title,
      releaseInfo: row.releaseInfo || undefined,
      boxOffice: row.boxOffice ?? undefined,
      boxOfficeUnit: row.boxOfficeUnit || undefined,
      sumBoxDesc: row.sumBoxDesc || undefined,
      sumSplitBoxDesc: row.sumSplitBoxDesc || undefined,
      boxRate: row.boxRate || undefined,
      boxSplitRate: row.boxSplitRate || undefined,
      showCount: row.showCount ?? undefined,
      showCountRate: row.showCountRate || undefined,
      avgSeatView: row.avgSeatView || undefined,
      avgShowView: row.avgShowView || undefined,
      fetchedAt: row.fetchedAt,
    }));
  } catch (error: any) {
    console.error('[MaoyanService] Error loading movie list from database:', error.message);
    return [];
  }
}

/**
 * 获取猫眼电影列表（直接从数据库读取）
 * @param forceRefresh 是否强制刷新
 */
export async function getMaoyanMovieList(forceRefresh: boolean = true): Promise<MaoyanMovieItem[]> {
  // 如果强制刷新，触发抓取
  if (forceRefresh) {
    console.log('[MaoyanService] Force refresh requested, triggering scrape...');
    const { refreshMaoyanData } = await import('./schedulers/hotDramaSchedulerService.js');
    await refreshMaoyanData();
  }

  // 直接从数据库读取
  return loadMaoyanMovieListFromDatabase();
}

// 频率控制：记录上次请求时间
let lastWeiboRequestTime: number = 0;
let lastXiaohongshuRequestTime: number = 0;
let lastBilibiliRequestTime: number = 0;

// 各平台的最小请求间隔（毫秒）
const WEIBO_REQUEST_INTERVAL =5000; // 微博：5秒（降低验证码风险）
const XIAOHONGSHU_REQUEST_INTERVAL = 2000; // 小红书：2秒
const BILIBILI_REQUEST_INTERVAL = 2000; // B站：2秒

/**
 * 频率控制：确保请求间隔
 */
async function rateLimitWeibo(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastWeiboRequestTime;
    if (elapsed < WEIBO_REQUEST_INTERVAL) {
        const waitTime = WEIBO_REQUEST_INTERVAL - elapsed;
        console.log(`[MaoyanService] 微博请求限速：等待 ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastWeiboRequestTime = Date.now();
}

async function rateLimitXiaohongshu(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastXiaohongshuRequestTime;
    if (elapsed < XIAOHONGSHU_REQUEST_INTERVAL) {
        const waitTime = XIAOHONGSHU_REQUEST_INTERVAL - elapsed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastXiaohongshuRequestTime = Date.now();
}

async function rateLimitBilibili(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastBilibiliRequestTime;
    if (elapsed < BILIBILI_REQUEST_INTERVAL) {
        const waitTime = BILIBILI_REQUEST_INTERVAL - elapsed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastBilibiliRequestTime = Date.now();
}

/**
 * 搜索并保存电影相关的讨论
 */
export async function searchAndSaveMovieDiscussions(movies: MaoyanMovieItem[]): Promise<void> {
    console.log(`[MaoyanService] Starting to search discussions for ${movies.length} movies...`);
    
    for (const movie of movies) {
        const movieId = movie.movieId;
        const movieTitle = movie.title;
        
        try {
            // 检查是否已有搜索结果
            const hasWeibo = (searchOps.hasMovieSearchResults.get(movieId, 'weibo') as { count: number })?.count || 0;
            const hasXiaohongshu = (searchOps.hasMovieSearchResults.get(movieId, 'xiaohongshu') as { count: number })?.count || 0;
            const hasBilibili = (searchOps.hasMovieSearchResults.get(movieId, 'bilibili') as { count: number })?.count || 0;
            
            // 1. 微博搜索（电影名称）
            if (hasWeibo === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitWeibo();
                    console.log(`[MaoyanService] Searching Weibo for: ${movieTitle}`);
                    const weiboResult = await scrapeWeiboSearch(movieTitle, { page: 1, limit: 20 });
                    if (weiboResult.results.length > 0) {
                        await saveWeiboSearchResults(movieTitle, 1, weiboResult.results);
                        searchOps.insertMovieSearchRelation.run(
                            movieId,
                            movieTitle,
                            'weibo',
                            movieTitle,
                            'movie',
                            weiboResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${weiboResult.results.length} Weibo results for ${movieTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Weibo for ${movieTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Weibo search for ${movieTitle} (already exists)`);
            }
            
            // 2. 小红书搜索（电影名称）
            if (hasXiaohongshu === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitXiaohongshu();
                    console.log(`[MaoyanService] Searching Xiaohongshu for: ${movieTitle}`);
                    const xhsResult = await scrapeXiaohongshuSearch(movieTitle, { page: 1, limit: 20 });
                    if (xhsResult.results.length > 0) {
                        await saveXiaohongshuSearchResults(movieTitle, 1, xhsResult.results);
                        searchOps.insertMovieSearchRelation.run(
                            movieId,
                            movieTitle,
                            'xiaohongshu',
                            movieTitle,
                            'movie',
                            xhsResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${xhsResult.results.length} Xiaohongshu results for ${movieTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Xiaohongshu for ${movieTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Xiaohongshu search for ${movieTitle} (already exists)`);
            }
            
            // 3. B站搜索（电影名称 + "解说"）
            if (hasBilibili === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitBilibili();
                    const bilibiliKeyword = `${movieTitle} 解说`;
                    console.log(`[MaoyanService] Searching Bilibili for: ${bilibiliKeyword}`);
                    const biliResult = await scrapeBilibiliSearch(bilibiliKeyword, { page: 1, limit: 20, searchType: 'video' });
                    if (biliResult.results.length > 0) {
                        await saveBilibiliSearchResults(bilibiliKeyword, 1, biliResult.results);
                        searchOps.insertMovieSearchRelation.run(
                            movieId,
                            movieTitle,
                            'bilibili',
                            bilibiliKeyword,
                            'video',
                            biliResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${biliResult.results.length} Bilibili results for ${bilibiliKeyword}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Bilibili for ${movieTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Bilibili search for ${movieTitle} (already exists)`);
            }
            
        } catch (error: any) {
            console.error(`[MaoyanService] Error processing movie ${movieTitle}: ${error.message}`);
        }
    }
    
    console.log(`[MaoyanService] Finished searching discussions for all movies`);
}

/**
 * 搜索并保存网播热剧相关的讨论
 */
export async function searchAndSaveWebSeriesDiscussions(series: MaoyanWebSeriesItem[]): Promise<void> {
    console.log(`[MaoyanService] Starting to search discussions for ${series.length} web series...`);
    
    for (const item of series) {
        const seriesId = item.seriesId;
        const seriesTitle = item.title;
        
        try {
            // 检查是否已有搜索结果
            const hasWeibo = (searchOps.hasSeriesSearchResults.get(seriesId, 'weibo') as { count: number })?.count || 0;
            const hasXiaohongshu = (searchOps.hasSeriesSearchResults.get(seriesId, 'xiaohongshu') as { count: number })?.count || 0;
            const hasBilibili = (searchOps.hasSeriesSearchResults.get(seriesId, 'bilibili') as { count: number })?.count || 0;
            
            // 1. 微博搜索（剧集名称）
            if (hasWeibo === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitWeibo();
                    console.log(`[MaoyanService] Searching Weibo for web series: ${seriesTitle}`);
                    const weiboResult = await scrapeWeiboSearch(seriesTitle, { page: 1, limit: 20 });
                    if (weiboResult.results.length > 0) {
                        await saveWeiboSearchResults(seriesTitle, 1, weiboResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            seriesTitle,
                            'weibo',
                            seriesTitle,
                            'webSeries',
                            weiboResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${weiboResult.results.length} Weibo results for ${seriesTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Weibo for ${seriesTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Weibo search for ${seriesTitle} (already exists)`);
            }
            
            // 2. 小红书搜索（剧集名称）
            if (hasXiaohongshu === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitXiaohongshu();
                    console.log(`[MaoyanService] Searching Xiaohongshu for web series: ${seriesTitle}`);
                    const xhsResult = await scrapeXiaohongshuSearch(seriesTitle, { page: 1, limit: 20 });
                    if (xhsResult.results.length > 0) {
                        await saveXiaohongshuSearchResults(seriesTitle, 1, xhsResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            seriesTitle,
                            'xiaohongshu',
                            seriesTitle,
                            'webSeries',
                            xhsResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${xhsResult.results.length} Xiaohongshu results for ${seriesTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Xiaohongshu for ${seriesTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Xiaohongshu search for ${seriesTitle} (already exists)`);
            }
            
            // 3. B站搜索（剧集名称）
            if (hasBilibili === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitBilibili();
                    console.log(`[MaoyanService] Searching Bilibili for web series: ${seriesTitle}`);
                    const biliResult = await scrapeBilibiliSearch(seriesTitle, { page: 1, limit: 20, searchType: 'video' });
                    if (biliResult.results.length > 0) {
                        await saveBilibiliSearchResults(seriesTitle, 1, biliResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            seriesTitle,
                            'bilibili',
                            seriesTitle,
                            'webSeries',
                            biliResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${biliResult.results.length} Bilibili results for ${seriesTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Bilibili for ${seriesTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Bilibili search for ${seriesTitle} (already exists)`);
            }
            
        } catch (error: any) {
            console.error(`[MaoyanService] Error processing web series ${seriesTitle}: ${error.message}`);
        }
    }
    
    console.log(`[MaoyanService] Finished searching discussions for all web series`);
}

/**
 * 保存网播热剧列表到数据库
 */
export async function saveMaoyanWebSeriesToDatabase(series: MaoyanWebSeriesItem[]): Promise<number> {
  try {
    if (series.length === 0) {
      console.log('[MaoyanService] No web series to save');
      return 0;
    }

    // 先删除所有旧数据
    maoyanOps.deleteAllWebSeriesList.run();

    // 保存新数据到数据库
    const fetchedAt = new Date().toISOString();
    for (const item of series) {
      maoyanOps.insertWebSeries.run(
        item.seriesId,
        item.title,
        item.currHeat || null,
        item.currHeatDesc || null,
        item.platformDesc || null,
        item.releaseInfo || null,
        item.category || null,
        item.imgUrl || null,
        item.type || 'webSeries',
        fetchedAt
      );
    }

    console.log(`[MaoyanService] Successfully saved ${series.length} web series to database`);
    return series.length;
  } catch (error: any) {
    console.error('[MaoyanService] Error saving web series to database:', error.message);
    throw error;
  }
}

/**
 * 刷新网播热剧数据:抓取并保存到数据库
 */
export async function refreshAndSaveMaoyanWebSeriesData(): Promise<{
  success: boolean;
  total: number;
  series: MaoyanWebSeriesItem[];
  error?: string;
}> {
  try {
    console.log('[MaoyanService] Starting Maoyan web series data refresh...');

    // 调用爬虫抓取数据
    const result = await scrapeMaoyanWebSeriesList();

    if (result.series.length > 0) {
      // 保存到数据库
      await saveMaoyanWebSeriesToDatabase(result.series);

      return {
        success: true,
        total: result.total,
        series: result.series
      };
    } else {
      return {
        success: false,
        total: 0,
        series: [],
        error: 'No web series fetched'
      };
    }
  } catch (error: any) {
    console.error('[MaoyanService] Error refreshing Maoyan web series data:', error.message);
    return {
      success: false,
      total: 0,
      series: [],
      error: error.message
    };
  }
}

/**
 * 从数据库加载网播热剧列表数据
 */
function loadMaoyanWebSeriesListFromDatabase(): MaoyanWebSeriesItem[] {
  try {
    const rows = maoyanOps.getLatestWebSeriesList.all() as Array<{
      seriesId: string;
      title: string;
      currHeat: number | null;
      currHeatDesc: string | null;
      platformDesc: string | null;
      releaseInfo: string | null;
      category: string | null;
      imgUrl: string | null;
      fetchedAt: string;
    }>;

    return rows.map(row => ({
      seriesId: row.seriesId,
      title: row.title,
      currHeat: row.currHeat ?? 0,
      currHeatDesc: row.currHeatDesc || '',
      platformDesc: row.platformDesc || '',
      releaseInfo: row.releaseInfo || '',
      category: row.category || undefined,
      imgUrl: row.imgUrl || undefined,
      type: ((row as any).type || 'webSeries') as 'tv' | 'webSeries' | 'variety',
      fetchedAt: row.fetchedAt,
    }));
  } catch (error: any) {
    console.error('[MaoyanService] Error loading web series list from database:', error.message);
    return [];
  }
}

/**
 * 获取网播热剧列表（直接从数据库读取）
 */
export async function getMaoyanWebSeriesList(forceRefresh: boolean = false): Promise<MaoyanWebSeriesItem[]> {
  // 如果强制刷新，触发抓取
  if (forceRefresh) {
    console.log('[MaoyanService] Force refresh requested for web series, triggering scrape...');
    await refreshAndSaveMaoyanWebSeriesData();
  }

  // 直接从数据库读取
  return loadMaoyanWebSeriesListFromDatabase();
}

/**
 * 保存综艺节目列表到数据库
 */
export async function saveMaoyanVarietyToDatabase(variety: MaoyanWebSeriesItem[]): Promise<number> {
  try {
    if (variety.length === 0) {
      console.log('[MaoyanService] No variety to save');
      return 0;
    }

    // 先删除所有综艺旧数据
    maoyanOps.deleteWebSeriesByType.run('variety');

    // 保存新数据到数据库
    const fetchedAt = new Date().toISOString();
    for (const item of variety) {
      maoyanOps.insertWebSeries.run(
        item.seriesId,
        item.title,
        item.currHeat || null,
        item.currHeatDesc || null,
        item.platformDesc || null,
        item.releaseInfo || null,
        item.category || null,
        item.imgUrl || null,
        'variety',
        fetchedAt
      );
    }

    console.log(`[MaoyanService] Successfully saved ${variety.length} variety to database`);
    return variety.length;
  } catch (error: any) {
    console.error('[MaoyanService] Error saving variety to database:', error.message);
    throw error;
  }
}

/**
 * 刷新综艺节目数据:抓取并保存到数据库
 */
export async function refreshAndSaveMaoyanVarietyData(): Promise<{
  success: boolean;
  total: number;
  series: MaoyanWebSeriesItem[];
  error?: string;
}> {
  try {
    console.log('[MaoyanService] Starting Maoyan variety data refresh...');

    // 调用爬虫抓取数据
    const result = await scrapeMaoyanVarietyList();

    if (result.series.length > 0) {
      // 保存到数据库
      await saveMaoyanVarietyToDatabase(result.series);

      return {
        success: true,
        total: result.total,
        series: result.series
      };
    } else {
      return {
        success: false,
        total: 0,
        series: [],
        error: 'No variety fetched'
      };
    }
  } catch (error: any) {
    console.error('[MaoyanService] Error refreshing Maoyan variety data:', error.message);
    return {
      success: false,
      total: 0,
      series: [],
      error: error.message
    };
  }
}

/**
 * 从数据库加载综艺节目列表数据
 */
function loadMaoyanVarietyListFromDatabase(): MaoyanWebSeriesItem[] {
  try {
    const rows = maoyanOps.getLatestVarietyList.all() as Array<{
      seriesId: string;
      title: string;
      currHeat: number | null;
      currHeatDesc: string | null;
      platformDesc: string | null;
      releaseInfo: string | null;
      category: string | null;
      imgUrl: string | null;
      type: string | null;
      fetchedAt: string;
    }>;

    return rows.map(row => ({
      seriesId: row.seriesId,
      title: row.title,
      currHeat: row.currHeat ?? 0,
      currHeatDesc: row.currHeatDesc || '',
      platformDesc: row.platformDesc || '',
      releaseInfo: row.releaseInfo || '',
      category: row.category || undefined,
      imgUrl: row.imgUrl || undefined,
      type: (row.type || 'variety') as 'tv' | 'webSeries' | 'variety',
      fetchedAt: row.fetchedAt,
    }));
  } catch (error: any) {
    console.error('[MaoyanService] Error loading variety list from database:', error.message);
    return [];
  }
}

/**
 * 获取综艺节目列表（直接从数据库读取）
 */
export async function getMaoyanVarietyList(forceRefresh: boolean = false): Promise<MaoyanWebSeriesItem[]> {
  // 如果强制刷新，触发抓取
  if (forceRefresh) {
    console.log('[MaoyanService] Force refresh requested for variety, triggering scrape...');
    await refreshAndSaveMaoyanVarietyData();
  }

  // 直接从数据库读取
  return loadMaoyanVarietyListFromDatabase();
}

/**
 * 搜索并保存综艺节目相关的讨论
 */
export async function searchAndSaveVarietyDiscussions(variety: MaoyanWebSeriesItem[]): Promise<void> {
    console.log(`[MaoyanService] Starting to search discussions for ${variety.length} variety...`);
    
    for (const item of variety) {
        const seriesId = item.seriesId;
        const varietyTitle = item.title;
        
        try {
            // 检查是否已有搜索结果
            const hasWeibo = (searchOps.hasSeriesSearchResults.get(seriesId, 'weibo') as { count: number })?.count || 0;
            const hasXiaohongshu = (searchOps.hasSeriesSearchResults.get(seriesId, 'xiaohongshu') as { count: number })?.count || 0;
            const hasBilibili = (searchOps.hasSeriesSearchResults.get(seriesId, 'bilibili') as { count: number })?.count || 0;
            
            // 1. 微博搜索（综艺名称）
            if (hasWeibo === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitWeibo();
                    console.log(`[MaoyanService] Searching Weibo for variety: ${varietyTitle}`);
                    const weiboResult = await scrapeWeiboSearch(varietyTitle, { page: 1, limit: 20 });
                    if (weiboResult.results.length > 0) {
                        await saveWeiboSearchResults(varietyTitle, 1, weiboResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            varietyTitle,
                            'weibo',
                            varietyTitle,
                            'variety',
                            weiboResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${weiboResult.results.length} Weibo results for ${varietyTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Weibo for ${varietyTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Weibo search for ${varietyTitle} (already exists)`);
            }
            
            // 2. 小红书搜索（综艺名称）
            if (hasXiaohongshu === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitXiaohongshu();
                    console.log(`[MaoyanService] Searching Xiaohongshu for variety: ${varietyTitle}`);
                    const xhsResult = await scrapeXiaohongshuSearch(varietyTitle, { page: 1, limit: 20 });
                    if (xhsResult.results.length > 0) {
                        await saveXiaohongshuSearchResults(varietyTitle, 1, xhsResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            varietyTitle,
                            'xiaohongshu',
                            varietyTitle,
                            'variety',
                            xhsResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${xhsResult.results.length} Xiaohongshu results for ${varietyTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Xiaohongshu for ${varietyTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Xiaohongshu search for ${varietyTitle} (already exists)`);
            }
            
            // 3. B站搜索（综艺名称）
            if (hasBilibili === 0) {
                try {
                    // 调用侧频率控制
                    await rateLimitBilibili();
                    console.log(`[MaoyanService] Searching Bilibili for variety: ${varietyTitle}`);
                    const biliResult = await scrapeBilibiliSearch(varietyTitle, { page: 1, limit: 20, searchType: 'video' });
                    if (biliResult.results.length > 0) {
                        await saveBilibiliSearchResults(varietyTitle, 1, biliResult.results);
                        searchOps.insertSeriesSearchRelation.run(
                            seriesId,
                            varietyTitle,
                            'bilibili',
                            varietyTitle,
                            'variety',
                            biliResult.results.length
                        );
                        console.log(`[MaoyanService] Saved ${biliResult.results.length} Bilibili results for ${varietyTitle}`);
                    }
                } catch (error: any) {
                    console.error(`[MaoyanService] Error searching Bilibili for ${varietyTitle}: ${error.message}`);
                }
            } else {
                console.log(`[MaoyanService] Skipping Bilibili search for ${varietyTitle} (already exists)`);
            }
            
        } catch (error: any) {
            console.error(`[MaoyanService] Error processing variety ${varietyTitle}: ${error.message}`);
        }
    }
    
    console.log(`[MaoyanService] Finished searching discussions for all variety`);
}
