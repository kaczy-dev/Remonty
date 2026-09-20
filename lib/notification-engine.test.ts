import { describe, it, expect } from 'vitest';
import { generateAutomatedProjectAlerts, syncProjectNotifications } from './notification-engine';
import { RenovationProject } from '@/types/renovation';

const baseMockProject: RenovationProject = {
  id: 'test-alerts',
  title: 'Projekt Alertów',
  address: 'ul. Testowa 1',
  totalPlannedBudget: 10000,
  contingencyReservePercent: 10,
  startDate: '2026-09-01',
  targetEndDate: '2026-09-30',
  rooms: [],
  selectedRoomId: '',
  stages: [
    {
      id: 'st-curing',
      name: 'Wylewka samopoziomująca',
      category: 'masonry',
      status: 'waiting_cure',
      progressPercent: 70,
      startDate: '2026-09-10',
      endDate: '2026-09-15',
      curingTimeHours: 48,
      curingHoursRemaining: 24,
      isDiy: false,
      contractorCostEstimate: 1500,
      diyCostEstimate: 500,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    },
    {
      id: 'st-overdue',
      name: 'Instalacja hydrauliczna',
      category: 'installation',
      status: 'in_progress',
      progressPercent: 50,
      startDate: '2026-09-01',
      endDate: '2026-09-05', // in past relative to 2026-09-20
      isDiy: false,
      contractorCostEstimate: 2000,
      diyCostEstimate: 800,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    }
  ],
  materials: [],
  expenses: [
    {
      id: 'exp-1',
      title: 'Materiały',
      amount: 9000,
      date: '2026-09-10',
      category: 'Materiały budowlane',
      paid: true,
      paymentMethod: 'Gotówka',
    }
  ],
  notifications: [],
  qaChecklist: [
    {
      id: 'qa-fail-1',
      stageCategory: 'installation',
      title: 'Próba szczelności rur',
      standardNorm: 'PN-EN 806-4',
      severity: 'critical',
      status: 'failed',
      toleranceGuide: 'Brak spadku ciśnienia',
      inspectionTips: '',
    }
  ],
  activeStep: 'plan',
  isOfflineMode: true,
};

describe('Notification Engine', () => {
  const mockNow = new Date('2026-09-20T10:00:00Z');

  it('detects technological curing hours remaining alert', () => {
    const alerts = generateAutomatedProjectAlerts(baseMockProject, mockNow);
    const cureAlert = alerts.find((a) => a.type === 'cure_time');
    expect(cureAlert).toBeDefined();
    expect(cureAlert?.title).toContain('Wylewka samopoziomująca');
    expect(cureAlert?.message).toContain('24h');
  });

  it('detects budget 90% warning when expenses reach 9000 out of 10000', () => {
    const alerts = generateAutomatedProjectAlerts(baseMockProject, mockNow);
    const budgetAlert = alerts.find((a) => a.id === 'alert-budget-warning');
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert?.title).toContain('90% budżetu');
  });

  it('detects overdue stage past its deadline', () => {
    const alerts = generateAutomatedProjectAlerts(baseMockProject, mockNow);
    const overdueAlert = alerts.find((a) => a.id === 'alert-delay-st-overdue');
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert?.title).toContain('Opóźnienie w harmonogramie');
  });

  it('detects critical failed QA check', () => {
    const alerts = generateAutomatedProjectAlerts(baseMockProject, mockNow);
    const qaAlert = alerts.find((a) => a.id === 'alert-qa-failed-qa-fail-1');
    expect(qaAlert).toBeDefined();
    expect(qaAlert?.title).toContain('Wykryto usterkę krytyczną');
  });

  it('merges automated alerts with existing user notifications without duplicates', () => {
    const updatedNotifications = syncProjectNotifications(baseMockProject);
    expect(updatedNotifications.length).toBeGreaterThanOrEqual(4);
    
    // Sync again should not duplicate
    const projectWithNotifs: RenovationProject = {
      ...baseMockProject,
      notifications: updatedNotifications,
    };
    const syncedAgain = syncProjectNotifications(projectWithNotifs);
    expect(syncedAgain.length).toBe(updatedNotifications.length);
  });
});
