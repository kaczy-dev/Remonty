'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

function subscribeMobile(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getMobileSnapshot(): boolean {
  return typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false;
}

function getServerMobileSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot
  );
}
