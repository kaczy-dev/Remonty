import { describe, it, expect } from 'vitest';
import {
  getReportSummaryData,
  generateMaterialsCSV,
  generateExpensesCSV,
  generateFullCostEstimateCSV,
} from './report-generator';
import { RenovationProject } from '@/types/renovation';

const mockProject: RenovationProject = {
  id: 'test-proj',
  title: 'Apartament Testowy',
  address: 'ul. Kaczaka 10, Warszawa',
  totalPlannedBudget: 50000,
  contingencyReservePercent: 15,
  startDate: '2026-03-01',
  targetEndDate: '2026-05-30',
  selectedRoomId: 'room-1',
  activeStep: 'cost',
  isOfflineMode: true,
  rooms: [
    {
      id: 'room-1',
      name: 'Salon z aneksem',
      type: 'salon',
      width: 5,
      length: 4,
      height: 2.6,
      area: 20,
      wallArea: 40,
      perimeter: 18,
      openings: [],
      furniture: [],
      outlets: [],
      design: {
        floorType: 'Panele dębowe',
        floorColor: '#a16207',
        wallType: 'Gładź i farba',
        wallColor: '#ffffff',
        ceilingColor: '#ffffff',
        lightingTempK: 3000,
      },
      photoUrl: '',
      notes: '',
    },
    {
      id: 'room-2',
      name: 'Łazienka',
      type: 'lazienka',
      width: 2.5,
      length: 2,
      height: 2.6,
      area: 5,
      wallArea: 20,
      perimeter: 9,
      openings: [],
      furniture: [],
      outlets: [],
      design: {
        floorType: 'Gres 60x60',
        floorColor: '#64748b',
        wallType: 'Płytki ścienne',
        wallColor: '#f8fafc',
        ceilingColor: '#ffffff',
        lightingTempK: 4000,
      },
      photoUrl: '',
      notes: '',
    },
  ],
  materials: [
    {
      id: 'm1',
      roomId: 'room-1',
      name: 'Panele dębowe AC5',
      category: 'podłogi',
      formulaExplanation: '20m2 + 10%',
      baseQuantity: 20,
      wasteMarginPercent: 10,
      finalQuantity: 22,
      unit: 'm²',
      estimatedUnitPrice: 100,
      totalPrice: 2200,
      purchased: true,
    },
    {
      id: 'm2',
      roomId: 'room-2',
      name: 'Gres szkliwiony',
      category: 'płytki',
      formulaExplanation: '5m2 + 15%',
      baseQuantity: 5,
      wasteMarginPercent: 15,
      finalQuantity: 5.75,
      unit: 'm²',
      estimatedUnitPrice: 120,
      totalPrice: 690,
      purchased: false,
    },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Zaliczka na panele',
      amount: 1500,
      date: '2026-03-05',
      category: 'Materiały budowlane',
      roomId: 'room-1',
      paid: true,
      paymentMethod: 'Karta / Przelew',
      receiptNote: 'Faktura FV/2026/01',
    },
  ],
  stages: [
    {
      id: 's1',
      name: 'Układanie podłóg',
      category: 'flooring',
      roomId: 'room-1',
      status: 'planned',
      progressPercent: 0,
      startDate: '2026-04-01',
      endDate: '2026-04-05',
      isDiy: false,
      contractorCostEstimate: 2500,
      diyCostEstimate: 500,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    },
  ],
  qaChecklist: [
    {
      id: 'qa1',
      roomId: 'room-1',
      stageCategory: 'flooring',
      title: 'Równość podłoża pod panele',
      standardNorm: 'PN-B-10110:2005',
      severity: 'critical',
      status: 'passed',
      toleranceGuide: 'Max 2mm na łacie 2m',
      inspectionTips: '',
    },
  ],
  notifications: [],
};

describe('Report Generator Engine', () => {
  it('calculates summary data for the entire project', () => {
    const summary = getReportSummaryData(mockProject);
    expect(summary.projectName).toBe('Apartament Testowy');
    expect(summary.totalFloorArea).toBe(25);
    expect(summary.totalWallArea).toBe(60);
    expect(summary.totalVolume).toBe(65);
    expect(summary.totalPlannedBudget).toBe(50000);
    expect(summary.contingencyAmount).toBe(7500);
    expect(summary.totalMaterialsEstimated).toBe(2890);
    expect(summary.totalLaborEstimated).toBe(2500);
    expect(summary.totalSpentActual).toBe(1500);
    expect(summary.remainingBudget).toBe(48500);
    expect(summary.qaItemsCount).toBe(1);
    expect(summary.qaPassedCount).toBe(1);
  });

  it('filters summary data for a single room', () => {
    const summary = getReportSummaryData(mockProject, 'room-1');
    expect(summary.roomsCount).toBe(1);
    expect(summary.totalFloorArea).toBe(20);
    expect(summary.totalMaterialsEstimated).toBe(2200);
    expect(summary.totalLaborEstimated).toBe(2500);
  });

  it('generates materials CSV with UTF-8 BOM and headers', () => {
    const csv = generateMaterialsCSV(mockProject.materials, mockProject.rooms);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Panele dębowe AC5');
    expect(csv).toContain('Gres szkliwiony');
    expect(csv).toContain('Salon z aneksem');
    expect(csv).toContain('22,00');
  });

  it('generates expenses CSV with UTF-8 BOM', () => {
    const csv = generateExpensesCSV(mockProject.expenses, mockProject.rooms);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Zaliczka na panele');
    expect(csv).toContain('1500,00');
    expect(csv).toContain('FV/2026/01');
  });

  it('generates full cost estimate CSV document', () => {
    const csv = generateFullCostEstimateCSV(mockProject);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('KOSZTORYS INWESTORSKI I WYKONAWCZY');
    expect(csv).toContain('Apartament Testowy');
    expect(csv).toContain('Rezerwa bezpieczeństwa (15%)');
    expect(csv).toContain('Układanie podłóg');
  });
});
