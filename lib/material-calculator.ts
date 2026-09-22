import { MaterialCalculation, Room } from '@/types/renovation';

export type TileLayoutPattern = 'straight' | 'brick_half' | 'brick_third' | 'herringbone' | 'diagonal_45';

export interface TileCalculationInput {
  roomId: string;
  roomName: string;
  floorArea: number; // m2
  wallArea?: number; // m2 (e.g. for bathrooms)
  tileWidthCm: number;
  tileHeightCm: number;
  tileThicknessMm?: number;
  jointWidthMm?: number;
  layoutPattern: TileLayoutPattern;
  packSizeM2?: number; // default 1.44 m2
  pricePerM2?: number;
  storeName?: string;
}

export interface FlooringCalculationInput {
  roomId: string;
  roomName: string;
  floorArea: number; // m2
  flooringType: 'panels' | 'vinyl' | 'wood';
  layoutPattern: TileLayoutPattern;
  packSizeM2?: number; // default ~2.22 m2 for laminate, 2.4 m2 for vinyl
  pricePerM2?: number;
  storeName?: string;
}

export interface WaterproofingInput {
  roomId: string;
  roomName: string;
  wetZoneFloorM2: number;
  wetZoneWallM2: number;
  cornersLengthM: number;
  pipePassagesCount?: number;
  storeName?: string;
}

export interface PlasterAndPaintInput {
  roomId: string;
  roomName: string;
  wallArea: number; // m2
  ceilingArea: number; // m2
  coatsPaint?: number; // default 2
  plasterLayers?: number; // default 2
  paintYieldM2PerL?: number; // default 12 m2/L
  storeName?: string;
}

export interface LevelingCompoundInput {
  roomId: string;
  roomName: string;
  floorArea: number; // m2
  averageThicknessMm: number; // np. 5mm, 10mm, 15mm
  bagWeightKg?: number; // default 25kg
  pricePerBag?: number;
  storeName?: string;
}

export interface DrywallCalculationInput {
  roomId: string;
  roomName: string;
  areaM2: number; // powierzchnia zabudowy (np. sufit podwieszany, skos poddasza, ścianka)
  type: 'ceiling_or_slope' | 'partition_wall';
  boardType?: 'standard_white' | 'moisture_green' | 'fire_red';
  layers?: 1 | 2;
  boardWidthM?: number; // default 1.2m
  boardLengthM?: number; // default 2.6m
  storeName?: string;
}

export interface WallOpeningDeductionOptions {
  includeJambs?: boolean; // doliczanie ościeży/glifów wg zasad KNR (domyślnie true)
  jambDepthM?: number; // głębokość węgarka / ościeża w metrach, default 0.18 m
  knrThresholdM2?: number; // próg KNR powyżej którego odlicza się otwór (0 = precyzyjne odliczanie z glifami)
}

export interface NetWallAreaKNRResult {
  grossWallAreaM2: number;
  openingsTotalAreaM2: number;
  deductedOpeningsAreaM2: number;
  jambsAddedAreaM2: number;
  netWallAreaM2: number;
  explanation: string;
}

/**
 * Returns waste margin percentage based on layout pattern and material type.
 * Based on Polish construction practice and manufacturer recommendations (ITB).
 */
export function getWasteMarginForPattern(pattern: TileLayoutPattern, isLargeFormat = false): number {
  if (isLargeFormat) {
    // Large format (e.g. 120x60, 120x120) produces more cutting waste
    switch (pattern) {
      case 'straight':
        return 12;
      case 'brick_half':
      case 'brick_third':
        return 15;
      case 'herringbone':
      case 'diagonal_45':
        return 20;
    }
  }

  switch (pattern) {
    case 'straight':
      return 8;
    case 'brick_half':
    case 'brick_third':
      return 10;
    case 'herringbone':
      return 15;
    case 'diagonal_45':
      return 18;
  }
}

/**
 * Calculates grout consumption in kg/m2:
 * Formula: ((A + B) / (A * B)) * C * D * 1.6
 * where:
 * A = tile width in mm
 * B = tile length in mm
 * C = tile thickness in mm
 * D = joint width in mm
 * 1.6 = average grout dry density (kg/dm3)
 */
export function calculateGroutConsumptionKgPerM2(
  tileWidthCm: number,
  tileHeightCm: number,
  tileThicknessMm = 8.5,
  jointWidthMm = 2
): number {
  const widthMm = tileWidthCm * 10;
  const heightMm = tileHeightCm * 10;
  if (widthMm <= 0 || heightMm <= 0) return 0.4;

  const factor = ((widthMm + heightMm) / (widthMm * heightMm)) * tileThicknessMm * jointWidthMm * 1.6;
  // Clamp between practical boundaries (0.25 kg/m2 for large format up to 1.8 kg/m2 for mosaic)
  return Number(Math.max(0.25, Math.min(2.0, factor)).toFixed(2));
}

/**
 * Calculates complete tile package: tiles, adhesive C2TE, grout, leveling clips.
 */
