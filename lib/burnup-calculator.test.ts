import { describe, expect, it } from 'vitest';
import { calculateBudgetBurnup } from './burnup-calculator';
import { INITIAL_RENOVATION_PROJECT } from './default-data';

describe('Budget Burn-up and S-Curve Calculator', () => {
  it('calculates burnup analysis with planned curve and actual points', () => {
    const analysis = calculateBudgetBurnup(INITIAL_RENOVATION_PROJECT, '2026-09-21');

    expect(analysis.totalPlannedBudget).toBe(INITIAL_RENOVATION_PROJECT.totalPlannedBudget);
    expect(analysis.contingencyBudgetTotal).toBeGreaterThan(analysis.totalPlannedBudget);
    expect(analysis.points.length).toBeGreaterThan(0);

    const firstPoint = analysis.points[0];
    expect(firstPoint.plannedCumulative).toBeDefined();
    expect(firstPoint.plannedBudgetTotal).toBe(analysis.totalPlannedBudget);
  });

  it('detects when budget is on track and calculates CPI', () => {
    const project = {
      ...INITIAL_RENOVATION_PROJECT,
      totalPlannedBudget: 50000,
      contingencyReservePercent: 10,
      expenses: [
        {
          id: 'exp-1',
          title: 'Gładzie i farby',
          amount: 5000,
          category: 'Materiały budowlane' as const,
          date: '2026-09-10',
          paid: true,
        },
      ],
    };

    const analysis = calculateBudgetBurnup(project, '2026-09-21');
    expect(analysis.totalSpentToDate).toBe(5000);
    expect(analysis.cpi).toBeGreaterThan(0);
    expect(analysis.estimatedAtCompletion).toBeGreaterThan(0);
  });

  it('detects budget exceeded status when total expenses exceed contingency limit', () => {
    const project = {
      ...INITIAL_RENOVATION_PROJECT,
      totalPlannedBudget: 20000,
      contingencyReservePercent: 10, // Max 22,000 PLN
      expenses: [
        {
          id: 'exp-big',
          title: 'Materiały luksusowe',
          amount: 25000,
          category: 'Materiały budowlane' as const,
          date: '2026-09-15',
          paid: true,
        },
      ],
    };

    const analysis = calculateBudgetBurnup(project, '2026-09-21');
    expect(analysis.budgetStatus).toBe('budget_exceeded');
    expect(analysis.statusMessage).toContain('Przekroczono całkowity budżet');
  });

  it('detects using reserve status when expenses exceed baseline but within reserve', () => {
    const project = {
      ...INITIAL_RENOVATION_PROJECT,
      totalPlannedBudget: 20000,
      contingencyReservePercent: 20, // Max 24,000 PLN
      expenses: [
        {
          id: 'exp-mid',
          title: 'Kafelki i armatura',
          amount: 21500,
          category: 'Wykończenie i dekoracje' as const,
          date: '2026-09-15',
          paid: true,
        },
      ],
    };

    const analysis = calculateBudgetBurnup(project, '2026-09-21');
    expect(analysis.budgetStatus).toBe('using_reserve');
    expect(analysis.statusMessage).toContain('rezerwa inwestycyjna');
  });
});
