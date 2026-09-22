import { describe, it, expect } from 'vitest';
import {
  getWasteMarginForPattern,
  calculateGroutConsumptionKgPerM2,
  calculateTilePackage,
  calculateFlooringPackage,
  calculateWaterproofingPackage,
  calculatePlasterAndPaintPackage,
  calculateLevelingCompoundPackage,
  calculateDrywallPackage,
  calculateNetWallAreaKNR,
  groupMaterialsByStore,
  formatShoppingListForClipboard,
} from './material-calculator';
import { MaterialCalculation } from '@/types/renovation';

describe('material-calculator', () => {
  describe('getWasteMarginForPattern', () => {
    it('returns appropriate waste margin for standard tiles', () => {
      expect(getWasteMarginForPattern('straight', false)).toBe(8);
      expect(getWasteMarginForPattern('brick_half', false)).toBe(10);
      expect(getWasteMarginForPattern('herringbone', false)).toBe(15);
      expect(getWasteMarginForPattern('diagonal_45', false)).toBe(18);
    });

    it('returns higher waste margin for large format tiles', () => {
      expect(getWasteMarginForPattern('straight', true)).toBe(12);
      expect(getWasteMarginForPattern('brick_half', true)).toBe(15);
      expect(getWasteMarginForPattern('herringbone', true)).toBe(20);
      expect(getWasteMarginForPattern('diagonal_45', true)).toBe(20);
    });
  });

  describe('calculateGroutConsumptionKgPerM2', () => {
    it('calculates realistic grout consumption for standard 60x60 tiles', () => {
      // 60x60cm, 8.5mm thickness, 2mm joint width
      const grout = calculateGroutConsumptionKgPerM2(60, 60, 8.5, 2);
      // ((600 + 600) / (600 * 600)) * 8.5 * 2 * 1.6 ~= 0.09 -> clamped to minimum 0.25
      expect(grout).toBeGreaterThanOrEqual(0.25);
      expect(grout).toBeLessThan(0.8);
    });

    it('calculates higher grout consumption for small tiles', () => {
      // 10x10cm small tiles, 8.5mm, 3mm joint
      const groutSmall = calculateGroutConsumptionKgPerM2(10, 10, 8.5, 3);
      expect(groutSmall).toBeGreaterThan(0.6);
    });
  });

  describe('calculateTilePackage', () => {
    it('calculates complete package of tiles, adhesive, grout and clips', () => {
      const items = calculateTilePackage({
        roomId: 'room-1',
        roomName: 'Łazienka',
        floorArea: 6,
        wallArea: 14,
        tileWidthCm: 60,
        tileHeightCm: 60,
        layoutPattern: 'straight',
        packSizeM2: 1.44,
      });

      expect(items.length).toBe(4);

      // Tile item
      const tileItem = items.find((i) => i.category === 'płytki');
      expect(tileItem).toBeDefined();
      expect(tileItem?.baseQuantity).toBe(20); // 6 + 14
      expect(tileItem?.wasteMarginPercent).toBe(12); // large format 60x60 straight = 12%
      expect(tileItem?.finalQuantity).toBe(22.4);
      expect(tileItem?.packagesCount).toBe(16); // Math.ceil(22.4 / 1.44) = 16

      // Adhesive item
      const adhesiveItem = items.find((i) => i.name.includes('Klej'));
      expect(adhesiveItem).toBeDefined();
      expect(adhesiveItem?.unit).toBe('opak.');
      expect(adhesiveItem?.packagesCount).toBeGreaterThan(0);

      // Leveling clips
      const clipsItem = items.find((i) => i.name.includes('poziomowania'));
      expect(clipsItem).toBeDefined();
      expect(clipsItem?.packagesCount).toBeGreaterThan(0);
    });

    it('returns empty array if total area is zero', () => {
      const items = calculateTilePackage({
        roomId: 'room-1',
        roomName: 'Pusty',
        floorArea: 0,
        wallArea: 0,
        tileWidthCm: 60,
        tileHeightCm: 60,
        layoutPattern: 'straight',
      });
      expect(items).toEqual([]);
    });
  });

  describe('calculateFlooringPackage', () => {
    it('calculates panels and underlayment correctly', () => {
      const items = calculateFlooringPackage({
        roomId: 'room-2',
        roomName: 'Salon',
        floorArea: 20,
        flooringType: 'panels',
        layoutPattern: 'straight',
      });

      expect(items.length).toBe(2);
      const floorItem = items[0];
      expect(floorItem.wasteMarginPercent).toBe(8);
      expect(floorItem.finalQuantity).toBe(21.6);
      expect(floorItem.packagesCount).toBe(10); // 21.6 / 2.22 = 9.72 -> 10
    });
  });

  describe('calculateWaterproofingPackage', () => {
    it('calculates liquid foil, sealing tape and cuffs', () => {
      const items = calculateWaterproofingPackage({
        roomId: 'room-1',
        roomName: 'Łazienka',
        wetZoneFloorM2: 4,
        wetZoneWallM2: 6,
        cornersLengthM: 8,
        pipePassagesCount: 2,
      });

      expect(items.length).toBe(3);
      const foil = items.find((i) => i.name.includes('Folia w płynie'));
      expect(foil).toBeDefined();
      expect(foil?.packagesCount).toBe(2); // 10m2 * 1.4 = 14kg -> 2 buckets of 12kg
    });
  });

  describe('calculatePlasterAndPaintPackage', () => {
    it('calculates primer, plaster and paint', () => {
      const items = calculatePlasterAndPaintPackage({
        roomId: 'room-1',
        roomName: 'Pokój',
        wallArea: 35,
        ceilingArea: 15,
      });

      expect(items.length).toBe(3);
      const primer = items.find((i) => i.name.includes('Grunt'));
      const plaster = items.find((i) => i.name.includes('Gładź'));
      const paint = items.find((i) => i.name.includes('Farba'));

      expect(primer?.packagesCount).toBe(2); // 50m2 * 0.18 = 9L -> 2 cans of 5L
      expect(plaster?.packagesCount).toBe(4); // 35m2 * 1.8 = 63kg -> 4 buckets of 20kg
      expect(paint?.packagesCount).toBeGreaterThan(0);
    });
  });

  describe('calculateLevelingCompoundPackage', () => {
    it('calculates self-leveling compound bags based on thickness', () => {
      const items = calculateLevelingCompoundPackage({
        roomId: 'room-1',
        roomName: 'Korytarz',
        floorArea: 10,
        averageThicknessMm: 10,
      });

      expect(items.length).toBe(1);
      // 10m2 * 1.65 * 10 * 1.05 = 173.25 kg -> 7 bags of 25kg
      expect(items[0].packagesCount).toBe(7);
    });
  });

  describe('groupMaterialsByStore and formatShoppingListForClipboard', () => {
    const sampleMaterials: MaterialCalculation[] = [
      {
        id: '1',
        roomId: 'room-1',
        name: 'Klej C2TE',
        category: 'chemia_budowlana',
        formulaExplanation: '4 worki',
        baseQuantity: 100,
        wasteMarginPercent: 10,
        finalQuantity: 4,
        unit: 'opak.',
        estimatedUnitPrice: 55,
        totalPrice: 220,
        purchased: false,
        storeName: 'Castorama',
      },
      {
        id: '2',
        roomId: 'room-1',
        name: 'Gres 60x60',
        category: 'płytki',
        formulaExplanation: '16 paczek',
        baseQuantity: 20,
        wasteMarginPercent: 12,
        finalQuantity: 22.4,
        unit: 'm²',
        estimatedUnitPrice: 110,
        totalPrice: 2464,
        purchased: true,
        storeName: 'Salon Płytek',
      },
    ];

    it('groups materials by store name', () => {
      const grouped = groupMaterialsByStore(sampleMaterials);
      expect(Object.keys(grouped)).toContain('Castorama');
      expect(Object.keys(grouped)).toContain('Salon Płytek');
      expect(grouped['Castorama'].length).toBe(1);
    });

    it('formats shopping list for clipboard correctly', () => {
      const text = formatShoppingListForClipboard(sampleMaterials, 'all', 'Moje Mieszkanie');
      expect(text).toContain('LISTA ZAKUPÓW BUDOWLANYCH: Moje Mieszkanie');
      expect(text).toContain('SKLEP: CASTORAMA');
      expect(text).toContain('SKLEP: SALON PŁYTEK');
      expect(text).toContain('[DO KUPIENIA] Klej C2TE');
      expect(text).toContain('[KUPIŁEM] Gres 60x60');
    });
  });

  describe('calculateDrywallPackage', () => {
    it('calculates ceiling/slope drywall package with CD60 and UD27 profiles', () => {
      const items = calculateDrywallPackage({
        roomId: 'room-attic',
        roomName: 'Poddasze',
        areaM2: 25,
        type: 'ceiling_or_slope',
        boardType: 'moisture_green',
      });

      expect(items.length).toBeGreaterThanOrEqual(6);
      const boards = items.find((i) => i.name.includes('Płyta g-k impregnowana'));
      expect(boards).toBeDefined();
      expect(boards?.finalQuantity).toBeGreaterThanOrEqual(8);

      const cd60 = items.find((i) => i.name.includes('CD60'));
      expect(cd60).toBeDefined();
      expect(cd60?.finalQuantity).toBeGreaterThanOrEqual(25); // ~3.2m/m2 * 25 / 3 = 27

      const ud27 = items.find((i) => i.name.includes('UD27'));
      expect(ud27).toBeDefined();

      const screws = items.find((i) => i.name.includes('Wkręty'));
      expect(screws).toBeDefined();
    });

    it('calculates partition wall package with CW and UW profiles and acoustic wool', () => {
      const items = calculateDrywallPackage({
        roomId: 'room-wall',
        roomName: 'Korytarz',
        areaM2: 12,
        type: 'partition_wall',
        boardType: 'standard_white',
        layers: 2,
      });

      const cw = items.find((i) => i.name.includes('CW50/CW75'));
      expect(cw).toBeDefined();

      const wool = items.find((i) => i.name.includes('Wełna mineralna'));
      expect(wool).toBeDefined();
    });
  });

  describe('calculateNetWallAreaKNR', () => {
    it('accurately deducts window/door openings and adds jamb surfaces according to KNR rules', () => {
      // Ściany brutto 50 m2, okno 1.2 x 1.4 = 1.68 m2, drzwi 0.8 x 2.0 = 1.60 m2
      const openings = [
        { width: 1.2, height: 1.4, type: 'window' },
        { width: 0.8, height: 2.0, type: 'door' },
      ];

      const result = calculateNetWallAreaKNR(50.0, openings, {
        includeJambs: true,
        jambDepthM: 0.2, // 20 cm
      });

      expect(result.grossWallAreaM2).toBe(50.0);
      expect(result.openingsTotalAreaM2).toBeCloseTo(3.28, 2);
      expect(result.deductedOpeningsAreaM2).toBeCloseTo(3.28, 2);
      // Glify okno: (2*1.4 + 1.2) * 0.2 = 4.0 * 0.2 = 0.80 m2
      // Glify drzwi: (2*2.0 + 0.8) * 0.2 = 4.8 * 0.2 = 0.96 m2
      // Razem glify = 1.76 m2
      expect(result.jambsAddedAreaM2).toBeCloseTo(1.76, 2);
      // Netto = 50 - 3.28 + 1.76 = 48.48 m2
      expect(result.netWallAreaM2).toBeCloseTo(48.48, 2);
      expect(result.explanation).toContain('KNR');
    });

    it('handles wall with no openings', () => {
      const result = calculateNetWallAreaKNR(35.0, []);
      expect(result.netWallAreaM2).toBe(35.0);
      expect(result.jambsAddedAreaM2).toBe(0);
    });
  });
});