export function calculateTilePackage(input: TileCalculationInput): MaterialCalculation[] {
  const totalAreaNet = (input.floorArea || 0) + (input.wallArea || 0);
  if (totalAreaNet <= 0) return [];

  const isLargeFormat = input.tileWidthCm >= 60 && input.tileHeightCm >= 60;
  const wasteMargin = getWasteMarginForPattern(input.layoutPattern, isLargeFormat);
  const finalTileArea = Number((totalAreaNet * (1 + wasteMargin / 100)).toFixed(2));
  
  const packSize = input.packSizeM2 || 1.44;
  const packsCount = Math.ceil(finalTileArea / packSize);
  const pricePerM2 = input.pricePerM2 || (isLargeFormat ? 160 : 110);
  const tileStore = input.storeName || 'Salon Płytek i Ceramiki';

  // 1. Tiles
  const tileItem: MaterialCalculation = {
    id: `mat-tile-${Date.now()}-1`,
    roomId: input.roomId,
    name: `Gres / Płytki ${input.tileWidthCm}x${input.tileHeightCm} cm (${input.roomName})`,
    category: 'płytki',
    formulaExplanation: `Powierzchnia ${totalAreaNet.toFixed(2)} m² + ${wasteMargin}% zapasu na docinki (układ: ${input.layoutPattern}) = ${finalTileArea} m² (${packsCount} paczek po ${packSize} m²)`,
    baseQuantity: totalAreaNet,
    wasteMarginPercent: wasteMargin,
    finalQuantity: finalTileArea,
    unit: 'm²',
    estimatedUnitPrice: pricePerM2,
    totalPrice: Number((finalTileArea * pricePerM2).toFixed(2)),
    purchased: false,
    storeName: tileStore,
    packageSize: packSize,
    packagesCount: packsCount,
  };

  // 2. Adhesive (C2TE for standard, C2TES1 for large format)
  // Standard: 4.5 kg/m2, Large format: 5.5 kg/m2
  const adhesivePerM2 = isLargeFormat ? 5.5 : 4.5;
  const adhesiveKg = totalAreaNet * adhesivePerM2 * (1 + wasteMargin / 100);
  const adhesiveBags = Math.ceil(adhesiveKg / 25);
  const adhesiveBagPrice = isLargeFormat ? 85 : 55;

  const adhesiveItem: MaterialCalculation = {
    id: `mat-tile-${Date.now()}-2`,
    roomId: input.roomId,
    name: isLargeFormat ? 'Klej odkształcalny C2TES1 do wielkiego formatu 25kg' : 'Klej elastyczny C2TE do gresu 25kg',
    category: 'chemia_budowlana',
    formulaExplanation: `Zużycie ${adhesivePerM2} kg/m² × ${totalAreaNet.toFixed(2)} m² + ${wasteMargin}% zapasu = ${adhesiveKg.toFixed(1)} kg (${adhesiveBags} worków 25kg)`,
    baseQuantity: Number((totalAreaNet * adhesivePerM2).toFixed(1)),
    wasteMarginPercent: wasteMargin,
    finalQuantity: adhesiveBags,
    unit: 'opak.',
    estimatedUnitPrice: adhesiveBagPrice,
    totalPrice: adhesiveBags * adhesiveBagPrice,
    purchased: false,
    storeName: 'Castorama / Leroy Merlin',
    packageSize: 25,
    packagesCount: adhesiveBags,
  };

  // 3. Grout (Fuga)
  const groutRateKgPerM2 = calculateGroutConsumptionKgPerM2(
    input.tileWidthCm,
    input.tileHeightCm,
    input.tileThicknessMm || 8.5,
    input.jointWidthMm || 2
  );
  const totalGroutKg = totalAreaNet * groutRateKgPerM2 * 1.1; // +10% reserve
  const groutBuckets = Math.ceil(totalGroutKg / 2); // standard 2kg bags or 5kg
  const groutPricePerBucket = 38;

  const groutItem: MaterialCalculation = {
    id: `mat-tile-${Date.now()}-3`,
    roomId: input.roomId,
    name: `Fuga elastyczna / hydrofobowa (spoiny ${input.jointWidthMm || 2}mm) 2kg`,
    category: 'chemia_budowlana',
    formulaExplanation: `Zużycie teoretyczne ${groutRateKgPerM2} kg/m² dla płytki ${input.tileWidthCm}x${input.tileHeightCm}cm = ${totalGroutKg.toFixed(1)} kg (${groutBuckets} opak. 2kg)`,
    baseQuantity: Number((totalAreaNet * groutRateKgPerM2).toFixed(1)),
    wasteMarginPercent: 10,
    finalQuantity: groutBuckets,
    unit: 'opak.',
    estimatedUnitPrice: groutPricePerBucket,
    totalPrice: groutBuckets * groutPricePerBucket,
    purchased: false,
    storeName: 'Castorama / Leroy Merlin',
    packageSize: 2,
    packagesCount: groutBuckets,
  };

  // 4. Tile Leveling System Clips (Klipsy systemu poziomowania)
  // ~30 clips per m2 for 60x60, ~40 for smaller, ~20 for 120x60
  const clipsPerM2 = isLargeFormat ? 20 : 30;
  const clipsTotal = Math.ceil(totalAreaNet * clipsPerM2);
  const clipsPacks = Math.ceil(clipsTotal / 250); // packs of 250 pcs

  const clipsItem: MaterialCalculation = {
    id: `mat-tile-${Date.now()}-4`,
    roomId: input.roomId,
    name: 'System poziomowania płytek (klipsy zaciskowe 1.5mm / paczka 250 szt.)',
    category: 'chemia_budowlana',
    formulaExplanation: `Norma ~${clipsPerM2} szt./m² × ${totalAreaNet.toFixed(2)} m² = ${clipsTotal} szt. (${clipsPacks} paczek po 250 szt.)`,
    baseQuantity: clipsTotal,
    wasteMarginPercent: 0,
    finalQuantity: clipsPacks,
    unit: 'opak.',
    estimatedUnitPrice: 49,
    totalPrice: clipsPacks * 49,
    purchased: false,
    storeName: 'Castorama / Leroy Merlin',
    packageSize: 250,
    packagesCount: clipsPacks,
  };

  return [tileItem, adhesiveItem, groutItem, clipsItem];
}

