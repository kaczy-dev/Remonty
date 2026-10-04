/**
 * scale-calibration.ts
 * Narzędzia i algorytmy referencyjnej kalibracji skali optycznej dla modułu pomiarowego.
 * Umożliwia wyznaczenie rzeczywistej skali w metrach na podstawie znanych obiektów referencyjnych
 * (np. karta płatnicza ISO ID-1, kartka A4, standardowe płytki, drzwi) lub wymiaru własnego.
 */

export type CalibrationPresetId =
  | 'level_60'
  | 'level_100'
  | 'level_120'
  | 'drywall_120'
  | 'tile_60'
  | 'tile_120_60'
  | 'tile_30'
  | 'door_width'
  | 'door_height'
  | 'card_iso_width'
  | 'card_iso_height'
  | 'a4_length'
  | 'a4_width'
  | 'custom';

export type CalibrationCategory = 'tool' | 'board' | 'tile' | 'door' | 'card' | 'paper' | 'custom';

export interface CalibrationPreset {
  id: CalibrationPresetId;
  label: string;
  sublabel: string;
  sizeMeters: number;
  category: CalibrationCategory;
  description: string;
  orientation?: 'horizontal' | 'vertical';
}

export const CALIBRATION_PRESETS: CalibrationPreset[] = [
  {
    id: 'level_100',
    label: 'Poziomica budowlana 100 cm',
    sublabel: '1.00 m (1 metr bieżący)',
    sizeMeters: 1.0,
    category: 'tool',
    description: 'Klasyczna poziomica lub łata murarska metrowa – podstawowy wzorzec na budowie.',
    orientation: 'horizontal',
  },
  {
    id: 'level_60',
    label: 'Poziomica budowlana 60 cm',
    sublabel: '0.60 m (poziomica 60 cm)',
    sizeMeters: 0.6,
    category: 'tool',
    description: 'Kompaktowa poziomica glazurnicza / instalatorska 60 cm.',
    orientation: 'horizontal',
  },
  {
    id: 'level_120',
    label: 'Poziomica budowlana 120 cm',
    sublabel: '1.20 m (długa poziomica)',
    sizeMeters: 1.2,
    category: 'tool',
    description: 'Długa poziomica aluminiowa 120 cm do precyzyjnych prac wykończeniowych.',
    orientation: 'horizontal',
  },
  {
    id: 'drywall_120',
    label: 'Płyta G-K (Szerokość)',
    sublabel: '1.20 m (standard 1200 mm)',
    sizeMeters: 1.2,
    category: 'board',
    description: 'Fabryczna szerokość standardowej płyty gipsowo-kartonowej (120 cm).',
    orientation: 'horizontal',
  },
  {
    id: 'tile_60',
    label: 'Płytka / Gres 60×60 cm',
    sublabel: '0.60 m (krawędź płytki)',
    sizeMeters: 0.6,
    category: 'tile',
    description: 'Popularny format płytki gresowej podłogowej lub ściennej 60×60 cm.',
    orientation: 'horizontal',
  },
  {
    id: 'tile_120_60',
    label: 'Płytka / Gres 120×60 cm (Dłuższy bok)',
    sublabel: '1.20 m (dłuższy bok gresu)',
    sizeMeters: 1.2,
    category: 'tile',
    description: 'Wielkoformatowy gres 120×60 cm – pomiar wzdłuż dłuższego boku.',
    orientation: 'horizontal',
  },
  {
    id: 'tile_30',
    label: 'Płytka ceramiczna 30×30 cm',
    sublabel: '0.30 m (krawędź płytki)',
    sizeMeters: 0.3,
    category: 'tile',
    description: 'Standardowa płytka łazienkowa / kuchenna 30 cm.',
    orientation: 'horizontal',
  },
  {
    id: 'door_width',
    label: 'Skrzydło / Ościeżnica (Szerokość)',
    sublabel: '0.80 m (norma budowlana "80")',
    sizeMeters: 0.8,
    category: 'door',
    description: 'Typowa szerokość skrzydła drzwi wewnętrznych w świetle ościeżnicy.',
    orientation: 'horizontal',
  },
  {
    id: 'door_height',
    label: 'Otwór drzwiowy / Skrzydło (Wysokość)',
    sublabel: '2.05 m (standard ościeżnicy)',
    sizeMeters: 2.05,
    category: 'door',
    description: 'Standardowa wysokość skrzydła lub otworu drzwiowego.',
    orientation: 'vertical',
  },
  {
    id: 'card_iso_width',
    label: 'Karta Płatnicza / Dowód (Szerokość)',
    sublabel: '85.60 mm (ISO/IEC 7810 ID-1)',
    sizeMeters: 0.0856,
    category: 'card',
    description: 'Wzorzec kieszonkowy (karta bankowa, prawo jazdy, dowód osobisty).',
    orientation: 'horizontal',
  },
  {
    id: 'card_iso_height',
    label: 'Karta Płatnicza (Wysokość)',
    sublabel: '53.98 mm (ISO/IEC 7810 ID-1)',
    sizeMeters: 0.05398,
    category: 'card',
    description: 'Krótsza krawędź karty bankowej.',
    orientation: 'vertical',
  },
  {
    id: 'a4_length',
    label: 'Arkusz A4 (Dłuższy bok)',
    sublabel: '29.7 cm (297 mm, standard ISO 216)',
    sizeMeters: 0.297,
    category: 'paper',
    description: 'Standardowa kartka papieru biurowego A4 przyłożona do płaszczyzny.',
    orientation: 'horizontal',
  },
  {
    id: 'a4_width',
    label: 'Arkusz A4 (Krótszy bok)',
    sublabel: '21.0 cm (210 mm, standard ISO 216)',
    sizeMeters: 0.21,
    category: 'paper',
    description: 'Szerokość kartki papieru A4.',
    orientation: 'horizontal',
  },
  {
    id: 'custom',
    label: 'Własny wymiar referencyjny',
    sublabel: 'Zdefiniuj długość w cm / metrach',
    sizeMeters: 1.0,
    category: 'custom',
    description: 'Dowolny znany odcinek (np. długość mebla, profilu lub odcinek taśmy).',
    orientation: 'horizontal',
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

export interface CameraLevelnessResult {
  isLevel: boolean;
  status: 'perfect' | 'acceptable' | 'tilted';
  pitchDeviationDeg: number;
  rollDeviationDeg: number;
  guidanceMessage: string;
}

/**
 * Ocenia wypoziomowanie aparatu telefonu podczas celowania w ścianę lub posadzkę.
 * Zwraca status wirtualnej poziomnicy bąbelkowej oraz czytelny komunikat dla wykonawcy.
 */
export function evaluateCameraLevelness(
  pitchDeg: number | null,
  rollDeg: number | null,
  targetSurface: 'wall' | 'floor' = 'wall'
): CameraLevelnessResult {
  if (pitchDeg === null && rollDeg === null) {
    return {
      isLevel: true,
      status: 'acceptable',
      pitchDeviationDeg: 0,
      rollDeviationDeg: 0,
      guidanceMessage: 'Brak odczytu sensorów żyroskopowych',
    };
  }

  const nominalPitch = targetSurface === 'wall' ? 90 : 0;
  const pitchDev = pitchDeg !== null && Number.isFinite(pitchDeg)
    ? Math.abs(pitchDeg - nominalPitch)
    : 0;
  const rollDev = rollDeg !== null && Number.isFinite(rollDeg)
    ? Math.abs(rollDeg)
    : 0;

  const roundedPitchDev = Math.round(pitchDev * 10) / 10;
  const roundedRollDev = Math.round(rollDev * 10) / 10;

  // Progi: <1.5 st = idealny pion/poziom, <5 st = dopuszczalny, >=5 st = ostrzeżenie
  if (roundedPitchDev <= 1.5 && roundedRollDev <= 1.5) {
    return {
      isLevel: true,
      status: 'perfect',
      pitchDeviationDeg: roundedPitchDev,
      rollDeviationDeg: roundedRollDev,
      guidanceMessage: 'Aparat w idealnym pionie (±1.5°)',
    };
  }

  if (roundedPitchDev <= 5.0 && roundedRollDev <= 5.0) {
    return {
      isLevel: true,
      status: 'acceptable',
      pitchDeviationDeg: roundedPitchDev,
      rollDeviationDeg: roundedRollDev,
      guidanceMessage: 'Dopuszczalne pochylenie – aktywna kompensacja',
    };
  }

  // Wskazówka kierunkowa
  const hints: string[] = [];
  if (pitchDeg !== null && roundedPitchDev > 5.0) {
    if (pitchDeg < nominalPitch) hints.push(`Pochyl telefon w przód o ${roundedPitchDev}°`);
    else hints.push(`Pochyl telefon w tył o ${roundedPitchDev}°`);
  }
  if (rollDeg !== null && roundedRollDev > 5.0) {
    if (rollDeg > 0) hints.push(`Przechyl w lewo o ${roundedRollDev}°`);
    else hints.push(`Przechyl w prawo o ${roundedRollDev}°`);
  }

  return {
    isLevel: false,
    status: 'tilted',
    pitchDeviationDeg: roundedPitchDev,
    rollDeviationDeg: roundedRollDev,
    guidanceMessage: hints.join(', ') || 'Skoryguj ułożenie telefonu',
  };
}

/**
 * 2D Fuzja sensorów: Koryguje wektor odległości (dx, dy) w metrach
 * uwzględniając jednoczesne nachylenie (Pitch) i przechył boczny (Roll).
 */
export function applyPerspectiveCompensation2D(
  dxMeters: number,
  dyMeters: number,
  pitchDeg: number | null,
  rollDeg: number | null,
  targetSurface: 'wall' | 'floor' = 'wall'
): { correctedDxM: number; correctedDyM: number; distanceM: number } {
  const nominalPitch = targetSurface === 'wall' ? 90 : 0;
  let correctedDy = dyMeters;
  let correctedDx = dxMeters;

  // Korekta pionowa (Pitch)
  if (pitchDeg !== null && Number.isFinite(pitchDeg)) {
    const pitchDelta = Math.min(60, Math.max(0, Math.abs(pitchDeg - nominalPitch)));
    if (pitchDelta >= 2.0) {
      const cosPitch = Math.cos((pitchDelta * Math.PI) / 180);
      if (cosPitch >= 0.2) {
        correctedDy = dyMeters / cosPitch;
      }
    }
  }

  // Korekta pozioma (Roll)
  if (rollDeg !== null && Number.isFinite(rollDeg)) {
    const rollDelta = Math.min(60, Math.max(0, Math.abs(rollDeg)));
    if (rollDelta >= 2.0) {
      const cosRoll = Math.cos((rollDelta * Math.PI) / 180);
      if (cosRoll >= 0.2) {
        correctedDx = dxMeters / cosRoll;
      }
    }
  }

  const distance = Math.hypot(correctedDx, correctedDy);
  return {
    correctedDxM: Math.round(correctedDx * 1000) / 1000,
    correctedDyM: Math.round(correctedDy * 1000) / 1000,
    distanceM: Math.round(distance * 1000) / 1000,
  };
}
