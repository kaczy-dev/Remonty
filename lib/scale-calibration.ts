/**
 * scale-calibration.ts
 * Narzędzia i algorytmy referencyjnej kalibracji skali optycznej dla modułu pomiarowego.
 * Umożliwia wyznaczenie rzeczywistej skali w metrach na podstawie znanych obiektów referencyjnych
 * (np. karta płatnicza ISO ID-1, kartka A4, standardowe płytki, drzwi) lub wymiaru własnego.
 */

export type CalibrationPresetId =
  | 'card_iso_width'
  | 'card_iso_height'
  | 'a4_length'
  | 'a4_width'
  | 'tile_30'
  | 'tile_60'
  | 'door_width'
  | 'door_height'
  | 'custom';

export interface CalibrationPreset {
  id: CalibrationPresetId;
  label: string;
  sublabel: string;
  sizeMeters: number;
  category: 'card' | 'paper' | 'tile' | 'door' | 'custom';
  description: string;
}

export const CALIBRATION_PRESETS: CalibrationPreset[] = [
  {
    id: 'card_iso_width',
    label: 'Karta Płatnicza / Dowód (Szerokość)',
    sublabel: '85.60 mm (ISO/IEC 7810 ID-1)',
    sizeMeters: 0.0856,
    category: 'card',
    description: 'Najpopularniejszy wzorzec w kieszeni (karta bankowa, prawo jazdy, dowód osobisty).',
  },
  {
    id: 'card_iso_height',
    label: 'Karta Płatnicza (Wysokość)',
    sublabel: '53.98 mm (ISO/IEC 7810 ID-1)',
    sizeMeters: 0.05398,
    category: 'card',
    description: 'Krótsza krawędź karty bankowej.',
  },
  {
    id: 'a4_length',
    label: 'Kartka A4 (Dłuższy bok)',
    sublabel: '297.0 mm (standard ISO 216)',
    sizeMeters: 0.297,
    category: 'paper',
    description: 'Standardowa kartka papieru biurowego A4 położona na posadzce lub przy ścianie.',
  },
  {
    id: 'a4_width',
    label: 'Kartka A4 (Krótszy bok)',
    sublabel: '210.0 mm (standard ISO 216)',
    sizeMeters: 0.21,
    category: 'paper',
    description: 'Szerokość kartki papieru A4.',
  },
  {
    id: 'tile_60',
    label: 'Płytka gresowa 60×60 cm',
    sublabel: '60.0 cm (krawędź płytki)',
    sizeMeters: 0.6,
    category: 'tile',
    description: 'Standardowa wielkoformatowa płytka posadzkowa lub ścienna.',
  },
  {
    id: 'tile_30',
    label: 'Płytka ceramiczna 30×30 cm',
    sublabel: '30.0 cm (krawędź płytki)',
    sizeMeters: 0.3,
    category: 'tile',
    description: 'Standardowa płytka łazienkowa / kuchenna.',
  },
  {
    id: 'door_width',
    label: 'Skrzydło drzwiowe (Szerokość)',
    sublabel: '80.0 cm (norma budowlana)',
    sizeMeters: 0.8,
    category: 'door',
    description: 'Typowa szerokość skrzydła drzwi wewnętrznych w świetle ościeżnicy.',
  },
  {
    id: 'door_height',
    label: 'Otwór drzwiowy (Wysokość)',
    sublabel: '205.0 cm (norma budowlana)',
    sizeMeters: 2.05,
    category: 'door',
    description: 'Wysokość skrzydła / ościeżnicy drzwiowej.',
  },
  {
    id: 'custom',
    label: 'Własny wymiar referencyjny',
    sublabel: 'Zdefiniuj długość w metrach / cm',
    sizeMeters: 1.0,
    category: 'custom',
    description: 'Dowolny znany odcinek (np. długość poziomicy, grzejnika lub krawędzi stołu).',
  },
];

export interface Point2D {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
}

