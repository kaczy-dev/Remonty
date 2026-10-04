/**
 * squareness-calculator.ts
 * Narzędzia weryfikacji geometrii pomieszczenia, kątów prostych, przekątnych (PN-B-10100)
 * oraz nierówności stropu/posadzki na budowie.
 */

export type SquarenessQuality = 'ideal' | 'minor_skew' | 'out_of_square';

export interface DiagonalCheckResult {
  widthM: number;
  lengthM: number;
  idealDiagonalM: number; // sqrt(w^2 + l^2)
  d1M?: number; // zmierzona przekątna 1
  d2M?: number; // zmierzona przekątna 2
  differenceMm: number; // |d1 - d2| w mm
  deviationD1Mm?: number; // |d1 - ideal| w mm
  deviationD2Mm?: number; // |d2 - ideal| w mm
  quality: SquarenessQuality;
  statusLabel: string;
  recommendation: string;
  cornerAngleDeg?: number; // obliczony kąt z twierdzenia cosinusów dla d1
  adjacentAngleDeg?: number; // kąt przyległy
}

export interface Rule345Result {
  legAM: number;
  legBM: number;
  idealHypotenuseM: number;
  measuredHypotenuseM?: number;
  differenceMm: number;
  quality: SquarenessQuality;
  statusLabel: string;
  recommendation: string;
  angleDeg?: number;
}

export interface HeightVariationsResult {
  corners: {
    nw: number; // lewy-tył
    ne: number; // prawy-tył
    se: number; // prawy-przód
    sw: number; // lewy-przód
  };
  minHeightM: number;
  maxHeightM: number;
  avgHeightM: number;
  differenceMm: number; // max - min w mm
  quality: 'level' | 'moderate_drop' | 'significant_drop';
  statusLabel: string;
  recommendation: string;
}

/**
 * Oblicza idealną przekątną prostokątnego pomieszczenia ze wzoru pitagorejskiego: sqrt(w^2 + l^2)
 */
export function calculateIdealDiagonal(widthM: number, lengthM: number): number {
  if (widthM <= 0 || lengthM <= 0) return 0;
  return Math.round(Math.hypot(widthM, lengthM) * 1000) / 1000;
}

/**
 * Ocenia prostopadłość ścian na podstawie dwóch zmierzonych przekątnych (D1 i D2).
 * Standardy wg PN-B-10100 / Warunki Techniczne Wykonania i Odbioru Robót:
 * - Różnica <= 5 mm: Idealny kąt prosty (odchyłka w normie PN-B-10100)
 * - Różnica 6-15 mm: Drobny skos (do wyrównania klejem lub tynkiem)
 * - Różnica > 15 mm: Wyraźny brak kąta prostego (wymaga korekty tynkarskiej lub przedścianki G-K)
 */
