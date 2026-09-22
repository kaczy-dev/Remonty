import { RenovationStage, Room, RoomType, RoomWorkStage, StageCategory, StageStatus } from '@/types/renovation';

/**
 * Generic 5-stage work template used to seed a room's checklist, regardless of room type.
 */
const GENERIC_STAGE_TEMPLATE: Array<{
  name: string;
  category: StageCategory;
  notes: string;
}> = [
  { name: 'Demontaże i przygotowanie podłoża', category: 'demolition', notes: 'Usunięcie starych okładzin/zabudowy, zabezpieczenie i uprzątnięcie gruzu.' },
  { name: 'Instalacje (elektryka, wod-kan)', category: 'installation', notes: 'Rozprowadzenie i podłączenie instalacji zgodnie z projektem.' },
  { name: 'Tynkowanie / gładzie / izolacja', category: 'masonry', notes: 'Wyrównanie ścian i sufitu, izolacja w miejscach tego wymagających.' },
  { name: 'Wykończenie ścian i podłóg', category: 'finishing', notes: 'Malowanie, płytki lub panele — zgodnie z wybranym projektem wykończenia.' },
  { name: 'Stolarka, biały montaż i sprzątanie', category: 'carpentry', notes: 'Montaż drzwi/mebli/armatury oraz sprzątanie końcowe pomieszczenia.' },
];

/**
 * Standard work stages seeded for a room, based on a generic renovation-phase template.
 */
export function getDefaultWorkStagesForRoom(roomType: RoomType, roomId: string): RoomWorkStage[] {
  return GENERIC_STAGE_TEMPLATE.map((stage, idx) => ({
    id: `${roomId}-st-${idx + 1}`,
    name: stage.name,
    category: stage.category,
    completed: false,
    status: 'planned' as StageStatus,
    order: idx + 1,
    notes: stage.notes,
  }));
}

/**
 * Returns room's stages or initialized defaults.
 */
export function getRoomWorkStages(room: Room): RoomWorkStage[] {
  if (room.workStages && room.workStages.length > 0) {
    return room.workStages;
  }
  return getDefaultWorkStagesForRoom(room.type, room.id);
}

export interface RoomProgressInfo {
  percent: number;
  completedCount: number;
  totalCount: number;
  statusText: 'Ukończony' | 'Zaawansowany' | 'W toku' | 'Rozpoczęty' | 'Do rozpoczęcia';
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  progressBarGradient: string;
}

/**
 * Calculates progress metrics and visual styling for a specific room.
 */
export function calculateRoomProgress(room: Room): RoomProgressInfo {
  const stages = getRoomWorkStages(room);
  const totalCount = stages.length;

  if (totalCount === 0) {
    return {
      percent: 0,
      completedCount: 0,
      totalCount: 0,
      statusText: 'Do rozpoczęcia',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-900',
      badgeText: 'text-slate-300',
      badgeBorder: 'border-slate-800',
      progressBarGradient: 'from-slate-700 to-slate-600',
    };
  }

  // If marked explicitly completed
  if (room.isCompleted) {
    return {
      percent: 100,
      completedCount: totalCount,
      totalCount,
      statusText: 'Ukończony',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      progressBarGradient: 'from-emerald-500 to-teal-400',
    };
  }

  const completedCount = stages.filter((s) => s.completed || s.status === 'done').length;
  const inProgressCount = stages.filter((s) => !s.completed && s.status === 'in_progress').length;
  
  // Stages in progress count as 50%
  const effectiveScore = completedCount + inProgressCount * 0.5;
  const percent = Math.min(100, Math.round((effectiveScore / totalCount) * 100));

  if (percent === 100) {
    return {
      percent: 100,
      completedCount: totalCount,
      totalCount,
      statusText: 'Ukończony',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      progressBarGradient: 'from-emerald-500 to-teal-400',
    };
  }

  if (percent >= 60) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'Zaawansowany',
      colorClass: 'text-teal-400',
      badgeBg: 'bg-teal-950/80',
      badgeText: 'text-teal-300',
      badgeBorder: 'border-teal-500/40',
      progressBarGradient: 'from-teal-500 to-cyan-400',
    };
  }

  if (percent >= 25) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'W toku',
      colorClass: 'text-amber-400',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      progressBarGradient: 'from-amber-500 to-yellow-400',
    };
  }

  if (percent > 0) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'Rozpoczęty',
      colorClass: 'text-sky-400',
      badgeBg: 'bg-sky-950/80',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-sky-500/40',
      progressBarGradient: 'from-sky-500 to-blue-400',
    };
  }

  return {
    percent: 0,
    completedCount: 0,
    totalCount,
    statusText: 'Do rozpoczęcia',
    colorClass: 'text-slate-400',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-slate-800',
    progressBarGradient: 'from-slate-700 to-slate-600',
  };
}

export interface ProjectProgressSummary {
  percent: number; // area-weighted
  simpleAveragePercent: number;
  totalStages: number;
  completedStages: number;
  totalRooms: number;
  completedRooms: number;
  inProgressRooms: number;
  pendingRooms: number;
  totalArea: number;
  completedArea: number;
  overallStatusText: string;
}

