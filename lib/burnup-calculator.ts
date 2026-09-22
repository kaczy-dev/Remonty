import { RenovationProject } from '@/types/renovation';

export interface BurnupPoint {
  date: string;
  label: string;
  isPastOrToday: boolean;
  isToday: boolean;
  plannedCumulative: number; // S-Curve planned cumulative cost (PLN)
  actualCumulative: number | null; // Actual cumulative spending from receipts up to this date
  projectedCumulative: number | null; // Projected spending after today
  plannedBudgetTotal: number; // Baseline target budget line
  contingencyBudgetTotal: number; // Budget + contingency reserve line
}

export type BudgetHealthStatus = 'under_budget' | 'on_track' | 'using_reserve' | 'budget_exceeded';

export interface BurnupAnalysis {
  points: BurnupPoint[];
  totalPlannedBudget: number;
  contingencyBudgetTotal: number;
  totalSpentToDate: number;
  plannedSpendToDate: number;
  costVariance: number; // planned - actual (+ is saving, - is overspend)
  costVariancePercent: number;
  cpi: number; // Cost Performance Index (>1 good, <1 overrun)
  estimatedAtCompletion: number; // EAC
  estimatedVarianceAtCompletion: number; // totalPlannedBudget - EAC
  averageWeeklyBurn: number;
  weeksRemaining: number;
  budgetStatus: BudgetHealthStatus;
  statusMessage: string;
}

/**
 * Parses YYYY-MM-DD safely into Date at midnight UTC.
 */
