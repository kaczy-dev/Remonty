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
