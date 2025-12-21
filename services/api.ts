const API_BASE = 'http://localhost:3001/api';

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

    sync: (platform: string) =>
        fetchApi(`/accounts/${platform}/sync`, { method: 'POST' }),

    getLoginScreenshot: (platform: string, sessionId: string) =>
        fetchApi(`/accounts/${platform}/login/screenshot/${sessionId}`),

    submitCredentials: (platform: string, sessionId: string, username: string, password: string) =>
        fetchApi(`/accounts/${platform}/login/credentials/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
};

// Items API
export const itemsApi = {
    getAll: (page = 1, limit = 30) =>
        fetchApi(`/items?page=${page}&limit=${limit}`),

    getByPlatform: (platform: string, page = 1, limit = 30) =>
        fetchApi(`/items/${platform}?page=${page}&limit=${limit}`),

    getById: (id: number) =>
        fetchApi(`/items/detail/${id}`),
};

// Health check
export const healthApi = {
    check: () =>
        fetchApi('/health'),
};