/**
 * Calculates global project progress metrics across all rooms.
 */
export function calculateProjectProgress(rooms: Room[]): ProjectProgressSummary {
  if (!rooms || rooms.length === 0) {
    return {
      percent: 0,
      simpleAveragePercent: 0,
      totalStages: 0,
      completedStages: 0,
      totalRooms: 0,
      completedRooms: 0,
      inProgressRooms: 0,
      pendingRooms: 0,
      totalArea: 0,
      completedArea: 0,
      overallStatusText: 'Brak danych',
    };
  }

  let totalStages = 0;
  let completedStages = 0;
  let totalArea = 0;
  let weightedProgressSum = 0;
  let simplePercentSum = 0;

  let completedRooms = 0;
  let inProgressRooms = 0;
  let pendingRooms = 0;

  rooms.forEach((room) => {
    const roomProgress = calculateRoomProgress(room);
    const roomStages = getRoomWorkStages(room);

    totalStages += roomStages.length;
    completedStages += roomProgress.completedCount;
    totalArea += room.area;

    weightedProgressSum += roomProgress.percent * room.area;
    simplePercentSum += roomProgress.percent;

    if (roomProgress.percent === 100) {
      completedRooms += 1;
    } else if (roomProgress.percent > 0) {
      inProgressRooms += 1;
    } else {
      pendingRooms += 1;
    }
  });

  const simpleAveragePercent = Math.round(simplePercentSum / rooms.length);
  const weightedPercent = totalArea > 0 ? Math.round(weightedProgressSum / totalArea) : simpleAveragePercent;
  const completedArea = parseFloat(((weightedPercent / 100) * totalArea).toFixed(1));

  let overallStatusText = 'W trakcie realizacji';
  if (weightedPercent === 100) overallStatusText = 'Remont ukończony';
  else if (weightedPercent >= 75) overallStatusText = 'Faza wykończeniowa';
  else if (weightedPercent >= 40) overallStatusText = 'Zaawansowane prace';
  else if (weightedPercent > 0) overallStatusText = 'Wczesny etap prac';
  else overallStatusText = 'Stan przygotowawczy';

  return {
    percent: weightedPercent,
    simpleAveragePercent,
    totalStages,
    completedStages,
    totalRooms: rooms.length,
    completedRooms,
    inProgressRooms,
    pendingRooms,
    totalArea: parseFloat(totalArea.toFixed(1)),
    completedArea,
    overallStatusText,
  };
}

/**
 * Synchronizes project-level timeline stages (project.stages used in Gantt & EVM Burnup)
 * with actual room-level work stages (room.workStages).
 *
 * For each project stage:
 * - If stage.roomId is specified, syncs directly with that room's work stages in that category (or overall room progress).
 * - If stage.roomId is omitted (global milestone), aggregates all room stages of matching category across rooms.
 */
export function syncProjectStagesFromRooms(
  stages: RenovationStage[],
  rooms: Room[]
): RenovationStage[] {
  if (!stages || stages.length === 0 || !rooms || rooms.length === 0) {
    return stages;
  }

  return stages.map((stage) => {
    // If the stage is mapped to a specific room
    if (stage.roomId) {
      const room = rooms.find((r) => r.id === stage.roomId);
      if (!room) return stage;

      const roomStages = getRoomWorkStages(room);
      const matchingStage = roomStages.find((s) => s.category === stage.category);

      if (matchingStage) {
        const progress = matchingStage.completed || matchingStage.status === 'done'
          ? 100
          : matchingStage.status === 'in_progress'
          ? 50
          : 0;
        const status: StageStatus = progress === 100 ? 'done' : progress > 0 ? 'in_progress' : 'planned';
        return {
          ...stage,
          progressPercent: progress,
          status,
        };
      } else {
        const roomProgress = calculateRoomProgress(room);
        const status: StageStatus = roomProgress.percent === 100 ? 'done' : roomProgress.percent > 0 ? 'in_progress' : 'planned';
        return {
          ...stage,
          progressPercent: roomProgress.percent,
          status,
        };
      }
    }

    // Global project stage: aggregate all room stages of matching category
    const relevantRoomStages: { completed: boolean; status: StageStatus }[] = [];
    rooms.forEach((room) => {
      const roomStages = getRoomWorkStages(room);
      const matched = roomStages.filter((s) => s.category === stage.category);
      if (matched.length > 0) {
        relevantRoomStages.push(...matched);
      }
    });

    if (relevantRoomStages.length === 0) {
      return stage;
    }

    const total = relevantRoomStages.length;
    const completed = relevantRoomStages.filter((s) => s.completed || s.status === 'done').length;
    const inProgress = relevantRoomStages.filter((s) => !s.completed && s.status === 'in_progress').length;

    const avgProgress = Math.min(100, Math.round(((completed + inProgress * 0.5) / total) * 100));
    const status: StageStatus = avgProgress === 100 ? 'done' : avgProgress > 0 ? 'in_progress' : 'planned';

    return {
      ...stage,
      progressPercent: avgProgress,
      status,
    };
  });
}
