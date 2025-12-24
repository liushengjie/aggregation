// TMDB API 服务
// 使用 The Movie Database 作为数据源
// 限流: 40 请求/10秒

import type { MaoyanData, MaoyanBoxOffice, MaoyanRankingItem, MaoyanCalendarMovie } from './scrapers/hotDrama/maoyanScraper.js';
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
export const cleanup = async () => {};

// ============================================
// 猫眼数据服务
// ============================================

import { maoyanOps } from './database.js';

/**
 * 从数据库加载猫眼数据
 */
function loadMaoyanDataFromDatabase(): MaoyanData | null {
  try {
    // Get latest fetch time
    const fetchTimeResult = maoyanOps.getLatestFetchTime.get() as { latest_fetch_time: string | null } | undefined;
    if (!fetchTimeResult?.latest_fetch_time) {
      return null;
    }
    
    // Load box office
    const boxOfficeRows = maoyanOps.getLatestBoxOffice.all() as Array<{
      rank: number;
      movieId: string;
      title: string;
      boxOffice: number;
      boxOfficeUnit: string;
      releaseDate: string | null;
      poster: string | null;
      trend: string | null;
    }>;
    
    // Load calendar
    const calendarRows = maoyanOps.getLatestCalendar.all() as Array<{
      movieId: string;
      title: string;
      releaseDate: string | null;
      poster: string | null;
      wantCount: number;
    }>;
    
    // Load rankings
    const tvRows = maoyanOps.getLatestRankings.all('tv') as Array<{
      rank: number;
      itemId: string;
      title: string;
      score: number;
      poster: string | null;
      info: string | null;
      category: 'tv' | 'webSeries' | 'variety';
    }>;
    
    const webRows = maoyanOps.getLatestRankings.all('webSeries') as Array<{
      rank: number;
      itemId: string;
      title: string;
      score: number;
      poster: string | null;
      info: string | null;
      category: 'tv' | 'webSeries' | 'variety';
    }>;
    
    const varietyRows = maoyanOps.getLatestRankings.all('variety') as Array<{
      rank: number;
      itemId: string;
      title: string;
      score: number;
      poster: string | null;
      info: string | null;
      category: 'tv' | 'webSeries' | 'variety';
    }>;
    
    const data: MaoyanData = {
      boxOffice: boxOfficeRows.map(row => ({
        rank: row.rank,
        movieId: row.movieId,
        title: row.title,
        boxOffice: row.boxOffice,
        boxOfficeUnit: row.boxOfficeUnit,
        releaseDate: row.releaseDate || '',
        poster: row.poster || undefined,
        trend: (row.trend as 'up' | 'down' | 'same') || 'same',
      })),
      calendar: calendarRows.map(row => ({
        movieId: row.movieId,
        title: row.title,
        releaseDate: row.releaseDate || '',
        poster: row.poster || undefined,
        wantCount: row.wantCount,
      })),
      tvRanking: tvRows.map(row => ({
        rank: row.rank,
        itemId: row.itemId,
        title: row.title,
        score: row.score,
        poster: row.poster || undefined,
        info: row.info || undefined,
        category: row.category as 'tv',
      })),
      webSeriesRanking: webRows.map(row => ({
        rank: row.rank,
        itemId: row.itemId,
        title: row.title,
        score: row.score,
        poster: row.poster || undefined,
        info: row.info || undefined,
        category: row.category as 'webSeries',
      })),
      varietyRanking: varietyRows.map(row => ({
        rank: row.rank,
        itemId: row.itemId,
        title: row.title,
        score: row.score,
        poster: row.poster || undefined,
        info: row.info || undefined,
        category: row.category as 'variety',
      })),
      fetchedAt: fetchTimeResult.latest_fetch_time,
    };
    
    return data;
  } catch (error: any) {
    console.error('[MaoyanService] Error loading data from database:', error.message);
    return null;
  }
}

// 空数据
const EMPTY_DATA: MaoyanData = {
  boxOffice: [],
  calendar: [],
  tvRanking: [],
  webSeriesRanking: [],
  varietyRanking: [],
  fetchedAt: new Date().toISOString(),
};

/**
 * 获取猫眼数据（直接从数据库读取）
 */
export async function getMaoyanData(forceRefresh: boolean = false): Promise<MaoyanData> {
  // 如果强制刷新，触发抓取
  if (forceRefresh) {
    console.log('[MaoyanService] Force refresh requested, triggering scrape...');
    const { refreshMaoyanData } = await import('./schedulers/hotDramaSchedulerService.js');
    await refreshMaoyanData();
  }
  
  // 直接从数据库读取
  const data = loadMaoyanDataFromDatabase();
  return data || EMPTY_DATA;
}

/**
 * 获取票房数据（直接从数据库读取）
 */
export async function getBoxOffice(): Promise<MaoyanBoxOffice[]> {
  const data = loadMaoyanDataFromDatabase();
  return data?.boxOffice || [];
}

/**
 * 获取即将上映电影（直接从数据库读取）
 */
export async function getComingMovies(): Promise<MaoyanCalendarMovie[]> {
  const data = loadMaoyanDataFromDatabase();
  return data?.calendar || [];
}

/**
 * 获取电视剧排行（直接从数据库读取）
 */
export async function getTvRanking(): Promise<MaoyanRankingItem[]> {
  const data = loadMaoyanDataFromDatabase();
  return data?.tvRanking || [];
}

/**
 * 获取网络剧排行（直接从数据库读取）
 */
export async function getWebSeriesRanking(): Promise<MaoyanRankingItem[]> {
  const data = loadMaoyanDataFromDatabase();
  return data?.webSeriesRanking || [];
}

/**
 * 获取综艺排行（直接从数据库读取）
 */
export async function getVarietyRanking(): Promise<MaoyanRankingItem[]> {
  const data = loadMaoyanDataFromDatabase();
  return data?.varietyRanking || [];
}
