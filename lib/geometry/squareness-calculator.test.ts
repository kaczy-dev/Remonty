import { describe, expect, it } from 'vitest';
import {
  calculateIdealDiagonal,
  evaluateDiagonals,
  evaluateRule345,
  evaluateCornerHeights,
  formatRoomSummaryForClipboard,
} from './squareness-calculator';

describe('squareness-calculator', () => {
  describe('calculateIdealDiagonal', () => {
    it('calculates the Pythagorean diagonal accurately for a 3x4m room', () => {
      // 3^2 + 4^2 = 9 + 16 = 25 => sqrt(25) = 5
      const diag = calculateIdealDiagonal(3.0, 4.0);
      expect(diag).toBe(5.0);
    });

    it('calculates diagonal for arbitrary metric dimensions with millimeter precision', () => {
      // 4.80m x 5.90m => sqrt(4.8^2 + 5.9^2) = sqrt(23.04 + 34.81) = sqrt(57.85) ~ 7.6059... => 7.606
      const diag = calculateIdealDiagonal(4.8, 5.9);
      expect(diag).toBe(7.606);
    });

    it('returns 0 for non-positive dimensions', () => {
      expect(calculateIdealDiagonal(0, 5)).toBe(0);
      expect(calculateIdealDiagonal(-3, 4)).toBe(0);
    });
  });

  describe('evaluateDiagonals', () => {
    it('returns ideal status when D1 and D2 difference <= 5 mm (PN-B-10100)', () => {
      // Ideal for 3x4 is 5.0m
      // Let D1 = 5.002, D2 = 5.005 => diff = 3 mm <= 5 mm
      const res = evaluateDiagonals(3.0, 4.0, 5.002, 5.005);
      expect(res.quality).toBe('ideal');
      expect(res.differenceMm).toBe(3);
      expect(res.statusLabel).toBe('Idealny kąt prosty (odchyłka w normie PN-B-10100)');
      expect(res.cornerAngleDeg).toBeDefined();
      expect(res.cornerAngleDeg).toBeCloseTo(90, 0);
    });

    it('returns minor skew status when difference is between 6 and 15 mm', () => {
      // D1 = 5.000, D2 = 5.012 => diff = 12 mm
      const res = evaluateDiagonals(3.0, 4.0, 5.0, 5.012);
      expect(res.quality).toBe('minor_skew');
      expect(res.differenceMm).toBe(12);
      expect(res.statusLabel).toBe('Drobny skos (do wyrównania klejem lub tynkiem)');
    });

    it('returns out_of_square status when difference > 15 mm', () => {
      // D1 = 4.980, D2 = 5.025 => diff = 45 mm
      const res = evaluateDiagonals(3.0, 4.0, 4.98, 5.025);
      expect(res.quality).toBe('out_of_square');
      expect(res.differenceMm).toBe(45);
      expect(res.statusLabel).toBe('Wyraźny brak kąta prostego (wymaga korekty tynkarskiej lub przedścianki G-K)');
      expect(res.recommendation).toContain('przedścianka G-K');
    });

    it('handles single diagonal comparison against ideal calculation', () => {
      // Room 3x4 => ideal 5.000m. Given D1 = 5.004m => deviation = 4mm => ideal
      const res = evaluateDiagonals(3.0, 4.0, 5.004);
      expect(res.differenceMm).toBe(4);
      expect(res.deviationD1Mm).toBe(4);
      expect(res.quality).toBe('ideal');
    });
  });

  describe('evaluateRule345', () => {
    it('accurately verifies a 3-4-5 m check', () => {
      const res = evaluateRule345(3.0, 4.0, 5.0);
      expect(res.idealHypotenuseM).toBe(5.0);
      expect(res.differenceMm).toBe(0);
      expect(res.quality).toBe('ideal');
      expect(res.angleDeg).toBe(90);
    });

    it('detects skew on 60cm - 80cm - 100cm standard builder triangle', () => {
      // 0.60m and 0.80m => ideal is 1.00m
      // Measured is 1.015m (15 mm out)
      const res = evaluateRule345(0.6, 0.8, 1.015);
      expect(res.idealHypotenuseM).toBe(1.0);
      expect(res.differenceMm).toBe(15);
      expect(res.quality).toBe('out_of_square');
      expect(res.angleDeg).toBeGreaterThan(90);
    });
  });

  describe('evaluateCornerHeights', () => {
    it('evaluates level room with minor drop <= 10mm', () => {
      const res = evaluateCornerHeights({
        nw: 2.65,
        ne: 2.655,
        se: 2.652,
        sw: 2.65,
      });
      expect(res.differenceMm).toBe(5);
      expect(res.quality).toBe('level');
      expect(res.avgHeightM).toBeCloseTo(2.652, 2);
    });

    it('flags significant ceiling drop (> 25mm)', () => {
      const res = evaluateCornerHeights({
        nw: 2.6,
        ne: 2.64,
        se: 2.61,
        sw: 2.65,
      });
      expect(res.differenceMm).toBe(50); // 2.65 - 2.60 = 0.05m = 50mm
      expect(res.quality).toBe('significant_drop');
      expect(res.recommendation).toContain('sufit podwieszany');
    });
  });

  describe('formatRoomSummaryForClipboard', () => {
    it('creates formatted multi-line summary string for WhatsApp/SMS', () => {
      const text = formatRoomSummaryForClipboard({
        roomName: 'Salon',
        widthM: 4.8,
        lengthM: 5.9,
        heightM: 2.65,
        areaM2: 28.32,
        perimeterM: 21.4,
        wallAreaNettoM2: 51.2,
        openingsCount: 2,
        openingsAreaM2: 5.5,
        diagonalCheck: {
          d1M: 7.61,
          d2M: 7.62,
          differenceMm: 10,
          quality: 'minor_skew',
        },
      });

      expect(text).toContain('Salon: 4.80m x 5.90m, H=2.65m | Pow. podłogi: 28.32m², Obwód: 21.40m, Pow. ścian netto: 51.2m²');
      expect(text).toContain('Otwory ścienne: 2 szt. (-5.50 m² stolarki)');
      expect(text).toContain('Przekątne: D1=7.61m, D2=7.62m, Δ=10mm');
    });
  });
});
