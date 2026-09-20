import { describe, it, expect } from 'vitest';
import { calculateGanttTimeline } from './gantt-helper';
import { RenovationStage } from '@/types/renovation';

describe('Gantt Helper', () => {
  const stages: RenovationStage[] = [
    {
      id: 's1',
      name: 'Demolka i skuwanie',
      category: 'demolition',
      status: 'done',
      progressPercent: 100,
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      isDiy: true,
      contractorCostEstimate: 2000,
      diyCostEstimate: 500,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    },
    {
      id: 's2',
      name: 'Instalacje elektryczne',
      category: 'installation',
      status: 'in_progress',
      progressPercent: 50,
      startDate: '2026-09-06',
      endDate: '2026-09-12',
      isDiy: false,
      contractorCostEstimate: 4000,
      diyCostEstimate: 1200,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    },
    {
      id: 's3',
      name: 'Wylewka',
      category: 'masonry',
      status: 'waiting_cure',
      progressPercent: 80,
      startDate: '2026-09-13',
      endDate: '2026-09-20',
      curingHoursRemaining: 18,
      isDiy: false,
      contractorCostEstimate: 1500,
      diyCostEstimate: 500,
      requiredTools: [],
      safetyGear: [],
      tasks: [],
      description: '',
    }
  ];

  it('correctly calculates timeline range and bar positions', () => {
    const timeline = calculateGanttTimeline(stages, '2026-09-01', '2026-09-20', new Date('2026-09-10T12:00:00Z'));
    expect(timeline.projectStart).toBe('2026-09-01');
    expect(timeline.projectEnd).toBe('2026-09-20');
    expect(timeline.totalDays).toBeGreaterThanOrEqual(20);
    expect(timeline.bars.length).toBe(3);

    // Bar 1 should be at left 0%
    expect(timeline.bars[0].leftPercent).toBeCloseTo(0, 0);
    expect(timeline.bars[0].status).toBe('done');

    // Bar 2 starts after Bar 1
    expect(timeline.bars[1].leftPercent).toBeGreaterThan(timeline.bars[0].leftPercent);
    expect(timeline.bars[1].durationDays).toBe(7);

    // Today offset should be calculated
    expect(timeline.todayOffsetPercent).toBeDefined();
    expect(timeline.todayOffsetPercent!).toBeGreaterThan(0);
    expect(timeline.todayOffsetPercent!).toBeLessThan(100);
  });
});
