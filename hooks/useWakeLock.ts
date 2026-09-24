import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  error: string | null;
  request: () => Promise<boolean>;
  release: () => Promise<void>;
  toggle: () => Promise<boolean>;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const shouldBeLockedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      setIsSupported(true);
    }
  }, []);

  const release = useCallback(async () => {
    shouldBeLockedRef.current = false;
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch (err) {
        console.warn('Błąd podczas zwalniania blokady ekranu:', err);
      } finally {
        sentinelRef.current = null;
        setIsActive(false);
      }
    } else {
      setIsActive(false);
    }
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      setError('Screen Wake Lock API nie jest wspierane w tej przeglądarce.');
      return false;
    }

    try {
      shouldBeLockedRef.current = true;
      setError(null);
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;

      sentinel.addEventListener('release', () => {
        // Only mark inactive if we didn't voluntarily re-acquire it
        if (!shouldBeLockedRef.current) {
          setIsActive(false);
        }
      });

      setIsActive(true);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nie udało się włączyć blokady wygaszania ekranu.';
      setError(message);
      setIsActive(false);
      return false;
    }
  }, []);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (isActive) {
      await release();
      return false;
    } else {
      return await request();
    }
  }, [isActive, release, request]);

  // Handle document visibility change (re-request lock if user switched back to this tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldBeLockedRef.current && isSupported) {
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          sentinelRef.current = sentinel;
          setIsActive(true);
        } catch {
          // Silent fallback or keep previous error
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    error,
    request,
    release,
    toggle,
  };
}
