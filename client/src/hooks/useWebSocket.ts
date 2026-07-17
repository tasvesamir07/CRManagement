import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/+$/, '') + '/api';
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const RECONNECT_MAX_ATTEMPTS = 20;
const HEARTBEAT_INTERVAL_MS = 25000;

interface WebSocketOptions {
  onMessage?: (payload: any) => void;
  enabled?: boolean;
}

export function useWebSocket({ onMessage, enabled = true }: WebSocketOptions = {}) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAvailable(false);
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    const clearTimers = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const startHeartbeat = (ws: WebSocket) => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    const connectWs = () => {
      clearTimers();

      const token = localStorage.getItem('cr_token');
      // Dynamically derive the WebSocket URL from the VITE_API_URL to keep them in sync
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        startHeartbeat(ws);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') return;
          if (onMessageRef.current) onMessageRef.current(payload);
        } catch (e) {
          console.error('Failed parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setIsConnected(false);
        wsRef.current = null;
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!cancelled) setIsConnected(false);
        ws.close();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current > RECONNECT_MAX_ATTEMPTS) return;

      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptRef.current - 1),
        RECONNECT_MAX_MS
      );

      reconnectTimerRef.current = setTimeout(connectWs, delay);
    };

    const checkAvailability = () => {
      axios.get(`${API_URL}/ws-available`).then(res => {
        if (cancelled) return;
        const available = res.data.available;
        setIsAvailable(available);
        if (available) {
          reconnectAttemptRef.current = 0;
          connectWs();
        }
      }).catch(() => {
        if (!cancelled) {
          setIsAvailable(false);
          setIsConnected(false);
        }
      });
    };

    checkAvailability();

    return () => {
      cancelled = true;
      setIsConnected(false);
      clearTimers();
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [enabled]);

  return { isAvailable, isConnected };
}
