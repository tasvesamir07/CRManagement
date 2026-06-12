import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useWebSocket({ onMessage, enabled = true } = {}) {
  const [isAvailable, setIsAvailable] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) {
      setIsAvailable(false);
      return;
    }

    let cancelled = false;

    axios.get(`${API_URL}/ws-available`).then(res => {
      if (cancelled) return;
      const available = res.data.available;
      setIsAvailable(available);

      if (!available) return;

      const connectWs = () => {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (onMessageRef.current) onMessageRef.current(payload);
          } catch (e) {
            console.error('Failed parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!cancelled) reconnectRef.current = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => { ws.close(); };
      };

      connectWs();
    }).catch(() => {
      if (!cancelled) setIsAvailable(false);
    });

    return () => {
      cancelled = true;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    };
  }, [enabled]);

  return { isAvailable };
}
