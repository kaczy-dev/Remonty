import { RenovationProject, Room, RoomType } from '@/types/renovation';
import { getDefaultWorkStagesForRoom } from './progress-helper';

export type ProjectTemplateType = 'empty' | 'studio' | 'two_room' | 'three_room';

export interface CreateProjectOptions {
  title: string;
  address: string;
  budget: number;
  contingencyPercent?: number;
  templateType: ProjectTemplateType;
}

function buildRoom(
  id: string,
  name: string,
  type: RoomType,
  width: number,
  length: number,
  height: number = 2.65,
  floorType: string = 'Panele podłogowe AC5',
  wallType: string = 'Gładź i farba lateksowa'
): Room {
  const area = Number((width * length).toFixed(2));
  const perimeter = Number((2 * (width + length)).toFixed(1));
  const wallArea = Number((perimeter * height - 4.5).toFixed(1)); // minus basic window/door

  return {
    id,
    name,
    type,
    width,
    length,
    height,
    area,
    wallArea: Math.max(0, wallArea),
    perimeter,
    photoUrl: '',
    notes: '',
    openings: [
      { id: `${id}-door`, type: 'door', name: 'Drzwi pokojowe 80cm', width: 0.85, height: 2.05 },
    ],
    furniture: [],
    outlets: [],
    workStages: getDefaultWorkStagesForRoom(type, id),
    design: {
      floorType,
      floorColor: '#a16207',
      wallType,
      wallColor: '#f8fafc',
      ceilingColor: '#ffffff',
      lightingTempK: 3500,
    },
  };
}

export function createProjectFromTemplate(options: CreateProjectOptions): RenovationProject {
  const id = `proj-${crypto.randomUUID()}`;
  const contingencyReservePercent = options.contingencyPercent ?? 15;
  const today = new Date().toISOString().slice(0, 10);
  const targetEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let rooms: Room[] = [];

  switch (options.templateType) {
    case 'empty':
      rooms = [
        buildRoom(`${id}-room-1`, 'Główne Pomieszczenie', 'salon', 4.5, 4.0),
      ];
      break;

    case 'studio':
      rooms = [
        buildRoom(`${id}-room-living`, 'Pokój Dzienny z Aneksem', 'salon', 5.2, 4.2, 2.65, 'Panele laminowane dąb naturalny', 'Gładź polimerowa i farba ceramiczna'),
        buildRoom(`${id}-room-bath`, 'Łazienka z Prysznicem', 'lazienka', 2.2, 1.9, 2.65, 'Gres antypoślizgowy R10', 'Płytki ceramiczne ścienne'),
      ];
      break;

    case 'two_room':
      rooms = [
        buildRoom(`${id}-room-living`, 'Salon z Kuchnią', 'salon', 5.5, 4.5, 2.65, 'Drewno deska dąb jodełka', 'Gładź i farba zmywalna'),
        buildRoom(`${id}-room-bed`, 'Sypialnia', 'sypialnia', 3.8, 3.2, 2.65, 'Wykładzina lub panele', 'Gładź i farba matowa'),
        buildRoom(`${id}-room-bath`, 'Łazienka', 'lazienka', 2.4, 2.0, 2.65, 'Gres rektyfikowany 60x60', 'Płytki ścienne do sufitu'),
        buildRoom(`${id}-room-hall`, 'Korytarz / Przedpokój', 'przedpokoj', 3.0, 1.6, 2.65, 'Gres lub panele o wysokiej klasie ścieralności', 'Gładź i farba lateksowa'),
      ];
      break;

    case 'three_room':
      rooms = [
        buildRoom(`${id}-room-living`, 'Salon z Jadalnią', 'salon', 6.0, 4.8, 2.65, 'Deska barlinecka dębowa', 'Gładź polimerowa'),
        buildRoom(`${id}-room-kitchen`, 'Kuchnia', 'kuchnia', 3.2, 2.8, 2.65, 'Gres szkliwiony', 'Pas roboczy płytki + farba'),
        buildRoom(`${id}-room-bed1`, 'Sypialnia Główna', 'sypialnia', 4.0, 3.4, 2.65, 'Panele AC5', 'Farba zmywalna'),
        buildRoom(`${id}-room-bed2`, 'Pokój / Gabinet', 'sypialnia', 3.5, 3.0, 2.65, 'Panele AC5', 'Farba zmywalna'),
        buildRoom(`${id}-room-bath`, 'Łazienka', 'lazienka', 2.5, 2.2, 2.65, 'Gres wielkoformatowy', 'Hydroizolacja i glazura'),
        buildRoom(`${id}-room-hall`, 'Przedpokój', 'przedpokoj', 4.2, 1.8, 2.65, 'Gres 60x60', 'Gładź i farba'),
      ];
      break;
  }

  return {
    id,
    title: options.title.trim(),
    address: options.address.trim(),
    totalPlannedBudget: options.budget,
    contingencyReservePercent,
    startDate: today,
    targetEndDate: targetEnd,
    rooms,
    selectedRoomId: rooms[0]?.id || '',
    stages: [],
    materials: [],
    expenses: [],
    notifications: [],
    qaChecklist: [],
    workLogs: [],
    activeStep: 'measure',
    isOfflineMode: true,
    lastSyncedAt: 'Przed chwilą',
  };
}

/**
 * Creates a duplicate of an existing project with reset IDs
 */
export function duplicateProject(source: RenovationProject, newTitle?: string): RenovationProject {
  const newId = `proj-${crypto.randomUUID()}`;
  const copy = structuredClone(source);

  copy.id = newId;
  copy.title = newTitle || `Kopia - ${source.title}`;
  copy.startDate = new Date().toISOString().slice(0, 10);
  copy.lastSyncedAt = 'Przed chwilą';

  // Remap room IDs
  const roomIdMap = new Map<string, string>();
  copy.rooms.forEach((room, idx) => {
    const oldId = room.id;
    const newRoomId = `${newId}-room-${idx + 1}`;
    roomIdMap.set(oldId, newRoomId);
    room.id = newRoomId;

    if (room.workStages) {
      room.workStages = room.workStages.map((st, sIdx) => ({
        ...st,
        id: `${newRoomId}-st-${sIdx + 1}`,
      }));
    }
  });

  copy.selectedRoomId = copy.rooms[0]?.id || '';

  // Update room references in materials, stages, qa
  copy.materials = copy.materials.map((m) => ({
    ...m,
    id: `mat-${crypto.randomUUID()}`,
    roomId: roomIdMap.get(m.roomId) || m.roomId,
  }));

  copy.stages = copy.stages.map((s) => ({
    ...s,
    id: `stg-${crypto.randomUUID()}`,
    roomId: s.roomId ? (roomIdMap.get(s.roomId) || s.roomId) : undefined,
  }));

  copy.qaChecklist = copy.qaChecklist.map((q) => ({
    ...q,
    id: `qa-${crypto.randomUUID()}`,
    roomId: q.roomId ? (roomIdMap.get(q.roomId) || q.roomId) : undefined,
  }));

  return copy;
}
