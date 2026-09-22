/**
 * attic-calculator.ts
 * Obliczenia geometrii i powierzchni poddaszy ze skosami dachowymi i ścianką kolankową.
 * Zgodność z polską normą PN-ISO 9836 (powierzchnia użytkowa na poddaszu):
 * - wysokość >= 2.20 m: 100% powierzchni
 * - wysokość 1.40 m - 2.20 m: 50% powierzchni
 * - wysokość < 1.40 m: 0% powierzchni (powierzchnia pomocnicza)
 */

import { RoomAtticRoof } from '@/types/renovation';

export interface AtticMetrics {
  isAttic: boolean;
  slopeAreaM2: number; // powierzchnia skośnej połaci sufitu (płyty g-k / ocieplenie)
  kneeWallAreaM2: number; // powierzchnia ścianki kolankowej
  usableFloorAreaM2: number; // powierzchnia użytkowa wg normy PN-ISO 9836
  slopeLengthM: number; // długość połaci po skosie
  slopeRunFloorM: number; // rzut poziomy skosu na posadzkę
  fullHeightCeilingWidthM: number; // szerokość płaskiego sufitu na pełnej wysokości
}

/**
 * Oblicza metrykę poddasza, powierzchnię skosów do zabudowy g-k i powierzchnię użytkową.
 */
export function calculateAtticMetrics(
  roomWidthM: number,
  roomLengthM: number,
  roomHeightM: number,
  atticConfig?: RoomAtticRoof
): AtticMetrics {
  const nominalFloorArea = roomWidthM * roomLengthM;

  if (!atticConfig || !atticConfig.isAttic) {
    return {
      isAttic: false,
      slopeAreaM2: 0,
      kneeWallAreaM2: 0,
      usableFloorAreaM2: nominalFloorArea,
      slopeLengthM: 0,
      slopeRunFloorM: 0,
      fullHeightCeilingWidthM: roomWidthM,
    };
  }

  const pitchDeg = Math.min(80, Math.max(15, atticConfig.roofPitchDeg || 40));
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const kneeH = Math.min(roomHeightM - 0.2, Math.max(0.2, atticConfig.kneeWallHeightM || 1.0));
  const deltaH = roomHeightM - kneeH;

  // Rzut poziomy skosu: run = deltaH / tan(alpha)
  const slopeRun = Math.max(0.1, deltaH / Math.tan(pitchRad));
  // Długość skosu: L = deltaH / sin(alpha)
  const slopeLength = deltaH / Math.sin(pitchRad);

  const isBothSides = atticConfig.slopeWall === 'both_sides';
  const isWidthWall = atticConfig.slopeWall === 'back' || atticConfig.slopeWall === 'front';

  // Długość ściany wzdłuż której biegnie skos
  const alongWallLength = isWidthWall ? roomWidthM : roomLengthM;
  const crossDimension = isWidthWall ? roomLengthM : roomWidthM;

  const numSlopes = isBothSides ? 2 : 1;
  const clampedSlopeRun = Math.min(crossDimension / numSlopes, slopeRun);

  // Powierzchnia połaci skośnej (dla 1 lub 2 stron)
  const slopeAreaM2 = Math.round(alongWallLength * slopeLength * numSlopes * 100) / 100;
  // Powierzchnia ścianki kolankowej
  const kneeWallAreaM2 = Math.round(alongWallLength * kneeH * numSlopes * 100) / 100;

  // Szerokość płaskiej części sufitu
  const flatCeilingSpan = Math.max(0, crossDimension - clampedSlopeRun * numSlopes);

  // Obliczenie powierzchni użytkowej wg PN-ISO 9836
  // Strefa < 1.40 m: h < 1.40
  // Odległość od ścianki kolankowej do punktu h = 1.40 m:
  let usableArea = nominalFloorArea;

  if (kneeH < 2.20) {
    // Odległość od ścianki do h = 1.40 m
    const runTo140 = kneeH < 1.40 ? Math.max(0, (1.40 - kneeH) / Math.tan(pitchRad)) : 0;
    // Odległość od ścianki do h = 2.20 m
    const runTo220 = Math.max(0, Math.min(clampedSlopeRun, (2.20 - kneeH) / Math.tan(pitchRad)));

    // Strefa poniżej 1.4m liczy się 0%
    const zoneBelow140Area = alongWallLength * Math.min(clampedSlopeRun, runTo140) * numSlopes;
    // Strefa 1.4m - 2.2m liczy się 50%
    const zone140to220Span = Math.max(0, runTo220 - runTo140);
    const zone140to220Area = alongWallLength * zone140to220Span * numSlopes;

    // Odejmujemy 100% strefy <1.4m i 50% strefy 1.4-2.2m
    usableArea = Math.max(0, nominalFloorArea - zoneBelow140Area - zone140to220Area * 0.5);
  }

  return {
    isAttic: true,
    slopeAreaM2,
    kneeWallAreaM2,
    usableFloorAreaM2: Math.round(usableArea * 100) / 100,
    slopeLengthM: Math.round(slopeLength * 100) / 100,
    slopeRunFloorM: Math.round(clampedSlopeRun * 100) / 100,
    fullHeightCeilingWidthM: Math.round(flatCeilingSpan * 100) / 100,
  };
}
