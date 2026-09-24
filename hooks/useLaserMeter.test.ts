import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLaserMeter } from './useLaserMeter';

describe('useLaserMeter Hook', () => {
  it('initializes with disconnected status and targetField', () => {
    const { result } = renderHook(() => useLaserMeter({ defaultTargetField: 'width' }));

    expect(result.current.status).toBe('disconnected');
    expect(result.current.targetField).toBe('width');
    expect(result.current.deviceName).toBeNull();
    expect(result.current.lastMeasurement).toBeNull();
  });

  it('allows changing targetField', () => {
    const { result } = renderHook(() => useLaserMeter());

    act(() => {
      result.current.setTargetField('length');
    });

    expect(result.current.targetField).toBe('length');
  });

  it('handles simulated measurements and passes targetField to callback', () => {
    const onMeasurementReceived = vi.fn();
    const { result } = renderHook(() =>
      useLaserMeter({
        onMeasurementReceived,
        defaultTargetField: 'height',
      })
    );

    act(() => {
      result.current.startSimulation();
      result.current.simulateShot(2.65);
    });

    expect(result.current.status).toBe('simulated');
    expect(result.current.lastMeasurement).toBe(2.65);
    expect(onMeasurementReceived).toHaveBeenCalledWith(2.65, 'height');
  });

  it('disconnects and resets device state', () => {
    const { result } = renderHook(() => useLaserMeter());

    act(() => {
      result.current.startSimulation();
    });
    expect(result.current.status).toBe('simulated');

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.deviceName).toBeNull();
  });
});