/**
 * Calculates complete flooring package: panels/vinyl, underlayment, baseboards, moisture foil.
 */
export function calculateFlooringPackage(input: FlooringCalculationInput): MaterialCalculation[] {
  if (input.floorArea <= 0) return [];

  const wasteMargin = getWasteMarginForPattern(input.layoutPattern, false);
  const finalFloorArea = Number((input.floorArea * (1 + wasteMargin / 100)).toFixed(2));
  const packSize = input.packSizeM2 || (input.flooringType === 'vinyl' ? 2.4 : 2.22);
  const packsCount = Math.ceil(finalFloorArea / packSize);
  const pricePerM2 = input.pricePerM2 || (input.flooringType === 'vinyl' ? 140 : input.flooringType === 'wood' ? 240 : 85);
  const store = input.storeName || 'Sklep z Podłogami / Castorama';

  const typeNames: Record<string, string> = {
    panels: 'Panele laminowane AC5 8mm',
    vinyl: 'Panele winylowe SPC z rdzeniem mineralnym',
    wood: 'Deska warstwowa dębowa',
  };

  // 1. Flooring
  const floorItem: MaterialCalculation = {
    id: `mat-floor-${Date.now()}-1`,
    roomId: input.roomId,
    name: `${typeNames[input.flooringType] || 'Podłoga'} (${input.roomName})`,
    category: 'podłogi',
    formulaExplanation: `Powierzchnia ${input.floorArea.toFixed(2)} m² + ${wasteMargin}% zapasu na ścinki = ${finalFloorArea} m² (${packsCount} paczek po ${packSize} m²)`,
    baseQuantity: input.floorArea,
    wasteMarginPercent: wasteMargin,
    finalQuantity: finalFloorArea,
    unit: 'm²',
    estimatedUnitPrice: pricePerM2,
    totalPrice: Number((finalFloorArea * pricePerM2).toFixed(2)),
    purchased: false,
    storeName: store,
    packageSize: packSize,
    packagesCount: packsCount,
  };

  // 2. Underlayment (Podkład)
  // Vinyl requires specialized high-density underlay (CS >= 200 kPa)
  const underlayName = input.flooringType === 'vinyl'
    ? 'Podkład dedykowany pod winyl SPC (CS >= 200 kPa, gr. 1.5mm) rolka 10m²'
    : 'Podkład wyciszający XPS/PUR pod panele (gr. 2-3mm) paczka 6m²';
  const underlayPackM2 = input.flooringType === 'vinyl' ? 10 : 6;
  const underlayTotalM2 = Number((input.floorArea * 1.05).toFixed(2)); // +5% waste
  const underlayPacks = Math.ceil(underlayTotalM2 / underlayPackM2);
  const underlayPrice = input.flooringType === 'vinyl' ? 120 : 54;

  const underlayItem: MaterialCalculation = {
    id: `mat-floor-${Date.now()}-2`,
    roomId: input.roomId,
    name: underlayName,
    category: 'podłogi',
    formulaExplanation: `Powierzchnia ${input.floorArea.toFixed(2)} m² + 5% zapasu = ${underlayTotalM2} m² (${underlayPacks} opakowań po ${underlayPackM2} m²)`,
    baseQuantity: input.floorArea,
    wasteMarginPercent: 5,
    finalQuantity: underlayPacks,
    unit: 'opak.',
    estimatedUnitPrice: underlayPrice,
    totalPrice: underlayPacks * underlayPrice,
    purchased: false,
    storeName: store,
    packageSize: underlayPackM2,
    packagesCount: underlayPacks,
  };

  return [floorItem, underlayItem];
}

/**
 * Calculates complete waterproofing package (Hydroizolacja strefy mokrej).
 * Follows Polish standard ITB / DIN 18534 for wet rooms.
 */
