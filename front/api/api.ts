// API基础URL - 根据环境自动切换
export const getApiBase = () => {
    if (typeof window !== 'undefined') {
        // 浏览器环境
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // 如果是默认端口（80/443）或端口为空，不包含端口号
        // 这样可以通过 Nginx 代理访问，而不需要直接访问后端端口
        if (!port || port === '80' || port === '443') {
            return `${protocol}//${hostname}/api`;
        }
        
        // 开发环境（localhost）或非标准端口，使用原逻辑
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:3351/api`;
        }
        
        // 其他情况（生产环境非标准端口）
        return `${protocol}//${hostname}:${port}/api`;
    }
    // Node.js环境（开发时）
    return 'http://localhost:3351/api';
};

const API_BASE = getApiBase();

// Helper for making authenticated requests
async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Auth API
export const authApi = {
    register: (username: string, password: string) =>
        fetchApi('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    login: (username: string, password: string) =>
        fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    logout: () =>
        fetchApi('/auth/logout', { method: 'POST' }),

    getMe: () =>
        fetchApi('/auth/me'),
};

// Platform Accounts API
export const accountsApi = {
    getAll: () =>
        fetchApi('/accounts'),

    initiateLogin: (platform: string) =>
        fetchApi(`/accounts/${platform}/login`, { method: 'POST' }),

    checkLoginStatus: (platform: string, sessionId: string) =>
        fetchApi(`/accounts/${platform}/login/status/${sessionId}`),

    saveCookie: (platform: string, cookies: string, platformUsername?: string) =>
        fetchApi(`/accounts/${platform}/cookie`, {
            method: 'POST',
            body: JSON.stringify({ cookies, platformUsername }),
        }),

    disconnect: (platform: string) =>
        fetchApi(`/accounts/${platform}`, { method: 'DELETE' }),

    cancelLogin: (platform: string, sessionId: string) =>
        fetchApi(`/accounts/${platform}/login/${sessionId}`, { method: 'DELETE' }),

    sync: (platform: string) =>
        fetchApi(`/accounts/${platform}/sync`, { method: 'POST' }),

    getLoginScreenshot: (platform: string, sessionId: string) =>
        fetchApi(`/accounts/${platform}/login/screenshot/${sessionId}`),

    submitCredentials: (platform: string, sessionId: string, username: string, password: string) =>
        fetchApi(`/accounts/${platform}/login/credentials/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    submitCaptcha: (platform: string, sessionId: string, captcha: string) =>
        fetchApi(`/accounts/${platform}/login/captcha/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ captcha }),
        }),

    getSyncStatus: () =>
        fetchApi('/accounts/sync/status'),
};

// Public Items API (no auth required) - now under /api/global-focus/public
export const publicItemsApi = {
    getAll: (page = 1, limit = 30, platform?: string, category?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (platform) params.append('platform', platform);
        if (category) params.append('category', category);
        return fetchApi(`/global-focus/public?${params.toString()}`);
    },

    getByPlatform: (platform: string, page = 1, limit = 30, category?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (category) params.append('category', category);
        return fetchApi(`/global-focus/public/${platform}?${params.toString()}`);
    },

    getCounts: () =>
        fetchApi('/global-focus/public/stats/counts'),
};

// Global Focus API (user-specific, requires auth)
export const globalFocusApi = {
    getAll: (page = 1, limit = 30, platform?: string, category?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (platform) params.append('platform', platform);
        if (category) params.append('category', category);
        return fetchApi(`/global-focus?${params.toString()}`);
    },

    getByPlatform: (platform: string, page = 1, limit = 30, category?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (category) params.append('category', category);
        return fetchApi(`/global-focus/${platform}?${params.toString()}`);
    },

    getById: (id: number) =>
        fetchApi(`/global-focus/detail/${id}`),

    getCounts: () =>
        fetchApi(`/global-focus/stats/counts`),
};

// Hot Trends API
export const hotTrendsApi = {
    getTrends: (platform: string, category?: string) =>
        fetchApi(`/hot-trends?platform=${platform}${category ? `&category=${category}` : ''}`),

    getMeta: () =>
        fetchApi('/hot-trends/meta'),

    getStatus: () =>
        fetchApi('/hot-trends/status'),

    syncAll: () =>
        fetchApi('/hot-trends/sync', { method: 'POST' }),

    syncPlatform: (platform: string) =>
        fetchApi(`/hot-trends/sync/${platform}`, { method: 'POST' }),
};

// Hot Drama API
export const hotDramaApi = {
    getAll: (page: number = 1, limit: number = 30, mediaType?: 'movie' | 'tv', search?: string) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (mediaType) {
            params.append('media_type', mediaType);
        }
        if (search && search.trim()) {
            params.append('search', search.trim());
        }
        return fetchApi(`/hot-drama?${params.toString()}`);
    },

    refresh: () =>
        fetchApi('/hot-drama/refresh', { method: 'POST' }),
};

// OpenSource API (GitHub Trending)
export const opensourceApi = {
    // 获取 GitHub Trending
    getTrending: (period: 'today' | 'week' | 'month' = 'today', language: string = 'all') =>
        fetchApi(`/opensource/trending?period=${period}&language=${language}`),

    // 获取可用语言
    getLanguages: () =>
        fetchApi('/opensource/languages'),

    // 强制刷新
    refresh: () =>
        fetchApi('/opensource/refresh', { method: 'POST' }),
};

