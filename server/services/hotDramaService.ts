// TMDB API 服务
// 使用 The Movie Database 作为数据源
// 限流: 40 请求/10秒

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
