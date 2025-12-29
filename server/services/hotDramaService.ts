// TMDB API 服务
// 使用 The Movie Database 作为数据源
// 限流: 40 请求/10秒

import type { MaoyanMovieItem, MaoyanMovieListResponse } from './scrapers/hotDrama/maoyanScraper.js';
import { refreshMaoyanData } from './schedulers/hotDramaSchedulerService.js';

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

import { maoyanOps } from './database.js';
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
      originalTitle: string | null;
      poster: string | null;
      releaseDate: string | null;
      boxOffice: number | null;
      boxOfficeUnit: string | null;
      rating: number | null;
      genre: string | null;
      director: string | null;
      actors: string | null;
      description: string | null;
      duration: number | null;
      country: string | null;
      language: string | null;
      fetchedAt: string;
    }>;

    return rows.map(row => ({
      movieId: row.movieId,
      title: row.title,
      originalTitle: row.originalTitle || undefined,
      poster: row.poster || undefined,
      releaseDate: row.releaseDate || undefined,
      boxOffice: row.boxOffice || undefined,
      boxOfficeUnit: row.boxOfficeUnit || undefined,
      rating: row.rating || undefined,
      genre: row.genre || undefined,
      director: row.director || undefined,
      actors: row.actors || undefined,
      description: row.description || undefined,
      duration: row.duration || undefined,
      country: row.country || undefined,
      language: row.language || undefined,
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
export async function getMaoyanMovieList(forceRefresh: boolean = false): Promise<MaoyanMovieItem[]> {
  // 如果强制刷新，触发抓取
  if (forceRefresh) {
    console.log('[MaoyanService] Force refresh requested, triggering scrape...');
    const { refreshMaoyanData } = await import('./schedulers/hotDramaSchedulerService.js');
    await refreshMaoyanData();
  }

  // 直接从数据库读取
  return loadMaoyanMovieListFromDatabase();
}
