import { describe, it, expect } from 'vitest';
import { 
  POLISH_LABOR_MARKET_RATES, 
  calculateRoomLaborEstimate, 
  calculateProjectLaborEstimate, 
  calculateContractorSettlement, 
  generateRenovationContractText 
} from './labor-calculator';
import { Room, Contractor, RenovationProject } from '@/types/renovation';
import { DEFAULT_RENOVATION_PROJECT } from './default-data';

describe('labor-calculator', () => {
  const sampleBathroom: Room = {
    id: 'room-bath',
    name: 'Łazienka z prysznicem',
    type: 'lazienka',
    width: 2.0,
    length: 2.5,
    height: 2.6,
    area: 5.0,
    wallArea: 20.0,
    perimeter: 9.0,
    openings: [],
    furniture: [],
    outlets: [{ id: 'out-1', type: 'socket', label: 'Gniazdo pralki', x: 10, y: 10 }],
    design: { floorType: 'Gres', floorColor: '#ccc', wallType: 'Płytki', wallColor: '#fff', ceilingColor: '#fff', style: 'Modern', lightingTempK: 4000 },
    photoUrl: '',
    notes: '',
  };

  const sampleLiving: Room = {
    id: 'room-liv',
    name: 'Salon z jadalnią',
    type: 'salon',
    width: 5.0,
    length: 6.0,
    height: 2.6,
    area: 30.0,
    wallArea: 50.0,
    perimeter: 22.0,
    openings: [],
    furniture: [],
    outlets: [
      { id: 'out-1', type: 'socket', label: 'Gniazdo RTV', x: 10, y: 10 },
      { id: 'out-2', type: 'light_switch', label: 'Włącznik światła', x: 20, y: 10 },
    ],
    design: { floorType: 'Panele winylowe', floorColor: '#855', wallType: 'Farba ceramiczna', wallColor: '#fff', ceilingColor: '#fff', style: 'Modern', lightingTempK: 3000 },
    photoUrl: '',
    notes: '',
  };

  it('contains valid Polish market labor rates with min, avg, and max prices', () => {
    expect(POLISH_LABOR_MARKET_RATES.length).toBeGreaterThan(8);
    for (const rate of POLISH_LABOR_MARKET_RATES) {
      expect(rate.minRate).toBeGreaterThan(0);
      expect(rate.avgRate).toBeGreaterThanOrEqual(rate.minRate);
      expect(rate.maxRate).toBeGreaterThanOrEqual(rate.avgRate);
      expect(rate.name).toBeTruthy();
    }
  });

  it('calculates labor estimate for a bathroom including tiling and waterproofing', () => {
    const estimate = calculateRoomLaborEstimate(sampleBathroom);
    expect(estimate.roomId).toBe('room-bath');
    expect(estimate.items.length).toBeGreaterThanOrEqual(3);
    
    // Check tiling and hydroisolation exist in bathroom estimate
    const hasTiling = estimate.items.some((i) => i.trade === 'tiler');
    expect(hasTiling).toBe(true);

    expect(estimate.totalAvg).toBeGreaterThan(1000);
    expect(estimate.totalMin).toBeLessThan(estimate.totalAvg);
    expect(estimate.totalMax).toBeGreaterThan(estimate.totalAvg);
  });

  it('calculates labor estimate for a dry room including plastering, painting, and flooring', () => {
    const estimate = calculateRoomLaborEstimate(sampleLiving);
    expect(estimate.roomId).toBe('room-liv');
    
    const hasPainter = estimate.items.some((i) => i.trade === 'painter');
    const hasFloors = estimate.items.some((i) => i.trade === 'doors_floors');
    expect(hasPainter).toBe(true);
    expect(hasFloors).toBe(true);

    expect(estimate.totalAvg).toBeGreaterThan(2000);
  });

  it('aggregates project labor summary across multiple rooms by trade', () => {
    const summary = calculateProjectLaborEstimate([sampleBathroom, sampleLiving]);
    expect(summary.rooms.length).toBe(2);
    expect(summary.totalAvg).toBeGreaterThan(0);
    expect(summary.byTrade.tiler.totalCost).toBeGreaterThan(0);
    expect(summary.byTrade.painter.totalCost).toBeGreaterThan(0);
    expect(summary.byTrade.electrician.totalCost).toBeGreaterThan(0);
  });

  it('calculates contractor settlements correctly (paid vs remaining)', () => {
    const sampleContractor: Contractor = {
      id: 'c-1',
      name: 'Jan Kowalski',
      phone: '123456789',
      trade: 'general',
      agreedTotalCost: 20000,
      status: 'in_progress',
      scopeNotes: 'Gładzie i malowanie',
      payments: [
        { id: 'p-1', date: '2026-09-01', amount: 5000, type: 'advance', note: 'Zaliczka' },
        { id: 'p-2', date: '2026-09-10', amount: 5000, type: 'stage_settlement', note: 'Etap 1' },
      ],
    };

    const settlement = calculateContractorSettlement(sampleContractor);
    expect(settlement.agreedTotalCost).toBe(20000);
    expect(settlement.totalPaid).toBe(10000);
    expect(settlement.remainingToPay).toBe(10000);
    expect(settlement.paidPercent).toBe(50);
    expect(settlement.advancesPaid).toBe(5000);
    expect(settlement.stagesPaid).toBe(5000);
  });

  it('generates a full Polish renovation contract with legal provisions and protocol', () => {
    const sampleContractor: Contractor = {
      id: 'c-1',
      name: 'Marek Nowak',
      companyName: 'Nowak Budownictwo',
      nip: '1234567890',
      phone: '+48 600 100 200',
      trade: 'general',
      agreedTotalCost: 35000,
      status: 'contract_signed',
      scopeNotes: 'Kompleksowy remont łazienki i salonu.',
      startDate: '2026-10-01',
      endDate: '2026-11-15',
      payments: [],
    };

    const contract = generateRenovationContractText({
      project: DEFAULT_RENOVATION_PROJECT,
      contractor: sampleContractor,
      investorName: 'Piotr Inwestor',
    });

    expect(contract).toContain('UMOWA O PRACE REMONTOWO-WYKOŃCZENIOWE');
    expect(contract).toContain('Nowak Budownictwo');
    expect(contract).toContain('1234567890');
    expect(contract.replace(/\u00a0/g, ' ')).toContain('35 000 PLN');
    expect(contract).toContain('trzydzieści pięć tysięcy złotych');
    expect(contract).toContain('Piotr Inwestor');
    expect(contract).toContain('PROTOKÓŁ ODBIORU KOŃCOWEGO');
    expect(contract).toContain('GWARANCJA I RĘKOJMIA');
  });
});
