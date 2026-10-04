import { describe, expect, it } from 'vitest';
import {
  validatePolygonGeometry,
  doSegmentsIntersect,
  snapPointToOrtho,
  calculatePolygonCornerAngles,
  autoSquarePolygon,
} from './polygon-validator';

describe('polygon-validator CAD and Geometry Features', () => {
  describe('Intersection and Geometry Checks', () => {
    it('detects intersecting line segments', () => {
      expect(
        doSegmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })
      ).toBe(true);
      expect(
        doSegmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })
      ).toBe(false);
    });

    it('requires at least 3 vertices', () => {
      const res = validatePolygonGeometry([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('co najmniej 3');
    });
  });

  describe('snapPointToOrtho (CAD Magnetic Ortho Snapping)', () => {
    const anchor = { x: 50, y: 50 };

    it('snaps near-horizontal point to exact horizontal axis', () => {
      // Point with 2° elevation above anchor
      const candidate = { x: 80, y: 51.0 };
      const snapped = snapPointToOrtho(candidate, anchor, 4.5);

      expect(snapped.isSnapped).toBe(true);
      expect(snapped.guideAxis).toBe('horizontal');
      expect(snapped.point.y).toBe(anchor.y);
      expect(snapped.snapAngleDeg).toBe(0);
    });

    it('snaps near-vertical point to exact vertical axis', () => {
      // Point slightly tilted from vertical (90°)
      const candidate = { x: 51.2, y: 85 };
      const snapped = snapPointToOrtho(candidate, anchor, 5.0);

      expect(snapped.isSnapped).toBe(true);
      expect(snapped.guideAxis).toBe('vertical');
      expect(snapped.point.x).toBe(anchor.x);
      expect(snapped.snapAngleDeg).toBe(90);
    });

    it('snaps near 45-degree diagonal point', () => {
      // Candidate at ~44 degrees
      const candidate = { x: 70, y: 69 };
      const snapped = snapPointToOrtho(candidate, anchor, 5.0);

      expect(snapped.isSnapped).toBe(true);
      expect(snapped.guideAxis).toBe('diagonal_45');
      expect(snapped.snapAngleDeg).toBe(45);
    });

    it('does not snap if deviation exceeds threshold', () => {
      // 25 degrees from horizontal (too far for 4.5° threshold)
      const candidate = { x: 75, y: 62 };
      const snapped = snapPointToOrtho(candidate, anchor, 4.5);

      expect(snapped.isSnapped).toBe(false);
      expect(snapped.point).toEqual(candidate);
    });
  });

  describe('calculatePolygonCornerAngles', () => {
    it('calculates 90 degree corners for a perfect rectangle', () => {
      const rect = [
        { x: 10, y: 10 },
        { x: 60, y: 10 },
        { x: 60, y: 40 },
        { x: 10, y: 40 },
      ];

      const angles = calculatePolygonCornerAngles(rect, 1.0);
      expect(angles).toHaveLength(4);
      angles.forEach((corner) => {
        expect(corner.angleDeg).toBeCloseTo(90, 0);
        expect(corner.isRightAngle).toBe(true);
      });
    });
  });

  describe('autoSquarePolygon', () => {
    it('squares near-right-angled corners in a slightly skewed room outline', () => {
      // Skewed rectangle where point 2 is slightly off (y=11 instead of 10)
      const skewed = [
        { x: 10, y: 10 },
        { x: 60, y: 11 }, // slightly skewed corner (~1.1° off)
        { x: 60, y: 40 },
        { x: 10, y: 40 },
      ];

      const squared = autoSquarePolygon(skewed, 3.5);
      expect(squared[1].y).toBe(10); // Straightened to match vertex 0
      expect(validatePolygonGeometry(squared).isValid).toBe(true);
    });
  });
});
