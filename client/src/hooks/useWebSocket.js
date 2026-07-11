import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/+$/, '') + '/api';
}

export function useWebSocket({ onMessage, enabled = true } = {}) {
  const [isAvailable, setIsAvailable] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      setIsAvailable(false);
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    axios.get(`${API_URL}/ws-available`).then(res => {
      if (cancelled) return;
      const available = res.data.available;
      setIsAvailable(available);

      if (!available) return;

      const connectWs = () => {
        const token = localStorage.getItem('cr_token');
        const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (onMessageRef.current) onMessageRef.current(payload);
          } catch (e) {
            console.error('Failed parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            setIsConnected(false);
            reconnectRef.current = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          if (!cancelled) setIsConnected(false);
          ws.close();
        };
      };

      connectWs();
    }).catch(() => {
      if (!cancelled) {
        setIsAvailable(false);
        setIsConnected(false);
      }
    });

    return () => {
      cancelled = true;
      setIsConnected(false);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    };
  }, [enabled]);

  return { isAvailable, isConnected };
}
