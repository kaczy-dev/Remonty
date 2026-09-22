/**
 * canny-edge-detector.ts
 * Implementacja algorytmu detekcji krawędzi Canny'ego w czystym TypeScript (zero zależności zewnętrznych).
 * Zoptymalizowana pod kątem analizy klatek wideo z kamery w przeglądarce (Canvas 2D / Web Worker).
 *
 * Pipeline:
 * 1. Skala szarości (luminancja Y = 0.299R + 0.587G + 0.114B)
 * 2. Filtr Gaussa 5x5 (redukcja szumu optycznego matrycy telefonu)
 * 3. Gradient Sobela (Gx, Gy, amplituda i kąt nachylenia)
 * 4. Non-Maximum Suppression (zwężenie krawędzi do 1 piksela)
 * 5. Podwójne progowanie i histereza (wykrywanie ciągłych krawędzi styku ściana-podłoga)
 */

export interface CannyOptions {
  lowThreshold?: number; // domyślnie 25
  highThreshold?: number; // domyślnie 60
  gaussianBlur?: boolean; // domyślnie true
}

export interface EdgeDetectionResult {
  width: number;
  height: number;
  edgeData: Uint8Array; // 255 = krawędź, 0 = tło
}

// Jądro Gaussa 5x5 (sigma ~ 1.4) znormalizowane (suma wag = 159)
const GAUSSIAN_KERNEL_5X5 = [
  2, 4, 5, 4, 2,
  4, 9, 12, 9, 4,
  5, 12, 15, 12, 5,
  4, 9, 12, 9, 4,
  2, 4, 5, 4, 2,
];
const GAUSSIAN_KERNEL_SUM = 159;

/**
 * Przetwarza bufor pikseli RGBA do jednokanałowej maski krawędzi Canny'ego
 */
export function detectEdgesCanny(
  rgbaData: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: CannyOptions = {}
): EdgeDetectionResult {
  const lowThreshold = options.lowThreshold ?? 25;
  const highThreshold = options.highThreshold ?? 60;
  const useBlur = options.gaussianBlur ?? true;

  const totalPixels = width * height;
  const grayscale = new Float32Array(totalPixels);

  // Krok 1: Konwersja RGBA do skali szarości
  for (let i = 0, p = 0; i < rgbaData.length; i += 4, p++) {
    grayscale[p] = 0.299 * rgbaData[i] + 0.587 * rgbaData[i + 1] + 0.114 * rgbaData[i + 2];
  }

  // Krok 2: Opcjonalny splot z jądrem Gaussa 5x5 (redukcja szumu)
  let blurred = grayscale;
  if (useBlur && width >= 5 && height >= 5) {
    blurred = new Float32Array(totalPixels);
    for (let y = 2; y < height - 2; y++) {
      const yOffset = y * width;
      for (let x = 2; x < width - 2; x++) {
        let sum = 0;
        let kIdx = 0;
        for (let ky = -2; ky <= 2; ky++) {
          const rowOffset = (y + ky) * width;
          for (let kx = -2; kx <= 2; kx++) {
            sum += grayscale[rowOffset + (x + kx)] * GAUSSIAN_KERNEL_5X5[kIdx++];
          }
        }
        blurred[yOffset + x] = sum / GAUSSIAN_KERNEL_SUM;
      }
    }
  }

  // Krok 3: Gradient Sobela (Gx i Gy)
  const magnitude = new Float32Array(totalPixels);
  const direction = new Uint8Array(totalPixels); // Kąty kwantowane: 0 (0°/180°), 1 (45°), 2 (90°), 3 (135°)

  for (let y = 1; y < height - 1; y++) {
    const yRow = y * width;
    const yPrev = (y - 1) * width;
    const yNext = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      // Maska Sobela X:
      // [-1  0  1]
      // [-2  0  2]
      // [-1  0  1]
      const gx =
        -1 * blurred[yPrev + (x - 1)] + 1 * blurred[yPrev + (x + 1)] +
        -2 * blurred[yRow + (x - 1)]  + 2 * blurred[yRow + (x + 1)] +
        -1 * blurred[yNext + (x - 1)] + 1 * blurred[yNext + (x + 1)];

      // Maska Sobela Y:
      // [-1 -2 -1]
      // [ 0  0  0]
      // [ 1  2  1]
      const gy =
        -1 * blurred[yPrev + (x - 1)] - 2 * blurred[yPrev + x] - 1 * blurred[yPrev + (x + 1)] +
         1 * blurred[yNext + (x - 1)] + 2 * blurred[yNext + x] + 1 * blurred[yNext + (x + 1)];

      const mag = Math.hypot(gx, gy);
      magnitude[yRow + x] = mag;

      // Wyznaczanie zorientowanego kąta gradientu
      let angle = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (angle < 0) angle += 180;

      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
        direction[yRow + x] = 0; // Krawędź pionowa (gradient poziomy)
      } else if (angle >= 22.5 && angle < 67.5) {
        direction[yRow + x] = 1; // 45°
      } else if (angle >= 67.5 && angle < 112.5) {
        direction[yRow + x] = 2; // Krawędź pozioma (gradient pionowy)
      } else {
        direction[yRow + x] = 3; // 135°
      }
    }
  }

  // Krok 4: Non-Maximum Suppression (pocienianie krawędzi)
  const suppressed = new Float32Array(totalPixels);
  for (let y = 1; y < height - 1; y++) {
    const yRow = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = yRow + x;
      const mag = magnitude[idx];
      const dir = direction[idx];

      let q = 0;
      let r = 0;

      if (dir === 0) {
        // Poziomy gradient (porównaj lewy i prawy)
        q = magnitude[idx + 1];
        r = magnitude[idx - 1];
      } else if (dir === 1) {
        // Kąt 45° (przekątna)
        q = magnitude[idx - width + 1];
        r = magnitude[idx + width - 1];
      } else if (dir === 2) {
        // Pionowy gradient (porównaj góra i dół)
        q = magnitude[idx - width];
        r = magnitude[idx + width];
      } else if (dir === 3) {
        // Kąt 135° (druga przekątna)
        q = magnitude[idx - width - 1];
        r = magnitude[idx + width + 1];
      }

      if (mag >= q && mag >= r) {
        suppressed[idx] = mag;
      } else {
        suppressed[idx] = 0;
      }
    }
  }

  // Krok 5: Histereza progowa (podwójny próg i propagacja krawędzi)
  // 255 = silna krawędź, 50 = słaba krawędź, 0 = brak
  const edges = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const val = suppressed[i];
    if (val >= highThreshold) {
      edges[i] = 255;
    } else if (val >= lowThreshold) {
      edges[i] = 50;
    } else {
      edges[i] = 0;
    }
  }

  // Śledzenie krawędzi przez histerezę (DFS/BFS sąsiedztwa 8-spójnego)
  for (let y = 1; y < height - 1; y++) {
    const yRow = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = yRow + x;
      if (edges[idx] === 50) {
        // Sprawdź czy sąsiaduje z silną krawędzią (255)
        const hasStrongNeighbor =
          edges[idx - width - 1] === 255 ||
          edges[idx - width] === 255 ||
          edges[idx - width + 1] === 255 ||
          edges[idx - 1] === 255 ||
          edges[idx + 1] === 255 ||
          edges[idx + width - 1] === 255 ||
          edges[idx + width] === 255 ||
          edges[idx + width + 1] === 255;

        edges[idx] = hasStrongNeighbor ? 255 : 0;
      }
    }
  }

  return {
    width,
    height,
    edgeData: edges,
  };
}

