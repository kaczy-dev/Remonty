import { describe, expect, it } from 'vitest';
import { detectEdgesCanny, findNearestEdgePoint } from './canny-edge-detector';
import { validatePolygonGeometry, doSegmentsIntersect } from './polygon-validator';

describe('canny-edge-detector', () => {
  it('detects a prominent horizontal edge on a synthetic binary image', () => {
    const width = 20;
    const height = 20;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Górna połowa biała (255), dolna połowa czarna (0) -> ostra krawędź na linii y=10
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const color = y < 10 ? 255 : 0;
        rgba[idx] = color;
        rgba[idx + 1] = color;
        rgba[idx + 2] = color;
        rgba[idx + 3] = 255;
      }
    }

    const result = detectEdgesCanny(rgba, width, height, {
      lowThreshold: 20,
      highThreshold: 50,
      gaussianBlur: false, // bezpośredni test gradientu
    });

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);

    // Krawędź powinna być wykryta w okolicy y=9 lub y=10
    let edgeFound = false;
    for (let x = 2; x < width - 2; x++) {
      if (result.edgeData[9 * width + x] === 255 || result.edgeData[10 * width + x] === 255) {
        edgeFound = true;
        break;
      }
    }
    expect(edgeFound).toBe(true);
  });

  it('snaps to nearest detected edge point within search radius', () => {
    const width = 100;
    const height = 100;
    const edgeData = new Uint8Array(width * height);

    // Krawędź na linii poziomej y=50
    for (let x = 0; x < width; x++) {
      edgeData[50 * width + x] = 255;
    }

    const edgeResult = { width, height, edgeData };

    // Punkt w okolicy y=52 (odległość 2 px)
    const snapClose = findNearestEdgePoint({ x: 40, y: 52 }, edgeResult, 10);
    expect(snapClose.isSnapped).toBe(true);
    expect(snapClose.snappedPoint.y).toBe(50); // przyciągnięty do linii y=50%

    // Punkt zbyt daleko (y=80, odległość 30 px > radius 10)
    const snapFar = findNearestEdgePoint({ x: 40, y: 80 }, edgeResult, 10);
    expect(snapFar.isSnapped).toBe(false);
    expect(snapFar.snappedPoint.y).toBe(80);
  });
});

describe('polygon-validator', () => {
  it('correctly identifies intersecting segments', () => {
    // Dwa przecinające się odcinki w kształcie X
    const p1 = { x: 0, y: 0 };
    const q1 = { x: 10, y: 10 };
    const p2 = { x: 0, y: 10 };
    const q2 = { x: 10, y: 0 };

    expect(doSegmentsIntersect(p1, q1, p2, q2)).toBe(true);

    // Dwa odcinki równoległe (brak przecięcia)
    const p3 = { x: 0, y: 0 };
    const q3 = { x: 10, y: 0 };
    const p4 = { x: 0, y: 5 };
    const q4 = { x: 10, y: 5 };

    expect(doSegmentsIntersect(p3, q3, p4, q4)).toBe(false);
  });

  it('validates simple convex and concave polygons as valid without self-intersections', () => {
    // Zwykły prostokąt
    const rect = [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: 10, y: 50 },
    ];
    expect(validatePolygonGeometry(rect).isValid).toBe(true);

    // Kształt litery L
    const lShape = [
      { x: 10, y: 10 },
      { x: 60, y: 10 },
      { x: 60, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 60 },
      { x: 10, y: 60 },
    ];
    expect(validatePolygonGeometry(lShape).isValid).toBe(true);
  });

  it('flags self-intersecting polygon (figure-8 / bowtie shape) as invalid', () => {
    // "Kokardka" - punkty 2 i 4 są skrzyżowane
    const bowtie = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 50, y: 10 },
      { x: 10, y: 50 },
    ];
    const validation = validatePolygonGeometry(bowtie);
    expect(validation.isValid).toBe(false);
    expect(validation.isSelfIntersecting).toBe(true);
    expect(validation.errorMessage).toContain('samoprzecięcie');
  });
});
