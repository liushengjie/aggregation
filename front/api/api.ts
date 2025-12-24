// API基础URL - 根据环境自动切换
const getApiBase = () => {
    if (typeof window !== 'undefined') {
        // 浏览器环境
        const hostname = window.location.hostname;
        const port = hostname === 'localhost' || hostname === '127.0.0.1' ? '3351' : window.location.port || '3351';
        return `${window.location.protocol}//${hostname}:${port}/api`;
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
    getAll: (page = 1, limit = 30, platform?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (platform) params.append('platform', platform);
        return fetchApi(`/global-focus/public?${params.toString()}`);
    },

    getByPlatform: (platform: string, page = 1, limit = 30) =>
        fetchApi(`/global-focus/public/${platform}?page=${page}&limit=${limit}`),

    getCounts: () =>
        fetchApi('/global-focus/public/stats/counts'),
};

// Global Focus API (user-specific, requires auth)
export const globalFocusApi = {
    getAll: (page = 1, limit = 30) =>
        fetchApi(`/global-focus?page=${page}&limit=${limit}`),

    getByPlatform: (platform: string, page = 1, limit = 30) =>
        fetchApi(`/global-focus/${platform}?page=${page}&limit=${limit}`),

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
    // 获取所有数据
    getAll: (forceRefresh: boolean = false) =>
        fetchApi(`/maoyan${forceRefresh ? '?refresh=true' : ''}`),

    // 获取票房数据
    getBoxOffice: () =>
        fetchApi('/maoyan/box-office'),

    // 获取即将上映
    getComing: () =>
        fetchApi('/maoyan/coming'),

    // 获取电视剧排行
    getTvRanking: () =>
        fetchApi('/maoyan/tv'),

    // 获取网络剧排行
    getWebSeriesRanking: () =>
        fetchApi('/maoyan/web-series'),

    // 获取综艺排行
    getVarietyRanking: () =>
        fetchApi('/maoyan/variety'),

    // 获取缓存状态
    getStatus: () =>
        fetchApi('/maoyan/status'),

    // 强制刷新
    refresh: () =>
        fetchApi('/maoyan/refresh', { method: 'POST' }),
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

// Health check
export const healthApi = {
    check: () =>
        fetchApi('/health'),
};
