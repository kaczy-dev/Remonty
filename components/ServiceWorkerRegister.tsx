'use client';

import { useEffect } from 'react';

/**
 * ServiceWorkerRegister mounts in the root layout to register the offline PWA service worker
 * in production environments (or when explicitly requested via ?sw=true for testing).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (process.env.NODE_ENV === 'production' || window.location.search.includes('sw=true'))
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.debug('[Kaczaka PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Kaczaka PWA] Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