export function calculateWaterproofingPackage(input: WaterproofingInput): MaterialCalculation[] {
  const totalWetArea = input.wetZoneFloorM2 + input.wetZoneWallM2;
  if (totalWetArea <= 0) return [];

  // Norma: 1.4 kg/m2 na 2 warstwy krzyżowe folii w płynie
  const liquidFoilKg = Number((totalWetArea * 1.4).toFixed(1));
  const foilBuckets12kg = Math.ceil(liquidFoilKg / 12);
  const store = input.storeName || 'Castorama / Leroy Merlin';

  // 1. Liquid Foil
  const foilItem: MaterialCalculation = {
    id: `mat-waterproof-${Date.now()}-1`,
    roomId: input.roomId,
    name: `Folia w płynie / Hydroizolacja 2-warstwowa wiadro 12kg (${input.roomName})`,
    category: 'chemia_budowlana',
    formulaExplanation: `Norma ITB 1.4 kg/m² (2 warstwy) × ${totalWetArea.toFixed(2)} m² strefy mokrej = ${liquidFoilKg} kg (${foilBuckets12kg} wiader po 12kg)`,
    baseQuantity: Number((totalWetArea * 1.4).toFixed(1)),
    wasteMarginPercent: 10,
    finalQuantity: foilBuckets12kg,
    unit: 'opak.',
    estimatedUnitPrice: 145,
    totalPrice: foilBuckets12kg * 145,
    purchased: false,
    storeName: store,
    packageSize: 12,
    packagesCount: foilBuckets12kg,
  };

  // 2. Sealing Tape (Taśma narożnikowa elastomeryczna)
  const tapeNetLength = input.cornersLengthM;
  const tapeGrossLength = Number((tapeNetLength * 1.15).toFixed(1)); // +15% overlap
  const tapeRolls10m = Math.ceil(tapeGrossLength / 10);

  const tapeItem: MaterialCalculation = {
    id: `mat-waterproof-${Date.now()}-2`,
    roomId: input.roomId,
    name: 'Taśma uszczelniająca do naroży i styków ściana-podłoga (rolka 10 mb)',
    category: 'chemia_budowlana',
    formulaExplanation: `Obwód i naroża pionowe ${tapeNetLength.toFixed(1)} mb + 15% na zakłady = ${tapeGrossLength} mb (${tapeRolls10m} rolek 10m)`,
    baseQuantity: tapeNetLength,
    wasteMarginPercent: 15,
    finalQuantity: tapeRolls10m,
    unit: 'opak.',
    estimatedUnitPrice: 68,
    totalPrice: tapeRolls10m * 68,
    purchased: false,
    storeName: store,
    packageSize: 10,
    packagesCount: tapeRolls10m,
  };

  // 3. Wall and Floor Cuffs (Mankiety uszczelniające)
  const cuffsCount = (input.pipePassagesCount || 2) + 1; // 2 wall pipe cuffs (hot/cold) + 1 drain cuff
  const cuffsItem: MaterialCalculation = {
    id: `mat-waterproof-${Date.now()}-3`,
    roomId: input.roomId,
    name: 'Mankiety uszczelniające do przejść rur i odpływu',
    category: 'chemia_budowlana',
    formulaExplanation: `${cuffsCount} punkty instalacyjne (przyłącza baterii i odpływ prysznicowy)`,
    baseQuantity: cuffsCount,
    wasteMarginPercent: 0,
    finalQuantity: cuffsCount,
    unit: 'szt.',
    estimatedUnitPrice: 24,
    totalPrice: cuffsCount * 24,
    purchased: false,
    storeName: store,
  };

  return [foilItem, tapeItem, cuffsItem];
}

/**
 * Calculates complete plaster, primer and paint package for walls and ceilings.
 */
