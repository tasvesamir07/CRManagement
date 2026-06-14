import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

/**
 * Registers a network listener for native Capacitor platforms.
 * Calls the callback with the online status (boolean).
 * Returns an unsubscribe function, or null if not on a native platform.
 */
export function registerCapacitorNetworkListener(callback) {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Get initial status
  Network.getStatus().then(status => {
    callback(status.connected);
  });

  // Listen for changes
  const listenerPromise = Network.addListener('networkStatusChange', status => {
    callback(status.connected);
  });

  return () => {
    listenerPromise.then(handle => handle.remove());
  };
}
