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

// Global Focus API
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

// Health check
export const healthApi = {
    check: () =>
        fetchApi('/health'),
};