export interface CalibrationResult {
  visibleFrameWidthMeters: number;
  visibleFrameHeightMeters: number;
  estimatedDistanceMeters: number;
  pixelRatioPercentagePerMeter: number;
  deltaDistancePercent: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Oblicza skalę kadru optycznego (szerokość i wysokość widocznego wycinka w metrach)
 * oraz szacowaną odległość od obiektywu na podstawie dwóch punktów na obiekcie referencyjnym.
 *
 * @param pointA - punkt początkowy na ekranie (wartości % 0..100)
 * @param pointB - punkt końcowy na ekranie (wartości % 0..100)
 * @param knownDistanceMeters - znana rzeczywista długość odcinka w metrach
 * @param aspectRatio - proporcje kadru (domyślnie 16:9 = ~1.777)
 * @param fovDegrees - kąt widzenia aparatu (Field of View w poziomie, domyślnie 68°)
 */
export function calculateCalibratedScale(
  pointA: Point2D,
  pointB: Point2D,
  knownDistanceMeters: number,
  aspectRatio: number = 16 / 9,
  fovDegrees: number = 68
): CalibrationResult {
  if (knownDistanceMeters <= 0 || !Number.isFinite(knownDistanceMeters)) {
    return {
      visibleFrameWidthMeters: 0,
      visibleFrameHeightMeters: 0,
      estimatedDistanceMeters: 0,
      pixelRatioPercentagePerMeter: 0,
      deltaDistancePercent: 0,
      isValid: false,
      errorMessage: 'Wymiar referencyjny musi być dodatnią liczbą większą od zera.',
    };
  }

  const dxPercent = (pointB.x - pointA.x) / 100;
  const dyPercent = (pointB.y - pointA.y) / 100;

  // Odległość w znormalizowanym układzie kadru (gdzie szerokość = 1, wysokość = 1 / aspectRatio)
  const normDist = Math.hypot(dxPercent, dyPercent / aspectRatio);

  // Zabezpieczenie przed nakładającymi się punktami (mniej niż 0.5% kadru)
  if (normDist < 0.005) {
    return {
      visibleFrameWidthMeters: 0,
      visibleFrameHeightMeters: 0,
      estimatedDistanceMeters: 0,
      pixelRatioPercentagePerMeter: 0,
      deltaDistancePercent: 0,
      isValid: false,
      errorMessage: 'Punkty kalibracyjne są zbyt blisko siebie (min. 0.5% kadru). Rozsuń punkty na obiekcie.',
    };
  }

  // Obliczenie szerokości kadru w metrach:
  // knownDistanceMeters = normDist * visibleFrameWidthMeters
  const visibleFrameWidthMeters = knownDistanceMeters / normDist;
  const visibleFrameHeightMeters = visibleFrameWidthMeters / aspectRatio;

  // Szacowany dystans do ściany/obiektu z modelu pinhole camera:
  // visibleFrameWidthMeters = 2 * D * tan(FOV / 2)
  const fovRad = (fovDegrees * Math.PI) / 180;
  const estimatedDistanceMeters = visibleFrameWidthMeters / (2 * Math.tan(fovRad / 2));

  // Procent kadru przypadający na 1 metr długości poziomej
  const pixelRatioPercentagePerMeter = 100 / visibleFrameWidthMeters;

  return {
    visibleFrameWidthMeters: Math.round(visibleFrameWidthMeters * 10000) / 10000,
    visibleFrameHeightMeters: Math.round(visibleFrameHeightMeters * 10000) / 10000,
    estimatedDistanceMeters: Math.round(estimatedDistanceMeters * 100) / 100,
    pixelRatioPercentagePerMeter: Math.round(pixelRatioPercentagePerMeter * 100) / 100,
    deltaDistancePercent: Math.round(normDist * 1000) / 10,
    isValid: true,
  };
}

/**
 * Kompensacja kąta nachylenia kamery (Pitch compensation).
 * Gdy telefon jest pochylony w stronę podłogi lub sufitu,
 * rzut perspektywiczny skraca wymiary w pionowej osi kadru o współczynnik cos(kąta).
 *
 * @param measuredDyMeters - surowa odległość wyznaczona z pionowej osi kadru
 * @param pitchDegrees - kąt nachylenia z sensora (pitch/beta w stopniach)
 * @param referenceAngleDegrees - nominalny kąt pionu (90° dla ściany pionowej, 0° dla posadzki poziomej)
 */
export function applyPitchTiltCorrection(
  measuredDyMeters: number,
  pitchDegrees: number | null,
  referenceAngleDegrees: number = 90
): number {
  if (pitchDegrees === null || !Number.isFinite(pitchDegrees)) {
    return measuredDyMeters;
  }

  // Różnica kąta od idealnego rzutu prostopadłego
  const deltaAngleDeg = Math.abs(pitchDegrees - referenceAngleDegrees);
  // Ograniczamy maksymalną korektę do kąta 60 stopni, by uniknąć dzielenia przez 0 lub ekstremalnego szumu
  const clampedAngleDeg = Math.min(60, Math.max(0, deltaAngleDeg));

  if (clampedAngleDeg < 2.0) {
    return measuredDyMeters; // brak potrzeby korekty przy odchyleniu mniejszym niż 2 stopnie
  }

  const rad = (clampedAngleDeg * Math.PI) / 180;
  const cosFactor = Math.cos(rad);

  if (cosFactor < 0.2) return measuredDyMeters;

  return measuredDyMeters / cosFactor;
}