export function evaluateDiagonals(
  widthM: number,
  lengthM: number,
  d1M?: number,
  d2M?: number
): DiagonalCheckResult {
  const idealDiagonalM = calculateIdealDiagonal(widthM, lengthM);

  const validD1 = typeof d1M === 'number' && d1M > 0 ? d1M : undefined;
  const validD2 = typeof d2M === 'number' && d2M > 0 ? d2M : undefined;

  let differenceMm = 0;
  let devD1Mm: number | undefined;
  let devD2Mm: number | undefined;

  if (validD1 !== undefined) {
    devD1Mm = Math.round(Math.abs(validD1 - idealDiagonalM) * 1000);
  }
  if (validD2 !== undefined) {
    devD2Mm = Math.round(Math.abs(validD2 - idealDiagonalM) * 1000);
  }

  if (validD1 !== undefined && validD2 !== undefined) {
    differenceMm = Math.round(Math.abs(validD1 - validD2) * 1000);
  } else if (validD1 !== undefined) {
    // Jeśli podano tylko jedną przekątną, porównaj z ideałem
    differenceMm = devD1Mm ?? 0;
  } else if (validD2 !== undefined) {
    differenceMm = devD2Mm ?? 0;
  }

  let quality: SquarenessQuality = 'ideal';
  let statusLabel = 'Idealny kąt prosty (odchyłka w normie PN-B-10100)';
  let recommendation =
    'Narożniki trzymają idealny kąt 90°. Można układać płytki lub montować meble od dowolnego narożnika bez ryzyka zbiegającego się klina.';

  if (differenceMm <= 5) {
    quality = 'ideal';
    statusLabel = 'Idealny kąt prosty (odchyłka w normie PN-B-10100)';
    recommendation =
      'Narożniki trzymają kąt 90° z dokładnością do 5 mm. Pełna zgodność z normami budowlanymi dla tynków gipsowych i cementowych.';
  } else if (differenceMm <= 15) {
    quality = 'minor_skew';
    statusLabel = 'Drobny skos (do wyrównania klejem lub tynkiem)';
    recommendation =
      'Drobna odchyłka (6-15 mm). Przed układaniem płytek wielkoformatowych wyrównaj warstwą kleju grubość lub zaciągnij gładzią/tynkiem od narożnika.';
  } else {
    quality = 'out_of_square';
    statusLabel = 'Wyraźny brak kąta prostego (wymaga korekty tynkarskiej lub przedścianki G-K)';
    recommendation =
      'Poważna zbieżność ścian (> 15 mm). Układanie posadzki lub zabudowy meblowej bez korekty spowoduje widoczne cięcia trapezowe (kliny). Zalecana przedścianka G-K lub ponowne wyprowadzenie kąta tynkiem na łatach prowadzących.';
  }

  // Obliczenie kąta w narożniku z twierdzenia cosinusów jeśli podano D1
  let cornerAngleDeg: number | undefined;
  let adjacentAngleDeg: number | undefined;

  const activeDiag = validD1 ?? validD2;
  if (activeDiag && widthM > 0 && lengthM > 0) {
    // cos(gamma) = (w^2 + l^2 - D^2) / (2 * w * l)
    const numerator = widthM * widthM + lengthM * lengthM - activeDiag * activeDiag;
    const denominator = 2 * widthM * lengthM;
    const cosAngle = Math.max(-1, Math.min(1, numerator / denominator));
    const angleRad = Math.acos(cosAngle);
    cornerAngleDeg = Math.round(((angleRad * 180) / Math.PI) * 10) / 10;
    adjacentAngleDeg = Math.round((180 - cornerAngleDeg) * 10) / 10;
  }

  return {
    widthM,
    lengthM,
    idealDiagonalM,
    d1M: validD1,
    d2M: validD2,
    differenceMm,
    deviationD1Mm: devD1Mm,
    deviationD2Mm: devD2Mm,
    quality,
    statusLabel,
    recommendation,
    cornerAngleDeg,
    adjacentAngleDeg,
  };
}

/**
 * Weryfikacja regułą 3-4-5 (odcinki A, B i przeciwprostokątna C)
 * Typowe zestawy na budowie: 30-40-50 cm, 60-80-100 cm, 120-160-200 cm, 3-4-5 m.
 */
export function evaluateRule345(
  legAM: number,
  legBM: number,
  measuredHypotenuseM?: number
): Rule345Result {
  const idealHypotenuseM = Math.round(Math.hypot(legAM, legBM) * 1000) / 1000;
  const validMeasured = typeof measuredHypotenuseM === 'number' && measuredHypotenuseM > 0 ? measuredHypotenuseM : undefined;

  const differenceMm = validMeasured
    ? Math.round(Math.abs(validMeasured - idealHypotenuseM) * 1000)
    : 0;

  let quality: SquarenessQuality = 'ideal';
  let statusLabel = 'Kąt prosty 90° zachowany';
  let recommendation = 'Narożnik trzyma kąt 90°. Można montować stelaże podtynkowe lub zabudowę meblową.';

  if (differenceMm <= 3) {
    quality = 'ideal';
    statusLabel = 'Kąt prosty 90° zachowany (błąd ≤ 3mm)';
    recommendation = 'Wzorcowy kąt prosty w narożniku.';
  } else if (differenceMm <= 10) {
    quality = 'minor_skew';
    statusLabel = 'Lekka odchyłka od kąta 90° (4-10 mm)';
    recommendation = 'Kąt lekko zwichrowany. Skontroluj pion i ewentualnie skoryguj tynkiem.';
  } else {
    quality = 'out_of_square';
    statusLabel = 'Kąt znacznie odbiega od 90° (> 10 mm)';
    recommendation = 'Narożnik ostry lub rozwarty. Wymagana korekta pod konstrukcję meblową lub glazurę.';
  }

  let angleDeg: number | undefined;
  if (validMeasured && legAM > 0 && legBM > 0) {
    const cosAngle = Math.max(
      -1,
      Math.min(1, (legAM * legAM + legBM * legBM - validMeasured * validMeasured) / (2 * legAM * legBM))
    );
    angleDeg = Math.round(((Math.acos(cosAngle) * 180) / Math.PI) * 10) / 10;
  }

  return {
    legAM,
    legBM,
    idealHypotenuseM,
    measuredHypotenuseM: validMeasured,
    differenceMm,
    quality,
    statusLabel,
    recommendation,
    angleDeg,
  };
}

