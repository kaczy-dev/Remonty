import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BluetoothLaserMeterClient,
  LaserMeasurementEvent,
  isWebBluetoothSupported,
} from '@/lib/bluetooth/laser-meter';

export type LaserMeterStatus = 'disconnected' | 'connecting' | 'connected' | 'simulated' | 'error';

export interface UseLaserMeterOptions {
  onMeasurementReceived?: (distanceMeters: number, targetField: string | null) => void;
  defaultTargetField?: string | null;
}

export function useLaserMeter(options: UseLaserMeterOptions = {}) {
  const [status, setStatus] = useState<LaserMeterStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [lastMeasurement, setLastMeasurement] = useState<number | null>(null);
  const [targetField, setTargetField] = useState<string | null>(options.defaultTargetField || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const clientRef = useRef<BluetoothLaserMeterClient | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const targetFieldRef = useRef(targetField);
  targetFieldRef.current = targetField;

  useEffect(() => {
    setIsSupported(isWebBluetoothSupported());
  }, []);

  const handleMeasurement = useCallback((event: LaserMeasurementEvent) => {
    setLastMeasurement(event.distanceMeters);
    if (optionsRef.current.onMeasurementReceived) {
      optionsRef.current.onMeasurementReceived(event.distanceMeters, targetFieldRef.current);
    }
  }, []);

  const initClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new BluetoothLaserMeterClient({
        onMeasurement: handleMeasurement,
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

  return {
    status,
    deviceName,
    lastMeasurement,
    targetField,
    errorMessage,
    isSupported,
    setTargetField,
    connect,
    disconnect,
    startSimulation,
    simulateShot,
  };
}
