import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock hook', () => {
  let originalWakeLock: unknown;
  let mockSentinel: {
    released: boolean;
    release: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    originalWakeLock = (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    mockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(async () => {
        mockSentinel.released = true;
      }),
      addEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: originalWakeLock,
      configurable: true,
      writable: true,
    });
  });

  it('detects wakeLock support correctly when present', () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockResolvedValue(mockSentinel),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isActive).toBe(false);
  });

  it('successfully requests and releases screen wake lock', async () => {
    const requestMock = vi.fn().mockResolvedValue(mockSentinel);
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: requestMock,
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      const success = await result.current.request();
      expect(success).toBe(true);
    });

    expect(requestMock).toHaveBeenCalledWith('screen');
    expect(result.current.isActive).toBe(true);

    await act(async () => {
      await result.current.release();
    });

    expect(mockSentinel.release).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('toggles wake lock on and off', async () => {
    const requestMock = vi.fn().mockResolvedValue(mockSentinel);
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: requestMock,
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      const activeAfterToggle1 = await result.current.toggle();
      expect(activeAfterToggle1).toBe(true);
    });
    expect(result.current.isActive).toBe(true);

    await act(async () => {
      const activeAfterToggle2 = await result.current.toggle();
      expect(activeAfterToggle2).toBe(false);
    });
    expect(result.current.isActive).toBe(false);
  });

  it('handles request failure gracefully when unsupported or rejected', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockRejectedValue(new Error('Low battery permission denied')),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      const success = await result.current.request();
      expect(success).toBe(false);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toContain('Low battery');
  });
});