/**
 * Analiza wysokości w 4 rogach pomieszczenia (nierówne stropy / posadzki)
 */
export function evaluateCornerHeights(corners: {
  nw: number; // narożnik lewy-tył (m)
  ne: number; // narożnik prawy-tył (m)
  se: number; // narożnik prawy-przód (m)
  sw: number; // narożnik lewy-przód (m)
}): HeightVariationsResult {
  const vals = [corners.nw, corners.ne, corners.se, corners.sw].filter((v) => v > 0);
  const minHeightM = vals.length > 0 ? Math.min(...vals) : 0;
  const maxHeightM = vals.length > 0 ? Math.max(...vals) : 0;
  const avgHeightM = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000 : 0;
  const differenceMm = Math.round((maxHeightM - minHeightM) * 1000);

  let quality: 'level' | 'moderate_drop' | 'significant_drop' = 'level';
  let statusLabel = 'Strop równy (odchyłka ≤ 10 mm)';
  let recommendation = 'Różnica wysokości w normie. Brak konieczności wyrównywania sufitu.';

  if (differenceMm <= 10) {
    quality = 'level';
    statusLabel = 'Strop i posadzka równe (odchyłka ≤ 10 mm)';
    recommendation = 'Prawidłowy poziom stropu wg PN-B-10100. Płytki i zabudowę sufitową można montować standardowo.';
  } else if (differenceMm <= 25) {
    quality = 'moderate_drop';
    statusLabel = 'Umiarkowany spadek stropu (11-25 mm)';
    recommendation = 'Różnica zauważalna przy szafach pod sufit lub listwach przypodłogowych. Zalecana niwelacja tynkiem lub sufit podwieszany G-K.';
  } else {
    quality = 'significant_drop';
    statusLabel = 'Duży uskok stropu / posadzki (> 25 mm)';
    recommendation = 'Znaczący spadek stropu. Konieczny sufit podwieszany na wieszakach obrotowych z noniuszem lub wylewka samopoziomująca.';
  }

  return {
    corners,
    minHeightM,
    maxHeightM,
    avgHeightM,
    differenceMm,
    quality,
    statusLabel,
    recommendation,
  };
}

export type PlasterCategoryPN = 'kat_I' | 'kat_II' | 'kat_III';

export interface PlasterDeviationAssessment {
  category: PlasterCategoryPN;
  categoryNamePl: string;
  maxAllowedDeviationPerMeterMm: number;
  maxDeviationOnEntireLengthMm: number;
  actualDeviationMm: number;
  deviationPerMeterMm: number;
  isConforming: boolean;
  notesPl: string;
}

/**
 * Ocenia dopuszczalne odchyłki kąta prostego i płaszczyzny tynku wg normy PN-B-10100 / PN-EN 13914.
 * - Kat. I: tynk surowy (odchyłka kąta <= 6 mm/m, max 10 mm na ścianie)
 * - Kat. II: tynk zwykły (odchyłka kąta <= 4 mm/m, max 6 mm na ścianie)
 * - Kat. III: tynk doborowy / gładź gipsowa (odchyłka kąta <= 2 mm/m, max 3 mm na ścianie)
 */
