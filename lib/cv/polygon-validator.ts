/**
 * polygon-validator.ts
 * Walidacja geometrii wielokątów pomieszczeń i posadzek.
 * Zapobiega powstawaniu samoprzecinających się wielokątów (tzw. "kokardka" / figura 8),
 * które fałszują obliczenia wzoru Gaussa (Shoelace) i powodują błędy wytłaczania w Three.js.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Sprawdza, czy punkt Q leży na odcinku PR (dla punktów współliniowych)
 */
function onSegment(p: Point2D, q: Point2D, r: Point2D): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

/**
 * Zwraca orientację trójki uporządkowanych punktów (p, q, r):
 * 0 -> współliniowe
 * 1 -> zgodnie z ruchem wskazówek zegara (clockwise)
 * 2 -> przeciwnie do ruchu wskazówek zegara (counter-clockwise)
 */
function getOrientation(p: Point2D, q: Point2D, r: Point2D): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Sprawdza, czy odcinek p1q1 przecina się z odcinkiem p2q2 (z wyłączeniem wspólnych końców)
 */
export function doSegmentsIntersect(p1: Point2D, q1: Point2D, p2: Point2D, q2: Point2D): boolean {
  // Jeśli odcinki dzielą wspólny wierzchołek, nie traktujemy tego jako niepoprawne samoprzecięcie
  const isSharedEndpoint =
    (p1.x === p2.x && p1.y === p2.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (q1.x === p2.x && q1.y === p2.y) ||
    (q1.x === q2.x && q1.y === q2.y);

  if (isSharedEndpoint) return false;

  const o1 = getOrientation(p1, q1, p2);
  const o2 = getOrientation(p1, q1, q2);
  const o3 = getOrientation(p2, q2, p1);
  const o4 = getOrientation(p2, q2, q1);

  // Przypadek ogólny: punkty po przeciwnych stronach prostych
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Przypadki szczególne (współliniowość)
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

export interface PolygonValidationResult {
  isValid: boolean;
  isSelfIntersecting: boolean;
  intersectingSegments?: [number, number]; // indeksy przecinających się krawędzi
  errorMessage?: string;
}

/**
 * Bada czy wielokąt posadzki nie posiada samoprzecięć (self-intersections)
 * oraz czy posiada wystarczającą liczbę wierzchołków (min. 3).
 */
export function validatePolygonGeometry(vertices: Point2D[]): PolygonValidationResult {
  if (vertices.length < 3) {
    return {
      isValid: false,
      isSelfIntersecting: false,
      errorMessage: 'Wielokąt musi posiadać co najmniej 3 wierzchołki.',
    };
  }

  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const q1 = vertices[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Pomiń sąsiednie krawędzie (mają wspólny wierzchołek)
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p2 = vertices[j];
      const q2 = vertices[(j + 1) % n];

      if (doSegmentsIntersect(p1, q1, p2, q2)) {
        return {
          isValid: false,
          isSelfIntersecting: true,
          intersectingSegments: [i, j],
          errorMessage: `Wykryto samoprzecięcie krawędzi #${i + 1} i #${j + 1} (kształt ósemki/kokardki). Dopasuj wierzchołki.`,
        };
      }
    }
  }

  return {
    isValid: true,
    isSelfIntersecting: false,
  };
}

export interface OrthogonalSnapResult {
  point: Point2D;
  isSnapped: boolean;
  snapAngleDeg?: number;
  guideAxis?: 'horizontal' | 'vertical' | 'diagonal_45' | 'diagonal_135';
}

/**
 * Przyciąga ruchomy punkt do osi ortogonalnych (0°, 90°, 180°, 270°) oraz przekątnych (45°, 135°, 225°, 315°)
 * względem punktu bazowego/kotwicy (anchor). Przydatne przy trasowaniu ścian pod kątem prostym w CAD.
 */
export function snapPointToOrtho(
  currentPoint: Point2D,
  anchorPoint: Point2D,
  snapToleranceDeg: number = 4.5
): OrthogonalSnapResult {
  const dx = currentPoint.x - anchorPoint.x;
  const dy = currentPoint.y - anchorPoint.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-4) {
    return { point: { ...currentPoint }, isSnapped: false };
  }

  const angleRad = Math.atan2(dy, dx);
  let angleDeg = (angleRad * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;

  const targetAngles = [
    { deg: 0, axis: 'horizontal' as const },
    { deg: 45, axis: 'diagonal_45' as const },
    { deg: 90, axis: 'vertical' as const },
    { deg: 135, axis: 'diagonal_135' as const },
    { deg: 180, axis: 'horizontal' as const },
    { deg: 225, axis: 'diagonal_45' as const },
    { deg: 270, axis: 'vertical' as const },
    { deg: 315, axis: 'diagonal_135' as const },
    { deg: 360, axis: 'horizontal' as const },
  ];

  for (const target of targetAngles) {
    const diff = Math.abs(angleDeg - target.deg);
    if (diff <= snapToleranceDeg) {
      const snappedRad = (target.deg * Math.PI) / 180;
      let snapX = anchorPoint.x + dist * Math.cos(snappedRad);
      let snapY = anchorPoint.y + dist * Math.sin(snappedRad);

      if (target.axis === 'horizontal') {
        snapY = anchorPoint.y;
      } else if (target.axis === 'vertical') {
        snapX = anchorPoint.x;
      }

      return {
        point: {
          x: Math.round(snapX * 100) / 100,
          y: Math.round(snapY * 100) / 100,
        },
        isSnapped: true,
        snapAngleDeg: target.deg % 360,
        guideAxis: target.axis,
      };
    }
  }

  return {
    point: { ...currentPoint },
    isSnapped: false,
  };
}

export interface CornerAngleResult {
  vertexIndex: number;
  angleDeg: number;
  isRightAngle: boolean;
}

/**
 * Oblicza kąty przy wszystkich wierzchołkach wielokąta i sprawdza czy są prostokątne (90° ± tolerancja).
 */
export function calculatePolygonCornerAngles(
  vertices: Point2D[],
  rightAngleToleranceDeg: number = 2.5
): CornerAngleResult[] {
  const n = vertices.length;
  if (n < 3) return [];

  const results: CornerAngleResult[] = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1e-6 || len2 < 1e-6) {
      results.push({ vertexIndex: i, angleDeg: 180, isRightAngle: false });
      continue;
    }

    const dot = v1x * v2x + v1y * v2y;
    const cross = v1x * v2y - v1y * v2x;

    const rad = Math.atan2(Math.abs(cross), dot);
    const deg = (rad * 180) / Math.PI;

    const isRightAngle = Math.abs(deg - 90) <= rightAngleToleranceDeg;

    results.push({
      vertexIndex: i,
      angleDeg: Math.round(deg * 10) / 10,
      isRightAngle,
    });
  }

  return results;
}

/**
 * Automatyczne "prostowanie" narożników wielokąta:
 * Jeśli kąt narożnika różni się od 90° o mniej niż toleranceDeg,
 * koryguje wierzchołek, aby utworzyć idealny kąt prosty (90°).
 */
export function autoSquarePolygon(
  vertices: Point2D[],
  toleranceDeg: number = 3.5
): Point2D[] {
  if (vertices.length < 3) return vertices;

  const squared: Point2D[] = vertices.map((p) => ({ ...p }));
  const n = squared.length;

  for (let i = 0; i < n; i++) {
    const prev = squared[(i - 1 + n) % n];
    const curr = squared[i];
    const next = squared[(i + 1) % n];

    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const dot = v1x * v2x + v1y * v2y;
    const cross = v1x * v2y - v1y * v2x;
    const deg = (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;

    if (Math.abs(deg - 90) <= toleranceDeg && Math.abs(deg - 90) > 1e-3) {
      const isHorizontal = Math.abs(curr.y - prev.y) < Math.abs(curr.x - prev.x);
      if (isHorizontal) {
        curr.y = prev.y;
      } else {
        curr.x = prev.x;
      }
    }
  }

  if (validatePolygonGeometry(squared).isValid) {
    return squared;
  }

  return vertices;
}