export function calculatePlasterAndPaintPackage(input: PlasterAndPaintInput): MaterialCalculation[] {
  const totalArea = input.wallArea + input.ceilingArea;
  if (totalArea <= 0) return [];

  const store = input.storeName || 'Castorama / Leroy Merlin';
  const coats = input.coatsPaint || 2;
  const paintYield = input.paintYieldM2PerL || 12;

  // 1. Primer (Grunt głęboko penetrujący)
  // Norma: 0.18 L/m2
  const primerLiters = Number((totalArea * 0.18).toFixed(1));
  const primerCans5L = Math.ceil(primerLiters / 5);

  const primerItem: MaterialCalculation = {
    id: `mat-paint-${Date.now()}-1`,
    roomId: input.roomId,
    name: `Grunt głęboko penetrujący 5L (${input.roomName})`,
    category: 'chemia_budowlana',
    formulaExplanation: `Norma 0.18 L/m² × ${totalArea.toFixed(1)} m² (ściany + sufit) = ${primerLiters} L (${primerCans5L} kanistrów 5L)`,
    baseQuantity: primerLiters,
    wasteMarginPercent: 5,
    finalQuantity: primerCans5L,
    unit: 'opak.',
    estimatedUnitPrice: 42,
    totalPrice: primerCans5L * 42,
    purchased: false,
    storeName: store,
    packageSize: 5,
    packagesCount: primerCans5L,
  };

  // 2. Gypsum Plaster / Gładź polimerowa
  // Norma: 1.1 kg/m2 na 1mm grubości. 2 warstwy (ok. 1.8 kg/m2)
  const plasterKg = Number((input.wallArea * 1.8).toFixed(1));
  const plasterBuckets20kg = Math.ceil(plasterKg / 20);

  const plasterItem: MaterialCalculation = {
    id: `mat-paint-${Date.now()}-2`,
    roomId: input.roomId,
    name: 'Gładź szpachlowa polimerowa gotowa (wiadro 20kg)',
    category: 'ściany',
    formulaExplanation: `Zużycie 1.8 kg/m² (2 warstwy gładzi) × ${input.wallArea.toFixed(1)} m² ścian = ${plasterKg} kg (${plasterBuckets20kg} wiader 20kg)`,
    baseQuantity: plasterKg,
    wasteMarginPercent: 8,
    finalQuantity: plasterBuckets20kg,
    unit: 'opak.',
    estimatedUnitPrice: 75,
    totalPrice: plasterBuckets20kg * 75,
    purchased: false,
    storeName: store,
    packageSize: 20,
    packagesCount: plasterBuckets20kg,
  };

  // 3. Wall & Ceiling Paint
  const paintLiters = Number(((totalArea * coats / paintYield) * 1.1).toFixed(1));
  const paintCans10L = Math.ceil(paintLiters / 10);

  const paintItem: MaterialCalculation = {
    id: `mat-paint-${Date.now()}-3`,
    roomId: input.roomId,
    name: `Farba lateksowa / ceramiczna do wnętrz (puszka 10L)`,
    category: 'ściany',
    formulaExplanation: `Powierzchnia ${totalArea.toFixed(1)} m² × ${coats} warstwy / wydajność ${paintYield} m²/L + 10% zapasu = ${paintLiters} L (${paintCans10L} puszek 10L)`,
    baseQuantity: Number((totalArea * coats / paintYield).toFixed(1)),
    wasteMarginPercent: 10,
    finalQuantity: paintCans10L,
    unit: 'opak.',
    estimatedUnitPrice: 180,
    totalPrice: paintCans10L * 180,
    purchased: false,
    storeName: store,
    packageSize: 10,
    packagesCount: paintCans10L,
  };

  return [primerItem, plasterItem, paintItem];
}

/**
 * Calculates self-leveling compound (Wylewka samopoziomująca).
 * Norma: 1.65 kg/m2 na każdy 1mm grubości posadzki.
 */
export function calculateLevelingCompoundPackage(input: LevelingCompoundInput): MaterialCalculation[] {
  if (input.floorArea <= 0 || input.averageThicknessMm <= 0) return [];

  const rateKgPerM2 = 1.65 * input.averageThicknessMm;
  const totalKg = Number((input.floorArea * rateKgPerM2 * 1.05).toFixed(1)); // +5% reserve
  const bagSize = input.bagWeightKg || 25;
  const bagsCount = Math.ceil(totalKg / bagSize);
  const bagPrice = input.pricePerBag || 48;
  const store = input.storeName || 'Castorama / Leroy Merlin';

  const levelingItem: MaterialCalculation = {
    id: `mat-level-${Date.now()}`,
    roomId: input.roomId,
    name: `Wylewka samopoziomująca gr. ${input.averageThicknessMm}mm (worek ${bagSize}kg)`,
    category: 'chemia_budowlana',
    formulaExplanation: `Norma 1.65 kg/m²/mm × ${input.averageThicknessMm}mm = ${rateKgPerM2.toFixed(1)} kg/m². Łącznie dla ${input.floorArea.toFixed(2)} m²: ${totalKg} kg (${bagsCount} worków)`,
    baseQuantity: Number((input.floorArea * rateKgPerM2).toFixed(1)),
    wasteMarginPercent: 5,
    finalQuantity: bagsCount,
    unit: 'opak.',
    estimatedUnitPrice: bagPrice,
    totalPrice: bagsCount * bagPrice,
    purchased: false,
    storeName: store,
    packageSize: bagSize,
    packagesCount: bagsCount,
  };

  return [levelingItem];
}

/**
 * Calculates complete drywall construction package (zabudowa G-K, sufity podwieszane, skosy poddasza, ścianki działowe).
 * Compliant with Polish ITB norms and manufacturer standards (Knauf, Rigips, Norgips).
 */
