import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { OfflineCache, SyncQueue } from './offline';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/+$/, '') + '/api';
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 120000,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'x-csrf-token'
});

let cachedCsrfToken: string | null = null;

function getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Authentication is managed strictly via HttpOnly cookies sent via withCredentials: true
        // Tokens are never stored in localStorage to prevent XSS-based credential theft
        const method = config.method?.toLowerCase();
        const isMutating = ['post', 'put', 'delete', 'patch'].includes(method || '');

        if (isMutating && !config.headers['x-csrf-token']) {
            let csrf = getCookieValue('XSRF-TOKEN') || cachedCsrfToken;
            if (!csrf && !config.url?.includes('/csrf-token')) {
                try {
                    const res = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true });
                    if (res.data?.csrfToken) {
                        csrf = res.data.csrfToken;
                        cachedCsrfToken = csrf;
                    }
                } catch {
                    // Fail silently and allow request to proceed
                }
            }
            if (csrf) {
                config.headers['x-csrf-token'] = csrf;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const RETRYABLE_METHODS = ['get'];
const MAX_RETRIES = 2;

api.interceptors.response.use(
    (response: AxiosResponse) => {
        if (response.data?.csrfToken) {
            cachedCsrfToken = response.data.csrfToken;
        }
        const url = response.config.url;
        const method = response.config.method?.toLowerCase();
        const cacheableUrls = ['/courses', '/platforms', '/templates', '/announcements', '/files', '/routines'];
        if (method === 'get' && url && cacheableUrls.some(cu => url.startsWith(cu))) {
            const cacheKey = url + (response.config.params ? JSON.stringify(response.config.params) : '');
            OfflineCache.set(cacheKey, response.data).catch(err => console.error('Failed to cache response:', err));
        }
        return response;
    },
    async (error) => {
        const config = error.config;
        if (config && RETRYABLE_METHODS.includes(config.method?.toLowerCase())) {
            const retryCount = (config as any)._retryCount || 0;
            if (retryCount < MAX_RETRIES) {
                if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
                    (config as any)._retryCount = retryCount + 1;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return api(config);
                }
            }
        }

        if (!error.response && typeof navigator !== 'undefined' && navigator.onLine === false) {
            const config = error.config;
            const method = config.method?.toLowerCase();
            if (method === 'get' && config.url) {
                const cacheKey = config.url + (config.params ? JSON.stringify(config.params) : '');
                const cached = await OfflineCache.get(cacheKey);
                if (cached) {
                    return { data: cached, config, headers: {}, status: 200, statusText: 'OK' };
                }
            }
            if (['post', 'put', 'patch', 'delete'].includes(method)) {
                await SyncQueue.add({
                    method: config.method,
                    url: config.url,
                    data: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
                    headers: config.headers
                });
                return Promise.reject(new Error('OFFLINE_QUEUED'));
            }
        }
        return Promise.reject(error);
    }
);

export default api;
