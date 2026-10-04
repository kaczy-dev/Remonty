import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BluetoothLaserMeterClient,
  LaserMeasurementEvent,
  isWebBluetoothSupported,
} from '@/lib/bluetooth/laser-meter';

export type LaserMeterStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'simulated'
  | 'error';

export interface UseLaserMeterOptions {
  onMeasurementReceived?: (distanceMeters: number, targetField: string | null) => void;
  defaultTargetField?: string | null;
  enableSound?: boolean;
  enableHaptic?: boolean;
  autoReconnect?: boolean;
  multiShotEnabled?: boolean;
  multiShotSequence?: string[];
  onMultiShotComplete?: () => void;
}

const DEFAULT_MULTI_SHOT_SEQUENCE = ['length', 'width', 'height', 'd1', 'd2'];

export function useLaserMeter(options: UseLaserMeterOptions = {}) {
  const [status, setStatus] = useState<LaserMeterStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [lastMeasurement, setLastMeasurement] = useState<number | null>(null);
  const [targetField, setTargetField] = useState<string | null>(() => {
    if (options.defaultTargetField) return options.defaultTargetField;
    if (options.multiShotEnabled) {
      const seq = options.multiShotSequence || DEFAULT_MULTI_SHOT_SEQUENCE;
      return seq[0] ?? null;
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported] = useState(() => isWebBluetoothSupported());

  // Multi-shot Auto-Advance State
  const [multiShotEnabled, setMultiShotEnabled] = useState<boolean>(options.multiShotEnabled ?? false);
  const [multiShotSequence, setMultiShotSequence] = useState<string[]>(
    options.multiShotSequence || DEFAULT_MULTI_SHOT_SEQUENCE
  );
  const [multiShotIndex, setMultiShotIndex] = useState<number>(0);

  const clientRef = useRef<BluetoothLaserMeterClient | null>(null);
  const optionsRef = useRef(options);
  const targetFieldRef = useRef(targetField);
  const multiShotIndexRef = useRef(multiShotIndex);
  const multiShotSequenceRef = useRef(multiShotSequence);
  const multiShotEnabledRef = useRef(multiShotEnabled);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    targetFieldRef.current = targetField;
  }, [targetField]);

  useEffect(() => {
    multiShotIndexRef.current = multiShotIndex;
  }, [multiShotIndex]);

  useEffect(() => {
    multiShotSequenceRef.current = multiShotSequence;
  }, [multiShotSequence]);

  useEffect(() => {
    multiShotEnabledRef.current = multiShotEnabled;
  }, [multiShotEnabled]);

  const resetMultiShot = useCallback(() => {
    setMultiShotIndex(0);
    if (multiShotSequenceRef.current.length > 0) {
      setTargetField(multiShotSequenceRef.current[0]);
    }
  }, []);

  const advanceMultiShot = useCallback(() => {
    const nextIdx = multiShotIndexRef.current + 1;
    if (nextIdx < multiShotSequenceRef.current.length) {
      setMultiShotIndex(nextIdx);
      setTargetField(multiShotSequenceRef.current[nextIdx]);
    } else {
      optionsRef.current.onMultiShotComplete?.();
    }
  }, []);

  const handleMeasurement = useCallback((event: LaserMeasurementEvent) => {
    setLastMeasurement(event.distanceMeters);

    let currentTarget = targetFieldRef.current;
    if (multiShotEnabledRef.current) {
      const seq = multiShotSequenceRef.current;
      const idx = multiShotIndexRef.current;
      if (idx < seq.length) {
        currentTarget = seq[idx];
      }
    }

    if (optionsRef.current.onMeasurementReceived) {
      optionsRef.current.onMeasurementReceived(event.distanceMeters, currentTarget);
    }

    if (multiShotEnabledRef.current) {
      const nextIdx = multiShotIndexRef.current + 1;
      const seq = multiShotSequenceRef.current;
      if (nextIdx < seq.length) {
        setMultiShotIndex(nextIdx);
        setTargetField(seq[nextIdx]);
      } else {
        setMultiShotIndex(nextIdx);
        optionsRef.current.onMultiShotComplete?.();
      }
    }
  }, []);

  const initClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new BluetoothLaserMeterClient({
        onMeasurement: handleMeasurement,
        playBeep: optionsRef.current.enableSound ?? true,
        haptic: optionsRef.current.enableHaptic ?? true,
        autoReconnect: optionsRef.current.autoReconnect ?? true,
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'connected') {
            setDeviceName(clientRef.current?.getDeviceName() || 'Dalmierz Laserowy');
            setErrorMessage(null);
          } else if (newStatus === 'disconnected') {
            setDeviceName(null);
          }
        },
        onError: (err) => {
          setErrorMessage(err.message || 'Błąd połączenia z dalmierzem');
          setStatus('error');
        },
      });
    }
    return clientRef.current;
  }, [handleMeasurement]);

  const connect = useCallback(async () => {
    setErrorMessage(null);
    const client = initClient();
    return await client.connect();
  }, [initClient]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setStatus('disconnected');
    setDeviceName(null);
  }, []);

  const startSimulation = useCallback(() => {
    disconnect();
    setStatus('simulated');
    setDeviceName('Symulator Dalmierza BLE');
    setErrorMessage(null);
  }, [disconnect]);

  const simulateShot = useCallback((distanceMeters?: number) => {
    const client = initClient();
    const dist = distanceMeters ?? (Math.floor((2 + Math.random() * 4) * 100) / 100);
    client.simulateMeasurement(dist);
    setStatus('simulated');
    setDeviceName('Symulator Dalmierza BLE');
  }, [initClient]);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const isMultiShotComplete = multiShotEnabled && multiShotIndex >= multiShotSequence.length;

  return {
    status,
    deviceName,
    lastMeasurement,
    targetField,
    errorMessage,
    isSupported,
    multiShotEnabled,
    multiShotSequence,
    multiShotIndex,
    isMultiShotComplete,
    setTargetField,
    setMultiShotEnabled,
    setMultiShotSequence,
    resetMultiShot,
    advanceMultiShot,
    connect,
    disconnect,
    startSimulation,
    simulateShot,
  };
}