// Maoyan API (猫眼数据)
export const maoyanApi = {
    // 获取电影列表
    getMovieList: () =>
        fetchApi('/hot-drama/maoyan/movie-list'),

    // 获取电影详情
    getMovieDetail: (movieId: string, showDate?: string) => {
        const params = new URLSearchParams({ movieId });
        if (showDate) params.append('showDate', showDate);
        return fetchApi(`/hot-drama/maoyan/movie-detail?${params.toString()}`);
    },

    // 获取电影的B站解说
    getBilibiliComments: (movieId: string, limit?: number) => {
        const params = new URLSearchParams({ movieId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/bilibili-comments?${params.toString()}`);
    },

    // 获取电影的小红书讨论
    getXiaohongshuComments: (movieId: string, limit?: number) => {
        const params = new URLSearchParams({ movieId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/xiaohongshu-comments?${params.toString()}`);
    },

    // 获取电影的微博热评
    getWeiboComments: (movieId: string, limit?: number) => {
        const params = new URLSearchParams({ movieId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/weibo-comments?${params.toString()}`);
    },

    // 获取网播热剧列表
    getWebSeriesList: (forceRefresh?: boolean) => {
        const params = new URLSearchParams();
        if (forceRefresh) params.append('forceRefresh', 'true');
        return fetchApi(`/hot-drama/maoyan/web-series-list?${params.toString()}`);
    },

    // 获取网播热剧详情
    getWebSeriesDetail: (seriesId: string, showDate?: string) => {
        const params = new URLSearchParams({ seriesId });
        if (showDate) params.append('showDate', showDate);
        return fetchApi(`/hot-drama/maoyan/web-series-detail?${params.toString()}`);
    },

    // 获取网播热剧的B站解说
    getWebSeriesBilibiliComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/web-series/bilibili-comments?${params.toString()}`);
    },

    // 获取网播热剧的小红书讨论
    getWebSeriesXiaohongshuComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/web-series/xiaohongshu-comments?${params.toString()}`);
    },

    // 获取网播热剧的微博热评
    getWebSeriesWeiboComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/web-series/weibo-comments?${params.toString()}`);
    },

    // 获取综艺节目列表
    getVarietyList: (forceRefresh?: boolean) => {
        const params = new URLSearchParams();
        if (forceRefresh) params.append('forceRefresh', 'true');
        return fetchApi(`/hot-drama/maoyan/variety-list?${params.toString()}`);
    },

    // 获取综艺节目详情
    getVarietyDetail: (seriesId: string, showDate?: string) => {
        const params = new URLSearchParams({ seriesId });
        if (showDate) params.append('showDate', showDate);
        return fetchApi(`/hot-drama/maoyan/variety-detail?${params.toString()}`);
    },

    // 获取综艺节目的B站解说
    getVarietyBilibiliComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/variety/bilibili-comments?${params.toString()}`);
    },

    // 获取综艺节目的小红书讨论
    getVarietyXiaohongshuComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/variety/xiaohongshu-comments?${params.toString()}`);
    },

    // 获取综艺节目的微博热评
    getVarietyWeiboComments: (seriesId: string, limit?: number) => {
        const params = new URLSearchParams({ seriesId });
        if (limit) params.append('limit', limit.toString());
        return fetchApi(`/hot-drama/maoyan/variety/weibo-comments?${params.toString()}`);
    },
};

// Scheduler API
export const schedulerApi = {
    getStatus: () =>
        fetchApi('/scheduler/status'),

    updateConfig: (config: any) =>
        fetchApi('/scheduler/config', { method: 'POST', body: JSON.stringify(config) }),

    trigger: (task: string) =>
        fetchApi(`/scheduler/trigger/${task}`, { method: 'POST' }),
};

export const analyticsApi = {
    track: (event: {
        event_type: 'pageview' | 'click' | 'view';
        page_path: string;
        page_title?: string;
        session_id?: string;
        country?: string;
        city?: string;
        event_data?: any;
    }) => fetchApi('/analytics/track', {
        method: 'POST',
        body: JSON.stringify(event),
    }),
    getStats: (days?: number) => {
        const params = days ? `?days=${days}` : '';
        return fetchApi(`/analytics/stats${params}`);
    },
};

// Search API
export const searchApi = {
    // 微博搜索
    weibo: (keyword: string, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            q: keyword,
            page: page.toString(),
            limit: limit.toString(),
        });
        return fetchApi(`/search/weibo?${params.toString()}`);
    },

    // 小红书搜索
    xiaohongshu: (keyword: string, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            q: keyword,
            page: page.toString(),
            limit: limit.toString(),
        });
        return fetchApi(`/search/xiaohongshu?${params.toString()}`);
    },

    // B站搜索
    bilibili: (keyword: string, page: number = 1, limit: number = 20, type: 'video' | 'bangumi' | 'article' | 'live' = 'video') => {
        const params = new URLSearchParams({
            q: keyword,
            page: page.toString(),
            limit: limit.toString(),
            type: type,
        });
        return fetchApi(`/search/bilibili?${params.toString()}`);
    },
};

// Health check
export const healthApi = {
    check: () =>
        fetchApi('/health'),
};
