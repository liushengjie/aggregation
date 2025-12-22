import { scrapeMaoyanData, MaoyanData, MaoyanBoxOffice, MaoyanCalendarMovie, MaoyanRankingItem } from './scrapers/hotDrama/maoyanScraper.js';
import { getMaoyanCachedData, refreshMaoyanData } from './schedulers/hotDramaSchedulerService.js';

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

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
 * 获取猫眼数据（优先使用调度器缓存）
 */
export async function getMaoyanData(forceRefresh: boolean = false): Promise<MaoyanData> {
  const cached = getMaoyanCachedData();
  const now = Date.now();
  
  // 如果不强制刷新且缓存有效，返回缓存数据
  if (!forceRefresh && cached.data && (now - cached.lastFetchTime) < CACHE_TTL) {
    console.log('[MaoyanService] Returning cached data from scheduler');
    return cached.data;
  }
  
  // 如果正在抓取中，返回缓存数据
  if (cached.isScraping) {
    console.log('[MaoyanService] Scraping in progress, returning cached data');
    return cached.data || EMPTY_DATA;
  }
  
  // 触发刷新
  console.log('[MaoyanService] Triggering data refresh...');
  const result = await refreshMaoyanData();
  
  if (result.success && result.data) {
    return result.data;
  }
  
  // 返回缓存数据或空数据
  return cached.data || EMPTY_DATA;
}

/**
 * 获取票房数据
 */
export async function getBoxOffice(): Promise<MaoyanBoxOffice[]> {
  const data = await getMaoyanData();
  return data.boxOffice;
}

/**
 * 获取即将上映电影
 */
export async function getComingMovies(): Promise<MaoyanCalendarMovie[]> {
  const data = await getMaoyanData();
  return data.calendar;
}

/**
 * 获取电视剧排行
 */
export async function getTvRanking(): Promise<MaoyanRankingItem[]> {
  const data = await getMaoyanData();
  return data.tvRanking;
}

/**
 * 获取网络剧排行
 */
export async function getWebSeriesRanking(): Promise<MaoyanRankingItem[]> {
  const data = await getMaoyanData();
  return data.webSeriesRanking;
}

/**
 * 获取综艺排行
 */
export async function getVarietyRanking(): Promise<MaoyanRankingItem[]> {
  const data = await getMaoyanData();
  return data.varietyRanking;
}

/**
 * 获取缓存状态
 */
export function getCacheStatus(): { 
  hasCachedData: boolean; 
  lastFetchTime: string | null; 
  cacheAge: number;
  isFetching: boolean;
} {
  const cached = getMaoyanCachedData();
  return {
    hasCachedData: cached.data !== null,
    lastFetchTime: cached.lastFetchTime ? new Date(cached.lastFetchTime).toISOString() : null,
    cacheAge: cached.lastFetchTime ? Date.now() - cached.lastFetchTime : 0,
    isFetching: cached.isScraping,
  };
}

/**
 * 清除缓存（触发重新抓取）
 */
export async function clearCache(): Promise<void> {
  console.log('[MaoyanService] Clearing cache and refreshing...');
  await refreshMaoyanData();
}
