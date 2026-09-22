import { describe, expect, it } from 'vitest';
import { calculateAtticMetrics } from './attic-calculator';

describe('attic-calculator', () => {
  it('returns nominal area when room is not an attic', () => {
    const metrics = calculateAtticMetrics(4.0, 5.0, 2.6);
    expect(metrics.isAttic).toBe(false);
    expect(metrics.usableFloorAreaM2).toBe(20.0);
    expect(metrics.slopeAreaM2).toBe(0);
  });

  it('accurately calculates roof slope area and PN-ISO 9836 usable area for single slope', () => {
    // Pokój 4x5m, wysokość 2.6m
    // Ścianka kolankowa 1.0m, kąt dachu 45 st
    // deltaH = 1.6m, przy 45 st slopeRun = 1.6m, slopeLength = 1.6 * sqrt(2) ~ 2.26m
    const metrics = calculateAtticMetrics(4.0, 5.0, 2.6, {
      isAttic: true,
      kneeWallHeightM: 1.0,
      roofPitchDeg: 45,
      slopeWall: 'left', // wzdłuż długości 5.0m
    });

    expect(metrics.isAttic).toBe(true);
    expect(metrics.kneeWallAreaM2).toBe(5.0 * 1.0); // 5 m2
    // Powierzchnia skosu = 5.0 * (1.6 / sin(45)) = 5.0 * 2.2627 ~ 11.31 m2
    expect(metrics.slopeAreaM2).toBeCloseTo(11.31, 1);
    // Powierzchnia użytkowa powinna być mniejsza niż 20 m2 z powodu stref <2.2m
    expect(metrics.usableFloorAreaM2).toBeLessThan(20.0);
    expect(metrics.usableFloorAreaM2).toBeGreaterThan(15.0);

    // Norma architektoniczna PN-ISO 9836 (h >= 1.90m zaliczana w 100%, poniżej 0%)
    expect(metrics.usableFloorAreaArchitecturalM2).toBeDefined();
    expect(metrics.usableFloorAreaArchitecturalM2).toBeLessThan(20.0);
    expect(metrics.usableFloorAreaArchitecturalM2).toBeGreaterThan(14.0);
  });

  it('accurately handles both_sides slopes (dwuspadowy)', () => {
    const metrics = calculateAtticMetrics(4.0, 5.0, 2.6, {
      isAttic: true,
      kneeWallHeightM: 1.0,
      roofPitchDeg: 45,
      slopeWall: 'both_sides',
    });

    expect(metrics.isAttic).toBe(true);
    expect(metrics.kneeWallAreaM2).toBe(10.0); // 2 x 5 m2
    // 2 skosy
    expect(metrics.slopeAreaM2).toBeCloseTo(22.63, 1);
  });
});
