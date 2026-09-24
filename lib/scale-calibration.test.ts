import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_PRESETS,
  calculateCalibratedScale,
  applyPitchTiltCorrection,
} from './scale-calibration';
import { analyzeFrameLighting } from './cv/canny-edge-detector';

describe('scale-calibration utility', () => {
  it('contains expected standard calibration presets for Polish construction standard', () => {
    // Construction levels / poziomice
    const level60 = CALIBRATION_PRESETS.find((p) => p.id === 'level_60');
    expect(level60).toBeDefined();
    expect(level60?.sizeMeters).toBe(0.60);
    expect(level60?.category).toBe('tool');

    const level100 = CALIBRATION_PRESETS.find((p) => p.id === 'level_100');
    expect(level100).toBeDefined();
    expect(level100?.sizeMeters).toBe(1.00);
    expect(level100?.category).toBe('tool');

    const level120 = CALIBRATION_PRESETS.find((p) => p.id === 'level_120');
    expect(level120).toBeDefined();
    expect(level120?.sizeMeters).toBe(1.20);
    expect(level120?.category).toBe('tool');

    // Drywall / Płyta G-K
    const drywall120 = CALIBRATION_PRESETS.find((p) => p.id === 'drywall_120');
    expect(drywall120).toBeDefined();
    expect(drywall120?.sizeMeters).toBe(1.20);
    expect(drywall120?.category).toBe('board');

    // Tiles / Gres 60x60 and 120x60
    const tile60 = CALIBRATION_PRESETS.find((p) => p.id === 'tile_60');
    expect(tile60).toBeDefined();
    expect(tile60?.sizeMeters).toBe(0.60);
    expect(tile60?.category).toBe('tile');

    const tile120 = CALIBRATION_PRESETS.find((p) => p.id === 'tile_120_60');
    expect(tile120).toBeDefined();
    expect(tile120?.sizeMeters).toBe(1.20);
    expect(tile120?.category).toBe('tile');

    // Doors / Ościeżnice
    const doorW = CALIBRATION_PRESETS.find((p) => p.id === 'door_width');
    expect(doorW).toBeDefined();
    expect(doorW?.sizeMeters).toBe(0.80);
    expect(doorW?.category).toBe('door');

    const doorH = CALIBRATION_PRESETS.find((p) => p.id === 'door_height');
    expect(doorH).toBeDefined();
    expect(doorH?.sizeMeters).toBe(2.05);
    expect(doorH?.orientation).toBe('vertical');

    // Pocket / Paper presets
    const card = CALIBRATION_PRESETS.find((p) => p.id === 'card_iso_width');
    expect(card).toBeDefined();
    expect(card?.sizeMeters).toBe(0.0856);

    const a4 = CALIBRATION_PRESETS.find((p) => p.id === 'a4_length');
    expect(a4).toBeDefined();
    expect(a4?.sizeMeters).toBe(0.297);
  });

  it('accurately calculates frame width and estimated distance for horizontal reference segment', () => {
    // A card (0.0856 m) taking exactly 10% of horizontal frame width
    const pointA = { x: 45, y: 50 };
    const pointB = { x: 55, y: 50 }; // dx = 10%, dy = 0

    const result = calculateCalibratedScale(pointA, pointB, 0.0856, 16 / 9, 68);

    expect(result.isValid).toBe(true);
    // 0.0856 / 0.1 = 0.856 m frame width
    expect(result.visibleFrameWidthMeters).toBeCloseTo(0.856, 3);
    // height = 0.856 / (16/9) = ~0.4815 m
    expect(result.visibleFrameHeightMeters).toBeCloseTo(0.856 / (16 / 9), 3);
    // Estimated distance: W / (2 * tan(34 deg)) ~ 0.856 / (2 * 0.6745) ~ 0.634 m
    expect(result.estimatedDistanceMeters).toBeGreaterThan(0.5);
    expect(result.estimatedDistanceMeters).toBeLessThan(0.8);
  });

  it('accurately calculates frame dimensions for mobile photo aspect ratio 4:3', () => {
    // 1m level taking 50% of 4:3 frame horizontally
    const pointA = { x: 25, y: 50 };
    const pointB = { x: 75, y: 50 };
    const result = calculateCalibratedScale(pointA, pointB, 1.0, 4 / 3, 68);

    expect(result.isValid).toBe(true);
    // Width should be 1.0 / 0.5 = 2.0 m
    expect(result.visibleFrameWidthMeters).toBeCloseTo(2.0, 2);
    // Height for 4:3 should be 2.0 / (4/3) = 1.5 m
    expect(result.visibleFrameHeightMeters).toBeCloseTo(1.5, 2);
  });

  it('accurately calculates frame dimensions for diagonal reference segment with aspect ratio', () => {
    // 1m segment across diagonal
    const pointA = { x: 10, y: 10 };
    const pointB = { x: 40, y: 50 }; // dx = 30%, dy = 40%
    const result = calculateCalibratedScale(pointA, pointB, 1.0, 16 / 9, 68);

    expect(result.isValid).toBe(true);
    expect(result.visibleFrameWidthMeters).toBeGreaterThan(1.5);
    expect(result.pixelRatioPercentagePerMeter).toBeGreaterThan(0);
  });

  it('returns invalid state when points are overlapping or known distance is invalid', () => {
    // Overlapping points
    const p1 = { x: 50, y: 50 };
    const p2 = { x: 50.1, y: 50.1 };
    const resultTooClose = calculateCalibratedScale(p1, p2, 0.1);
    expect(resultTooClose.isValid).toBe(false);
    expect(resultTooClose.errorMessage).toContain('zbyt blisko');

    // Negative or zero distance
    const resultNegative = calculateCalibratedScale({ x: 20, y: 20 }, { x: 60, y: 60 }, -0.5);
    expect(resultNegative.isValid).toBe(false);
    expect(resultNegative.errorMessage).toBeDefined();
  });

  it('applies pitch/tilt trigonometrical perspective correction', () => {
    // When perfectly aligned (90 deg wall alignment), no correction needed
    const uncorrected = applyPitchTiltCorrection(2.0, 90, 90);
    expect(uncorrected).toBe(2.0);

    // If small tilt < 2 deg, ignores jitter
    const smallTilt = applyPitchTiltCorrection(2.0, 89, 90);
    expect(smallTilt).toBe(2.0);

    // If phone tilted by 30 deg (e.g. 60 deg vs nominal 90 deg)
    // cos(30 deg) = sqrt(3)/2 ~ 0.866
    // corrected = 2.0 / 0.866 ~ 2.309
    const tilted30 = applyPitchTiltCorrection(2.0, 60, 90);
    expect(tilted30).toBeCloseTo(2.0 / Math.cos((30 * Math.PI) / 180), 3);

    // Handles null / invalid pitch gracefully
    expect(applyPitchTiltCorrection(2.0, null)).toBe(2.0);
  });

  it('accurately detects low light conditions using analyzeFrameLighting', () => {
    // Simulating dark RGBA buffer (luminance ~ 15/255)
    const darkPixels = new Uint8Array(64 * 36 * 4);
    for (let i = 0; i < darkPixels.length; i += 4) {
      darkPixels[i] = 15;     // R
      darkPixels[i + 1] = 15; // G
      darkPixels[i + 2] = 15; // B
      darkPixels[i + 3] = 255;// A
    }

    const darkAnalysis = analyzeFrameLighting(darkPixels);
    expect(darkAnalysis.isLowLight).toBe(true);
    expect(darkAnalysis.averageLuminance).toBeLessThan(40);
    expect(darkAnalysis.condition).toBe('dark');

    // Simulating normal job site lighting (luminance ~ 120/255)
    const normalPixels = new Uint8Array(64 * 36 * 4);
    for (let i = 0; i < normalPixels.length; i += 4) {
      normalPixels[i] = 120;
      normalPixels[i + 1] = 120;
      normalPixels[i + 2] = 120;
      normalPixels[i + 3] = 255;
    }

    const normalAnalysis = analyzeFrameLighting(normalPixels);
    expect(normalAnalysis.isLowLight).toBe(false);
    expect(normalAnalysis.averageLuminance).toBeGreaterThanOrEqual(40);
    expect(normalAnalysis.condition).toBe('good');
  });
});