/**
 * Szuka najbliższej wykrytej krawędzi wokół zadanego punktu (% kadru).
 * Zwraca nowe współrzędne z przyciągnięciem, jeśli w promieniu poszukiwania znaleziono krawędź.
 *
 * @param point - współrzędne w % (0..100)
 * @param edgeResult - maska krawędzi wygenerowana przez detectEdgesCanny
 * @param searchRadiusPixels - promień poszukiwania w pikselach (domyślnie 12 px)
 */
export function findNearestEdgePoint(
  point: { x: number; y: number },
  edgeResult: EdgeDetectionResult | null,
  searchRadiusPixels: number = 12
): { snappedPoint: { x: number; y: number }; isSnapped: boolean; distancePixels: number } {
  if (!edgeResult || !edgeResult.edgeData || edgeResult.width === 0 || edgeResult.height === 0) {
    return { snappedPoint: { ...point }, isSnapped: false, distancePixels: 0 };
  }

  const { width, height, edgeData } = edgeResult;
  // Konwersja % na współrzędne w pikselach klatki detekcji
  const px = Math.round((point.x / 100) * width);
  const py = Math.round((point.y / 100) * height);

  let closestDistSq = Infinity;
  let bestX = px;
  let bestY = py;

  const minX = Math.max(0, px - searchRadiusPixels);
  const maxX = Math.min(width - 1, px + searchRadiusPixels);
  const minY = Math.max(0, py - searchRadiusPixels);
  const maxY = Math.min(height - 1, py + searchRadiusPixels);
  const maxRadiusSq = searchRadiusPixels * searchRadiusPixels;

  for (let y = minY; y <= maxY; y++) {
    const yOffset = y * width;
    for (let x = minX; x <= maxX; x++) {
      if (edgeData[yOffset + x] === 255) {
        const dx = x - px;
        const dy = y - py;
        const distSq = dx * dx + dy * dy;
        if (distSq < closestDistSq && distSq <= maxRadiusSq) {
          closestDistSq = distSq;
          bestX = x;
          bestY = y;
        }
      }
    }
  }

  if (closestDistSq !== Infinity) {
    return {
      snappedPoint: {
        x: Math.round(((bestX / width) * 100) * 10) / 10,
        y: Math.round(((bestY / height) * 100) * 10) / 10,
      },
      isSnapped: true,
      distancePixels: Math.sqrt(closestDistSq),
    };
  }

  return { snappedPoint: { ...point }, isSnapped: false, distancePixels: 0 };
}