export function calculateDrywallPackage(input: DrywallCalculationInput): MaterialCalculation[] {
  if (input.areaM2 <= 0) return [];
  const layers = input.layers || 1;
  const boardWidth = input.boardWidthM || 1.2;
  const boardLength = input.boardLengthM || 2.6;
  const singleBoardArea = boardWidth * boardLength; // e.g. 3.12 m2
  const store = input.storeName || 'Castorama / Leroy Merlin';

  // 1. Płyty G-K (10% zapasu na docinki)
  const wasteMargin = 10;
  const totalBoardArea = Number((input.areaM2 * layers * (1 + wasteMargin / 100)).toFixed(2));
  const boardCount = Math.ceil(totalBoardArea / singleBoardArea);

  const boardNames = {
    standard_white: 'Płyta gipsowo-kartonowa standardowa GKB 12.5mm (biała)',
    moisture_green: 'Płyta g-k impregnowana hydrofobowa GKBI 12.5mm (zielona - łazienkowa)',
    fire_red: 'Płyta g-k ogniochronna GKF 12.5mm (różowa)',
  };
  const boardPrices = {
    standard_white: 36,
    moisture_green: 49,
    fire_red: 45,
  };
  const bType = input.boardType || 'standard_white';
  const unitPrice = boardPrices[bType];

  const boardItem: MaterialCalculation = {
    id: `mat-drywall-${Date.now()}-1`,
    roomId: input.roomId,
    name: `${boardNames[bType]} ${boardWidth}×${boardLength}m (${input.roomName})`,
    category: 'ściany',
    formulaExplanation: `Powierzchnia ${input.areaM2.toFixed(2)} m² × ${layers} warstw(y) + ${wasteMargin}% zapasu na docinki = ${totalBoardArea} m² (${boardCount} płyt po ${singleBoardArea.toFixed(2)} m²)`,
    baseQuantity: Number((input.areaM2 * layers).toFixed(2)),
    wasteMarginPercent: wasteMargin,
    finalQuantity: boardCount,
    unit: 'szt.',
    estimatedUnitPrice: unitPrice,
    totalPrice: boardCount * unitPrice,
    purchased: false,
    storeName: store,
    packageSize: 1,
    packagesCount: boardCount,
  };

  const results: MaterialCalculation[] = [boardItem];

  if (input.type === 'ceiling_or_slope') {
    // Profil CD60 (~3.2 mb/m2, sztangi 3m)
    const cd60M = Number((input.areaM2 * 3.2).toFixed(1));
    const cd60Pieces = Math.ceil(cd60M / 3);
    const cd60Item: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-2`,
      roomId: input.roomId,
      name: 'Profil sufitowy CD60 główny/nośny (sztanga 3m)',
      category: 'ściany',
      formulaExplanation: `Norma ITB ~3.2 mb/m² × ${input.areaM2.toFixed(2)} m² = ${cd60M} mb (${cd60Pieces} sztang 3m)`,
      baseQuantity: cd60M,
      wasteMarginPercent: 5,
      finalQuantity: cd60Pieces,
      unit: 'szt.',
      estimatedUnitPrice: 19,
      totalPrice: cd60Pieces * 19,
      purchased: false,
      storeName: store,
      packageSize: 3,
      packagesCount: cd60Pieces,
    };
    results.push(cd60Item);

    // Profil UD27 (~0.9 mb/m2, sztangi 3m)
    const ud27M = Number((input.areaM2 * 0.9).toFixed(1));
    const ud27Pieces = Math.ceil(ud27M / 3);
    const ud27Item: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-3`,
      roomId: input.roomId,
      name: 'Profil przyścienny UD27 obwodowy (sztanga 3m)',
      category: 'ściany',
      formulaExplanation: `Norma ~0.9 mb/m² × ${input.areaM2.toFixed(2)} m² = ${ud27M} mb (${ud27Pieces} sztang 3m)`,
      baseQuantity: ud27M,
      wasteMarginPercent: 5,
      finalQuantity: ud27Pieces,
      unit: 'szt.',
      estimatedUnitPrice: 13,
      totalPrice: ud27Pieces * 13,
      purchased: false,
      storeName: store,
      packageSize: 3,
      packagesCount: ud27Pieces,
    };
    results.push(ud27Item);

    // Wieszaki ES lub obrotowe (~3.2 szt./m2)
    const hangersCount = Math.ceil(input.areaM2 * 3.2);
    const hangersPacks = Math.ceil(hangersCount / 100);
    const hangerItem: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-4`,
      roomId: input.roomId,
      name: 'Wieszaki bezpośrednie ES / obrotowe do profili CD60 (op. 100 szt.)',
      category: 'ściany',
      formulaExplanation: `Norma ~3.2 szt./m² × ${input.areaM2.toFixed(2)} m² = ${hangersCount} szt. (${hangersPacks} opakowań po 100 szt.)`,
      baseQuantity: hangersCount,
      wasteMarginPercent: 5,
      finalQuantity: hangersPacks,
      unit: 'opak.',
      estimatedUnitPrice: 65,
      totalPrice: hangersPacks * 65,
      purchased: false,
      storeName: store,
      packageSize: 100,
      packagesCount: hangersPacks,
    };
    results.push(hangerItem);
  } else {
    // partition_wall: Profile CW i UW
    const cwM = Number((input.areaM2 * 2.0).toFixed(1));
    const cwPieces = Math.ceil(cwM / 3);
    const cwItem: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-2`,
      roomId: input.roomId,
      name: 'Profil słupkowy ścienny CW50/CW75 (sztanga 3m)',
      category: 'ściany',
      formulaExplanation: `Rozstaw słupków co 60cm (~2.0 mb/m²) × ${input.areaM2.toFixed(2)} m² = ${cwM} mb (${cwPieces} sztang 3m)`,
      baseQuantity: cwM,
      wasteMarginPercent: 5,
      finalQuantity: cwPieces,
      unit: 'szt.',
      estimatedUnitPrice: 23,
      totalPrice: cwPieces * 23,
      purchased: false,
      storeName: store,
      packageSize: 3,
      packagesCount: cwPieces,
    };
    results.push(cwItem);

    const uwM = Number((input.areaM2 * 0.8).toFixed(1));
    const uwPieces = Math.ceil(uwM / 3);
    const uwItem: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-3`,
      roomId: input.roomId,
      name: 'Profil poziomy ścienny UW50/UW75 obwodowy (sztanga 3m)',
      category: 'ściany',
      formulaExplanation: `Montaż podłoga/strop (~0.8 mb/m²) × ${input.areaM2.toFixed(2)} m² = ${uwM} mb (${uwPieces} sztang 3m)`,
      baseQuantity: uwM,
      wasteMarginPercent: 5,
      finalQuantity: uwPieces,
      unit: 'szt.',
      estimatedUnitPrice: 17,
      totalPrice: uwPieces * 17,
      purchased: false,
      storeName: store,
      packageSize: 3,
      packagesCount: uwPieces,
    };
    results.push(uwItem);

    // Wełna mineralna akustyczna
    const woolM2 = Number((input.areaM2 * 1.05).toFixed(1));
    const woolPacks = Math.ceil(woolM2 / 6.0); // paczka 6 m2
    const woolItem: MaterialCalculation = {
      id: `mat-drywall-${Date.now()}-4`,
      roomId: input.roomId,
      name: 'Wełna mineralna akustyczna do ścian G-K gr. 50/75mm (paczka ~6m²)',
      category: 'ściany',
      formulaExplanation: `Wygłuszenie ścianki: ${input.areaM2.toFixed(2)} m² + 5% = ${woolM2} m² (${woolPacks} paczek po 6m²)`,
      baseQuantity: input.areaM2,
      wasteMarginPercent: 5,
      finalQuantity: woolPacks,
      unit: 'opak.',
      estimatedUnitPrice: 110,
      totalPrice: woolPacks * 110,
      purchased: false,
      storeName: store,
      packageSize: 6,
      packagesCount: woolPacks,
    };
    results.push(woolItem);
  }

  // Wkręty do płyt g-k TN 3.5x25 (oraz 35 dla 2 warstw)
  const screwsCount = Math.ceil(input.areaM2 * 19 * layers);
  const screwPacks = Math.ceil(screwsCount / 500); // paczki 500 szt.
  const screwsItem: MaterialCalculation = {
    id: `mat-drywall-${Date.now()}-5`,
    roomId: input.roomId,
    name: 'Wkręty fosfatowane do płyt gipsowo-kartonowych TN 3.5x25 (op. 500 szt.)',
    category: 'chemia_budowlana',
    formulaExplanation: `Norma ~19 szt./m² na warstwę × ${input.areaM2.toFixed(2)} m² × ${layers} = ${screwsCount} szt. (${screwPacks} paczek)`,
    baseQuantity: screwsCount,
    wasteMarginPercent: 5,
    finalQuantity: screwPacks,
    unit: 'opak.',
    estimatedUnitPrice: 28,
    totalPrice: screwPacks * 28,
    purchased: false,
    storeName: store,
    packageSize: 500,
    packagesCount: screwPacks,
  };
  results.push(screwsItem);

  // Masa szpachlowa do spoinowania (np. Uniflott) ~0.35 kg/m2 na warstwę
  const fillerKg = Number((input.areaM2 * 0.35 * layers).toFixed(1));
  const fillerBags = Math.ceil(fillerKg / 5); // worki 5kg
  const fillerItem: MaterialCalculation = {
    id: `mat-drywall-${Date.now()}-6`,
    roomId: input.roomId,
    name: 'Gips szpachlowy do spoinowania połączeń płyt G-K beztaśmowy/z taśmą (worek 5kg)',
    category: 'chemia_budowlana',
    formulaExplanation: `Zużycie ~0.35 kg/m² × ${input.areaM2.toFixed(2)} m² × ${layers} = ${fillerKg} kg (${fillerBags} worków 5kg)`,
    baseQuantity: fillerKg,
    wasteMarginPercent: 5,
    finalQuantity: fillerBags,
    unit: 'opak.',
    estimatedUnitPrice: 39,
    totalPrice: fillerBags * 39,
    purchased: false,
    storeName: store,
    packageSize: 5,
    packagesCount: fillerBags,
  };
  results.push(fillerItem);

  // Taśma zbrojąca do spoin ~1.4 mb/m2
  const tapeM = Number((input.areaM2 * 1.4 * layers).toFixed(1));
  const tapeRolls = Math.ceil(tapeM / 25); // rolka 25m
  const tapeItem: MaterialCalculation = {
    id: `mat-drywall-${Date.now()}-7`,
    roomId: input.roomId,
    name: 'Taśma zbrojąca do połączeń płyt G-K z włókna szklanego/papierowa (rolka 25 mb)',
    category: 'chemia_budowlana',
    formulaExplanation: `Zużycie ~1.4 mb/m² × ${input.areaM2.toFixed(2)} m² × ${layers} = ${tapeM} mb (${tapeRolls} rolek 25m)`,
    baseQuantity: tapeM,
    wasteMarginPercent: 5,
    finalQuantity: tapeRolls,
    unit: 'opak.',
    estimatedUnitPrice: 18,
    totalPrice: tapeRolls * 18,
    purchased: false,
    storeName: store,
    packageSize: 25,
    packagesCount: tapeRolls,
  };
  results.push(tapeItem);

  return results;
}

/**
 * Calculates net wall area according to Polish construction estimating principles (KNR 2-02).
 * Handles precise opening deductions and jamb (ościeża / glify) surface additions.
 */
export function calculateNetWallAreaKNR(
  grossWallArea: number,
  openings: Array<{ width: number; height: number; type?: string; name?: string }>,
  options: WallOpeningDeductionOptions = {}
): NetWallAreaKNRResult {
  const includeJambs = options.includeJambs ?? true;
  const jambDepth = options.jambDepthM ?? 0.18; // 18 cm standardowa głębokość ościeża
  const threshold = options.knrThresholdM2 ?? 0; // 0 = precyzyjne odliczenie każdego otworu

  let openingsTotalArea = 0;
  let deductedArea = 0;
  let jambsArea = 0;

  for (const op of openings) {
    const area = op.width * op.height;
    openingsTotalArea += area;

    if (area > threshold) {
      deductedArea += area;
      if (includeJambs) {
        // Obwód glifu: nadproże (szerokość) + 2 węgarki pionowe (2 * wysokość)
        const jambPerimeter = 2 * op.height + op.width;
        jambsArea += jambPerimeter * jambDepth;
      }
    }
  }

  const netArea = Math.max(0, grossWallArea - deductedArea + jambsArea);

  let explanation = `Ściany brutto: ${grossWallArea.toFixed(2)} m². `;
  if (openings.length === 0) {
    explanation += 'Brak otworów w ścianach.';
  } else {
    explanation += `Odliczono ${openings.length} otworów (-${deductedArea.toFixed(2)} m²). `;
    if (includeJambs && jambsArea > 0) {
      explanation += `Doliczono powierzchnię ościeży/glifów (+${jambsArea.toFixed(2)} m² przy głębokości ${(jambDepth * 100).toFixed(0)} cm wg KNR). `;
    }
    explanation += `Powierzchnia robocza netto: ${netArea.toFixed(2)} m².`;
  }

  return {
    grossWallAreaM2: Math.round(grossWallArea * 100) / 100,
    openingsTotalAreaM2: Math.round(openingsTotalArea * 100) / 100,
    deductedOpeningsAreaM2: Math.round(deductedArea * 100) / 100,
    jambsAddedAreaM2: Math.round(jambsArea * 100) / 100,
    netWallAreaM2: Math.round(netArea * 100) / 100,
    explanation,
  };
}

/**
 * Groups a list of material calculations by their designated store / market.
 */
export function groupMaterialsByStore(materials: MaterialCalculation[]): Record<string, MaterialCalculation[]> {
  const groups: Record<string, MaterialCalculation[]> = {};

  for (const m of materials) {
    const store = m.storeName || 'Market Budowlany (Ogólne)';
    if (!groups[store]) {
      groups[store] = [];
    }
    groups[store].push(m);
  }

  return groups;
}

/**
 * Generates formatted text ready for clipboard (SMS / WhatsApp / e-mail)
 * designed for real use on Polish construction sites.
 */
export function formatShoppingListForClipboard(
  materials: MaterialCalculation[],
  filterStore?: string,
  projectName = 'Renowacje u Kaczaka'
): string {
  const filtered = filterStore && filterStore !== 'all'
    ? materials.filter((m) => (m.storeName || 'Market Budowlany (Ogólne)') === filterStore)
    : materials;

  if (filtered.length === 0) {
    return `🛒 LISTA ZAKUPÓW: ${projectName}\nBrak pozycji do kupienia.`;
  }

  const grouped = groupMaterialsByStore(filtered);
  const totalCost = filtered.reduce((acc, m) => acc + m.totalPrice, 0);
  const toBuyCount = filtered.filter((m) => !m.purchased).length;

  let text = `🛒 LISTA ZAKUPÓW BUDOWLANYCH: ${projectName}\n`;
  text += `📅 Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}\n`;
  text += `📊 Pozycje: ${filtered.length} (do kupienia: ${toBuyCount})\n`;
  text += `💰 Szacowany koszt całkowity: ${totalCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN\n`;
  text += `========================================\n\n`;

  for (const [store, items] of Object.entries(grouped)) {
    text += `🏬 SKLEP: ${store.toUpperCase()}\n`;
    text += `----------------------------------------\n`;

    items.forEach((item, idx) => {
      const statusIcon = item.purchased ? '✅ [KUPIŁEM]' : '⬜ [DO KUPIENIA]';
      const packsInfo = item.packagesCount ? ` (${item.packagesCount} ${item.unit})` : ` ${item.finalQuantity} ${item.unit}`;
      text += `${idx + 1}. ${statusIcon} ${item.name}\n`;
      text += `   • Ilość: ${packsInfo} | ok. ${item.totalPrice.toFixed(0)} PLN\n`;
      if (item.formulaExplanation) {
        text += `   • Uwaga: ${item.formulaExplanation}\n`;
      }
    });

    text += `\n`;
  }

  text += `========================================\n`;
  text += `Pamiętaj o sprawdzeniu numeru partii (odcienia/kalibracji) przy zakupie płytek i chemii!`;

  return text;
}