export function evaluatePlasterSquarenessStandard(
  differenceMm: number,
  wallLengthM: number,
  category: PlasterCategoryPN = 'kat_III'
): PlasterDeviationAssessment {
  const length = Math.max(1, wallLengthM);
  const deviationPerMeter = Math.round((differenceMm / length) * 10) / 10;

  const standards = {
    kat_I: {
      name: 'Kategoria I (Tynk surowy)',
      maxPerMeter: 6,
      maxTotal: 10,
    },
    kat_II: {
      name: 'Kategoria II (Tynk zwykły / podkładowy)',
      maxPerMeter: 4,
      maxTotal: 6,
    },
    kat_III: {
      name: 'Kategoria III (Tynk doborowy / gładź)',
      maxPerMeter: 2,
      maxTotal: 3,
    },
  }[category];

  const isConforming =
    deviationPerMeter <= standards.maxPerMeter && differenceMm <= standards.maxTotal;

  const notesPl = isConforming
    ? `Odchyłka ${differenceMm} mm mieści się w rygorystycznej normie PN-B-10100 dla ${standards.name}.`
    : `Odchyłka ${differenceMm} mm (${deviationPerMeter} mm/m) przekracza dopuszczalny limit ${standards.maxTotal} mm dla ${standards.name}. Wymagane szpachlowanie wyrównawcze.`;

  return {
    category,
    categoryNamePl: standards.name,
    maxAllowedDeviationPerMeterMm: standards.maxPerMeter,
    maxDeviationOnEntireLengthMm: standards.maxTotal,
    actualDeviationMm: differenceMm,
    deviationPerMeterMm: deviationPerMeter,
    isConforming,
    notesPl,
  };
}

/**
 * Formatowanie profesjonalnego zestawienia pomiarowego do SMS / WhatsApp dla ekipy budowlanej
 */
export function formatRoomSummaryForClipboard(options: {
  roomName: string;
  widthM: number;
  lengthM: number;
  heightM: number;
  areaM2: number;
  perimeterM: number;
  wallAreaNettoM2: number;
  openingsCount?: number;
  openingsAreaM2?: number;
  isAttic?: boolean;
  atticUsableAreaM2?: number;
  atticSlopeAreaM2?: number;
  diagonalCheck?: {
    d1M?: number;
    d2M?: number;
    differenceMm: number;
    quality: SquarenessQuality;
  };
}): string {
  const parts: string[] = [];

  // Linia 1: Zwięzłe podsumowanie SMS / WhatsApp zgodne z polską praktyką budowlaną
  parts.push(
    `${options.roomName}: ${options.widthM.toFixed(2)}m x ${options.lengthM.toFixed(2)}m, H=${options.heightM.toFixed(2)}m | Pow. podłogi: ${options.areaM2.toFixed(2)}m², Obwód: ${options.perimeterM.toFixed(2)}m, Pow. ścian netto: ${options.wallAreaNettoM2.toFixed(1)}m²`
  );

  if (options.openingsCount && options.openingsCount > 0 && options.openingsAreaM2 !== undefined) {
    parts.push(
      `• Otwory ścienne: ${options.openingsCount} szt. (-${options.openingsAreaM2.toFixed(2)} m² stolarki)`
    );
  }

  if (options.isAttic && options.atticUsableAreaM2 !== undefined) {
    parts.push(
      `• Poddasze (PN-ISO 9836): pow. użytkowa ${options.atticUsableAreaM2.toFixed(2)} m², skosy G-K ${options.atticSlopeAreaM2?.toFixed(2) ?? '0.00'} m²`
    );
  }

  if (options.diagonalCheck && (options.diagonalCheck.d1M || options.diagonalCheck.d2M)) {
    const diagTxt = [
      options.diagonalCheck.d1M ? `D1=${options.diagonalCheck.d1M.toFixed(2)}m` : null,
      options.diagonalCheck.d2M ? `D2=${options.diagonalCheck.d2M.toFixed(2)}m` : null,
      `Δ=${options.diagonalCheck.differenceMm}mm`,
    ]
      .filter(Boolean)
      .join(', ');

    const statusMap: Record<SquarenessQuality, string> = {
      ideal: 'Kąt prosty OK (PN-B-10100)',
      minor_skew: 'Drobny skos (klej/tynk)',
      out_of_square: 'Brak kąta prostego (przedścianka)',
    };

    parts.push(`• Przekątne: ${diagTxt} (${statusMap[options.diagonalCheck.quality]})`);
  }

  return parts.join('\n');
}
