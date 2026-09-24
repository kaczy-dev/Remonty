import { describe, it, expect, vi } from 'vitest';
import {
  parseLeicaDistoPacket,
  parseBoschGlmPacket,
  parseAsciiDistanceString,
  decodeLaserDataView,
  BluetoothLaserMeterClient,
  isWebBluetoothSupported,
} from './laser-meter';

describe('Laser Meter Protocol Parsers', () => {
  describe('parseLeicaDistoPacket', () => {
    it('correctly parses 32-bit float Little Endian value in meters', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, 4.256, true);

      const parsed = parseLeicaDistoPacket(view);
      expect(parsed).toBeCloseTo(4.256, 3);
    });

    it('rejects negative, zero, or excessively large distance values', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);

      view.setFloat32(0, -1.5, true);
      expect(parseLeicaDistoPacket(view)).toBeNull();

      view.setFloat32(0, 0, true);
      expect(parseLeicaDistoPacket(view)).toBeNull();

      view.setFloat32(0, 350.0, true); // Over 200m limit
      expect(parseLeicaDistoPacket(view)).toBeNull();
    });

    it('returns null if packet is shorter than 4 bytes', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      expect(parseLeicaDistoPacket(view)).toBeNull();
    });
  });

  describe('parseBoschGlmPacket', () => {
    it('parses Bosch GLM packet with 0xC0 command header and 0.05 mm units', () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setUint8(0, 0xc0); // Bosch command header
      view.setUint8(1, 0x00);
      view.setUint8(2, 0x00);
      // 3.500 meters = 3500 mm = 70,000 units of 0.05 mm
      view.setUint32(3, 70000, true);

      const parsed = parseBoschGlmPacket(view);
      expect(parsed).toBeCloseTo(3.500, 3);
    });

    it('falls back to float32 if no 0xC0 header is present', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, 2.85, true);

      const parsed = parseBoschGlmPacket(view);
      expect(parsed).toBeCloseTo(2.85, 2);
    });
  });

  describe('parseAsciiDistanceString', () => {
    it('parses distance formatted with meters (m)', () => {
      expect(parseAsciiDistanceString('3.456m\r\n')).toBeCloseTo(3.456, 3);
      expect(parseAsciiDistanceString('D: 5.120 m')).toBeCloseTo(5.120, 3);
      expect(parseAsciiDistanceString('1,85 m')).toBeCloseTo(1.85, 2);
    });

    it('parses distance formatted in millimeters (mm)', () => {
      expect(parseAsciiDistanceString('2450 mm')).toBeCloseTo(2.45, 3);
      expect(parseAsciiDistanceString('600mm')).toBeCloseTo(0.60, 2);
    });

    it('returns null for non-numeric or invalid input', () => {
      expect(parseAsciiDistanceString('ERROR')).toBeNull();
      expect(parseAsciiDistanceString('')).toBeNull();
      expect(parseAsciiDistanceString('no value')).toBeNull();
    });
  });

  describe('decodeLaserDataView', () => {
    it('decodes Leica DISTO payload when deviceName contains DISTO', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, 5.432, true);

      const res = decodeLaserDataView(view, 'DISTO D2 1234');
      expect(res).toBeCloseTo(5.432, 3);
    });

    it('decodes ASCII payload from generic BLE meter', () => {
      const text = '4.120m';
      const encoded = new TextEncoder().encode(text);
      const view = new DataView(encoded.buffer);

      const res = decodeLaserDataView(view, 'MiLESEEY DT10');
      expect(res).toBeCloseTo(4.120, 3);
    });
  });

  describe('BluetoothLaserMeterClient Simulation Mode', () => {
    it('triggers measurement callback and plays feedback in simulated mode', () => {
      const onMeasurement = vi.fn();
      const onStatusChange = vi.fn();

      const client = new BluetoothLaserMeterClient({
        onMeasurement,
        onStatusChange,
        playBeep: false, // Don't call Web Audio in node test
        haptic: false,
      });

      client.simulateMeasurement(3.85);

      expect(onMeasurement).toHaveBeenCalledTimes(1);
      const event = onMeasurement.mock.calls[0][0];
      expect(event.distanceMeters).toBe(3.85);
      expect(event.brand).toBe('simulator');
      expect(event.deviceName).toBe('Symulator Dalmierza BLE');
    });

    it('reports correct support status', () => {
      // In Node environment navigator.bluetooth is undefined
      expect(isWebBluetoothSupported()).toBe(false);
    });
  });
});
