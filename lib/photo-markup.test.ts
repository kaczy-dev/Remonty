import { describe, it, expect } from 'vitest';
import {
  calculateNormalizedDistance,
  generateElementId,
  PIN_CONFIG,
  DimensionLine,
  InstallationPin,
  renderDimensionLineToCanvas,
  renderPinToCanvas,
} from './photo-markup';

describe('Photo Markup Helper', () => {
  it('calculates euclidean distance between normalized points', () => {
    const dist = calculateNormalizedDistance(0, 0, 0.3, 0.4);
    expect(dist).toBeCloseTo(0.5, 4);
  });

  it('generates unique element IDs with prefix', () => {
    const id1 = generateElementId('dim');
    const id2 = generateElementId('dim');
    expect(id1).toMatch(/^dim_/);
    expect(id2).toMatch(/^dim_/);
    expect(id1).not.toBe(id2);
  });

  it('contains valid pin configurations with polish labels and symbols', () => {
    expect(PIN_CONFIG.socket_230v.label).toBe('Gniazdo 230V');
    expect(PIN_CONFIG.socket_230v.iconSymbol).toBe('⚡');
    expect(PIN_CONFIG.water_in.category).toBe('Hydraulika');
    expect(PIN_CONFIG.issue.category).toBe('Inspekcja');
  });

  it('renders dimension line to canvas context without throwing', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      rect: () => {},
      measureText: () => ({ width: 50 }),
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    const line: DimensionLine = {
      id: 'test_1',
      x1: 0.1,
      y1: 0.1,
      x2: 0.8,
      y2: 0.1,
      value: '2.50 m',
      label: 'Szerokość',
      color: '#14b8a6',
    };

    expect(() => {
      renderDimensionLineToCanvas(mockCtx, line, 800, 600);
    }).not.toThrow();
  });

  it('renders installation pin to canvas context without throwing', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      rect: () => {},
      measureText: () => ({ width: 40 }),
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    const pin: InstallationPin = {
      id: 'pin_1',
      x: 0.5,
      y: 0.5,
      type: 'socket_230v',
      label: 'Gniazdo 30cm',
      color: '#f59e0b',
    };

    expect(() => {
      renderPinToCanvas(mockCtx, pin, 800, 600);
    }).not.toThrow();
  });
});
