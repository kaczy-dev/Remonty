// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeviceOrientation } from './useDeviceOrientation';

describe('useDeviceOrientation hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects orientation support and calculates isLevel accurately', () => {
    // Mock DeviceOrientationEvent on window
    (window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = function () {};

    const { result } = renderHook(() => useDeviceOrientation());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permissionState).toBe('granted');

    // Dispatch a level orientation event (roll = 0.5 deg)
    act(() => {
      const event = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperties(event, {
        beta: { value: 89.5 },
        gamma: { value: 0.5 },
        alpha: { value: 180 },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.roll).toBe(0.5);
    expect(result.current.pitch).toBe(89.5);
    expect(result.current.isLevel).toBe(true);
    expect(result.current.isVertical).toBe(true);

    // Dispatch a non-level orientation event (roll = 5 deg)
    act(() => {
      const event = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperties(event, {
        beta: { value: 60 },
        gamma: { value: 5 },
        alpha: { value: 180 },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.roll).toBe(5);
    expect(result.current.isLevel).toBe(false);
    expect(result.current.isVertical).toBe(false);
  });
});
