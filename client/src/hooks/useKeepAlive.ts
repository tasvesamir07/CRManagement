import { useEffect } from 'react';

export default function useKeepAlive(intervalMs: number = 240000) {
  useEffect(() => {
    const pingEndpoint = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '/health')
      : 'http://localhost:5000/health';
    const keepAlive = () => { fetch(pingEndpoint).catch(() => {}); };
    keepAlive();
    const interval = setInterval(keepAlive, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}
