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

  describe('Multi-Shot Auto-Advance Sequence', () => {
    it('automatically advances targetField through sequence on consecutive measurements', () => {
      const onMeasurementReceived = vi.fn();
      const onMultiShotComplete = vi.fn();

      const { result } = renderHook(() =>
        useLaserMeter({
          multiShotEnabled: true,
          multiShotSequence: ['length', 'width', 'height'],
          onMeasurementReceived,
          onMultiShotComplete,
        })
      );

      expect(result.current.multiShotIndex).toBe(0);
      expect(result.current.targetField).toBe('length');

      // Shot 1: Length
      act(() => {
        result.current.startSimulation();
        result.current.simulateShot(5.4);
      });
      expect(onMeasurementReceived).toHaveBeenLastCalledWith(5.4, 'length');
      expect(result.current.multiShotIndex).toBe(1);
      expect(result.current.targetField).toBe('width');

      // Shot 2: Width
      act(() => {
        result.current.simulateShot(3.8);
      });
      expect(onMeasurementReceived).toHaveBeenLastCalledWith(3.8, 'width');
      expect(result.current.multiShotIndex).toBe(2);
      expect(result.current.targetField).toBe('height');

      // Shot 3: Height
      act(() => {
        result.current.simulateShot(2.65);
      });
      expect(onMeasurementReceived).toHaveBeenLastCalledWith(2.65, 'height');
      expect(result.current.multiShotIndex).toBe(3);
      expect(result.current.isMultiShotComplete).toBe(true);
      expect(onMultiShotComplete).toHaveBeenCalledTimes(1);
    });

    it('resets multi-shot index when resetMultiShot is called', () => {
      const { result } = renderHook(() =>
        useLaserMeter({
          multiShotEnabled: true,
          multiShotSequence: ['length', 'width', 'height'],
        })
      );

      act(() => {
        result.current.startSimulation();
        result.current.simulateShot(4.0);
      });
      expect(result.current.multiShotIndex).toBe(1);

      act(() => {
        result.current.resetMultiShot();
      });
      expect(result.current.multiShotIndex).toBe(0);
      expect(result.current.targetField).toBe('length');
    });
  });
});
