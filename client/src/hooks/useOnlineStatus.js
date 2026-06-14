import { useState, useEffect } from 'react';
import { registerCapacitorNetworkListener } from '../capacitor-offline';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const unsubscribeCap = registerCapacitorNetworkListener((connected) => {
      setIsOnline(connected);
    });

    if (unsubscribeCap) {
      return unsubscribeCap;
    }

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
