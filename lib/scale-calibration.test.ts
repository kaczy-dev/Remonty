import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_PRESETS,
  calculateCalibratedScale,
  applyPitchTiltCorrection,
} from './scale-calibration';

describe('scale-calibration utility', () => {
  it('contains expected standard calibration presets for Polish construction standard', () => {
    const card = CALIBRATION_PRESETS.find((p) => p.id === 'card_iso_width');
    expect(card).toBeDefined();
    expect(card?.sizeMeters).toBe(0.0856);

    const a4 = CALIBRATION_PRESETS.find((p) => p.id === 'a4_length');
    expect(a4).toBeDefined();
    expect(a4?.sizeMeters).toBe(0.297);

    const tile60 = CALIBRATION_PRESETS.find((p) => p.id === 'tile_60');
    expect(tile60).toBeDefined();
    expect(tile60?.sizeMeters).toBe(0.6);

    const door = CALIBRATION_PRESETS.find((p) => p.id === 'door_width');
    expect(door).toBeDefined();
    expect(door?.sizeMeters).toBe(0.8);
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
});
