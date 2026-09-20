import { RenovationProject, RenovationStage } from '@/types/renovation';

export interface GanttBarItem {
  id: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  status: RenovationStage['status'];
  progressPercent: number;
  isDiy: boolean;
  contractorCostEstimate: number;
  curingHoursRemaining?: number;
  // Gantt calculated metrics (percentages 0-100% relative to project duration)
  leftPercent: number;
  widthPercent: number;
  durationDays: number;
  startDayOffset: number;
  isDelayed?: boolean;
}

export interface GanttTimelineMeta {
  projectStart: string;
  projectEnd: string;
  totalDays: number;
  todayOffsetPercent?: number;
  timeAxisMarkers: { label: string; offsetPercent: number }[];
  bars: GanttBarItem[];
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function diffDays(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / msPerDay));
}

/**
 * Calculates Gantt timeline coordinates, grid marks, and bar offsets
 */
export function calculateGanttTimeline(
  stages: RenovationStage[],
  projectStartDate?: string,
  projectEndDate?: string,
  currentDate: Date = new Date()
): GanttTimelineMeta {
  if (stages.length === 0) {
    const start = projectStartDate || new Date().toISOString().slice(0, 10);
    const end = projectEndDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return {
      projectStart: start,
      projectEnd: end,
      totalDays: 30,
      timeAxisMarkers: [],
      bars: [],
    };
  }

  // Find min start and max end dates across stages and project configuration
  const allStarts = stages.map((s) => s.startDate).filter(Boolean);
  if (projectStartDate) allStarts.push(projectStartDate);

  const allEnds = stages.map((s) => s.endDate).filter(Boolean);
  if (projectEndDate) allEnds.push(projectEndDate);

  allStarts.sort();
  allEnds.sort();

  const minStartStr = allStarts[0] || new Date().toISOString().slice(0, 10);
  const maxEndStr = allEnds[allEnds.length - 1] || minStartStr;

  const minStartDate = parseDate(minStartStr);
  const maxEndDate = parseDate(maxEndStr);

  // Total project duration in days (at least 7 days to avoid 0 division)
  const totalDays = Math.max(7, diffDays(minStartDate, maxEndDate) + 1);

  // Today indicator offset
  const todayStr = currentDate.toISOString().slice(0, 10);
  const todayDate = parseDate(todayStr);
  let todayOffsetPercent: number | undefined;

  if (todayDate >= minStartDate && todayDate <= maxEndDate) {
    const todayDiff = diffDays(minStartDate, todayDate);
    todayOffsetPercent = Math.min(100, Math.max(0, (todayDiff / totalDays) * 100));
  }

  // Generate 5-7 grid marks across the timeline
  const stepDays = Math.max(3, Math.ceil(totalDays / 6));
  const timeAxisMarkers: { label: string; offsetPercent: number }[] = [];

  for (let day = 0; day <= totalDays; day += stepDays) {
    const markerDate = new Date(minStartDate.getTime() + day * 86400000);
    const label = markerDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const offsetPercent = Math.min(100, (day / totalDays) * 100);
    timeAxisMarkers.push({ label, offsetPercent });
  }

  // Calculate coordinates for each stage bar
  const bars: GanttBarItem[] = stages.map((stage) => {
    const sDate = parseDate(stage.startDate || minStartStr);
    const eDate = parseDate(stage.endDate || stage.startDate || minStartStr);

    const startOffsetDays = Math.max(0, diffDays(minStartDate, sDate) - 1);
    const duration = Math.max(1, diffDays(sDate, eDate) + 1);

    const leftPercent = Math.min(99, Math.max(0, (startOffsetDays / totalDays) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(3, (duration / totalDays) * 100));

    const isDelayed = stage.status !== 'done' && stage.endDate < todayStr;

    return {
      id: stage.id,
      name: stage.name,
      category: stage.category,
      startDate: stage.startDate,
      endDate: stage.endDate,
      status: stage.status,
      progressPercent: stage.progressPercent,
      isDiy: stage.isDiy,
      contractorCostEstimate: stage.contractorCostEstimate,
      curingHoursRemaining: stage.curingHoursRemaining,
      leftPercent: Number(leftPercent.toFixed(2)),
      widthPercent: Number(widthPercent.toFixed(2)),
      durationDays: duration,
      startDayOffset: startOffsetDays,
      isDelayed,
    };
  });

  return {
    projectStart: minStartStr,
    projectEnd: maxEndStr,
    totalDays,
    todayOffsetPercent: todayOffsetPercent !== undefined ? Number(todayOffsetPercent.toFixed(2)) : undefined,
    timeAxisMarkers,
    bars,
  };
}
