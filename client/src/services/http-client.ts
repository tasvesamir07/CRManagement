import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { OfflineCache, SyncQueue } from './offline';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/+$/, '') + '/api';
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('cr_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response: AxiosResponse) => {
        const url = response.config.url;
        const method = response.config.method?.toLowerCase();
        if (method === 'get' && (url === '/courses' || url === '/platforms' || url === '/templates')) {
            OfflineCache.set(url, response.data).catch(err => console.error('Failed to cache response:', err));
        }
        return response;
    },
    async (error) => {
        if (!error.response && typeof navigator !== 'undefined' && navigator.onLine === false) {
            const config = error.config;
            const method = config.method?.toLowerCase();
            if (method === 'get') {
                const cached = await OfflineCache.get(config.url);
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