function parseDate(dStr: string): Date {
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  }
  return new Date(dStr);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatLabel(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export function calculateBudgetBurnup(
  project: RenovationProject,
  currentDateStr: string = new Date().toISOString().slice(0, 10)
): BurnupAnalysis {
  const today = parseDate(currentDateStr);
  const baselineBudget = project.totalPlannedBudget || 1;
  const contingencyAmount = Math.round((baselineBudget * (project.contingencyReservePercent || 0)) / 100);
  const contingencyBudgetTotal = baselineBudget + contingencyAmount;

  // Determine timeline boundaries
  const allDates: string[] = [
    project.startDate || currentDateStr,
    project.targetEndDate || currentDateStr,
    ...project.stages.map((s) => s.startDate),
    ...project.stages.map((s) => s.endDate),
    ...project.expenses.map((e) => e.date),
  ].filter(Boolean);

  let minDate = today;
  let maxDate = today;

  if (allDates.length > 0) {
    const timestamps = allDates.map((d) => parseDate(d).getTime());
    minDate = new Date(Math.min(...timestamps));
    maxDate = new Date(Math.max(...timestamps));
  }

  // Ensure start is at or before today, and max is at least today
  if (minDate > today) minDate = new Date(today.getTime() - 7 * 86400000);
  if (maxDate < today) maxDate = new Date(today.getTime() + 14 * 86400000);

  // Generate weekly intervals across timeline
  const intervals: Date[] = [];
  const curr = new Date(minDate);
  while (curr <= maxDate) {
    intervals.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 7);
  }
  // Ensure maxDate and today are represented
  if (intervals.length === 0 || intervals[intervals.length - 1] < maxDate) {
    intervals.push(new Date(maxDate));
  }

  // Calculate planned cost for each stage
  const stageCosts = project.stages.map((s) => {
    const cost = s.isDiy ? (s.diyCostEstimate || 0) : (s.contractorCostEstimate || 0);
    const start = parseDate(s.startDate).getTime();
    const end = parseDate(s.endDate).getTime();
    return {
      cost: cost > 0 ? cost : (baselineBudget / Math.max(1, project.stages.length)),
      start,
      end: end > start ? end : start + 86400000,
    };
  });

  // Calculate planned spending at any given timestamp (Linear distribution across stage duration)
  const getPlannedCumulativeAt = (time: number): number => {
    let sum = 0;
    for (const sc of stageCosts) {
      if (time <= sc.start) {
        continue;
      } else if (time >= sc.end) {
        sum += sc.cost;
      } else {
        const ratio = (time - sc.start) / (sc.end - sc.start);
        sum += sc.cost * ratio;
      }
    }
    return Math.round(sum);
  };

  // Sort expenses by date
  const sortedExpenses = [...project.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const totalSpentToDate = sortedExpenses
    .filter((e) => e.date <= currentDateStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const plannedSpendToDate = getPlannedCumulativeAt(today.getTime());
  const costVariance = plannedSpendToDate - totalSpentToDate;
  const costVariancePercent = plannedSpendToDate > 0
    ? Math.round((costVariance / plannedSpendToDate) * 100)
    : 0;

  // Earned Value (EV) calculation according to EVM standards:
  // EV = sum(stageBudget * progressPercent)
  const earnedValueToDate = stageCosts.reduce((sum, sc, idx) => {
    const stage = project.stages[idx];
    const progress = stage ? Math.max(0, Math.min(100, stage.progressPercent || 0)) / 100 : 0;
    return sum + sc.cost * progress;
  }, 0);

  // Cost Performance Index (CPI) according to EVM standard: CPI = EV / AC (with PV / AC fallback if progress not recorded)
  const valueBasis = earnedValueToDate > 0 ? earnedValueToDate : plannedSpendToDate;
  let cpi = 1.0;
  if (totalSpentToDate > 0 && valueBasis > 0) {
    cpi = Number((valueBasis / totalSpentToDate).toFixed(2));
  } else if (totalSpentToDate > 0 && valueBasis === 0) {
    cpi = 0.8;
  }

  // Estimated at Completion (EAC):
  // Formula: EAC = totalPlannedBudget / CPI (bounded to reasonable range)
  const safeCpi = Math.max(0.4, Math.min(2.0, cpi));
  const estimatedAtCompletion = Math.round(baselineBudget / safeCpi);
  const estimatedVarianceAtCompletion = baselineBudget - estimatedAtCompletion;

  // Average weekly burn rate
  const daysSinceStart = Math.max(7, Math.round((today.getTime() - minDate.getTime()) / 86400000));
  const averageWeeklyBurn = Math.round((totalSpentToDate / daysSinceStart) * 7);

  const daysRemaining = Math.max(0, Math.round((maxDate.getTime() - today.getTime()) / 86400000));
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  // Determine Budget Status
  let budgetStatus: BudgetHealthStatus = 'on_track';
  let statusMessage = 'Wydatki są w normie i mieszczą się w planowanym budżecie.';

  if (totalSpentToDate > contingencyBudgetTotal) {
    budgetStatus = 'budget_exceeded';
    statusMessage = `Przekroczono całkowity budżet wraz z rezerwą o ${(
      totalSpentToDate - contingencyBudgetTotal
    ).toLocaleString('pl-PL')} zł. Wymagana pilna rewizja zakresu prac!`;
  } else if (totalSpentToDate > baselineBudget) {
    budgetStatus = 'using_reserve';
    statusMessage = `Przekroczono budżet bazowy o ${(
      totalSpentToDate - baselineBudget
    ).toLocaleString('pl-PL')} zł. Wykorzystywana jest rezerwa inwestycyjna.`;
  } else if (cpi >= 1.05) {
    budgetStatus = 'under_budget';
    statusMessage = `Wydatki są o ${costVariance.toLocaleString(
      'pl-PL'
    )} zł niższe niż planowano na tym etapie (wysoka dyscyplina kosztowa).`;
  }

  // Build datapoints
  const points: BurnupPoint[] = intervals.map((intDate) => {
    const dStr = formatDate(intDate);
    const time = intDate.getTime();
    const isPastOrToday = time <= today.getTime();
    const isToday = dStr === currentDateStr;

    const planned = getPlannedCumulativeAt(time);

    let actual: number | null = null;
    if (isPastOrToday) {
      actual = sortedExpenses
        .filter((e) => e.date <= dStr)
        .reduce((sum, e) => sum + e.amount, 0);
    }

    let projected: number | null = null;
    if (time >= today.getTime()) {
      if (isToday) {
        projected = totalSpentToDate;
      } else {
        // Linear forecast toward EAC at project end
        const progressFromToday = (time - today.getTime()) / Math.max(1, maxDate.getTime() - today.getTime());
        projected = Math.round(totalSpentToDate + (estimatedAtCompletion - totalSpentToDate) * progressFromToday);
      }
    }

    return {
      date: dStr,
      label: formatLabel(intDate),
      isPastOrToday,
      isToday,
      plannedCumulative: planned,
      actualCumulative: actual,
      projectedCumulative: projected,
      plannedBudgetTotal: baselineBudget,
      contingencyBudgetTotal: contingencyBudgetTotal,
    };
  });

  return {
    points,
    totalPlannedBudget: baselineBudget,
    contingencyBudgetTotal,
    totalSpentToDate,
    plannedSpendToDate,
    costVariance,
    costVariancePercent,
    cpi,
    estimatedAtCompletion,
    estimatedVarianceAtCompletion,
    averageWeeklyBurn,
    weeksRemaining,
    budgetStatus,
    statusMessage,
  };
}
