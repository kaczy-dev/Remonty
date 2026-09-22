'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DeviceOrientationData {
  pitch: number | null; // beta: front-back tilt (-180 to 180)
  roll: number | null; // gamma: left-right tilt (-90 to 90)
  yaw: number | null; // alpha: compass direction (0 to 360)
  isLevel: boolean; // true when roll is within +/- 1.5 deg (horizontal level)
  isVertical: boolean; // true when pitch is within 85-95 deg (vertical wall orientation)
  isSupported: boolean;
  permissionState: 'default' | 'granted' | 'denied' | 'unsupported';
  requestPermission: () => Promise<boolean>;
}

export function useDeviceOrientation(): DeviceOrientationData {
  const [pitch, setPitch] = useState<number | null>(null);
  const [roll, setRoll] = useState<number | null>(null);
  const [yaw, setYaw] = useState<number | null>(null);
  const [isSupported] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  });
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return 'unsupported';
    }
    const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceOrientationEventAny.requestPermission !== 'function') {
      return 'granted';
    }
    return 'default';
  });

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta !== null && e.beta !== undefined) {
      setPitch(Math.round(e.beta * 10) / 10);
    }
    if (e.gamma !== null && e.gamma !== undefined) {
      setRoll(Math.round(e.gamma * 10) / 10);
    }
    if (e.alpha !== null && e.alpha !== undefined) {
      setYaw(Math.round(e.alpha * 10) / 10);
    }
  }, []);

  useEffect(() => {
    if (permissionState !== 'granted' || typeof window === 'undefined') return;

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [permissionState, handleOrientation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEventAny.requestPermission();
        setPermissionState(res);
        return res === 'granted';
      } catch (err) {
        console.warn('DeviceOrientation permission request failed', err);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      return true;
    }
  }, []);

  // Level is within +/- 1.5 degrees of true horizon
  const isLevel = roll !== null && Math.abs(roll) <= 1.5;
  // Vertical wall alignment (phone held vertically at ~90 deg pitch)
  const isVertical = pitch !== null && Math.abs(pitch - 90) <= 5;

  return {
    pitch,
    roll,
    yaw,
    isLevel,
    isVertical,
    isSupported,
    permissionState,
    requestPermission,
  };
}
