import { describe, expect, it } from 'vitest';
import {
  calculateProjectProgress,
  calculateRoomProgress,
  getDefaultWorkStagesForRoom,
  getRoomWorkStages,
} from './progress-helper';
import { INITIAL_RENOVATION_PROJECT } from './default-data';
import { Room, RoomWorkStage } from '@/types/renovation';

const baseRoom = INITIAL_RENOVATION_PROJECT.rooms[0];

function withStages(stages: RoomWorkStage[] | undefined): Room {
  return { ...baseRoom, workStages: stages };
}

describe('getDefaultWorkStagesForRoom', () => {
  it('returns 5 generic stages regardless of room type', () => {
    const stages = getDefaultWorkStagesForRoom('lazienka', 'room-x');
    expect(stages).toHaveLength(5);
    expect(stages.every((s) => s.status === 'planned' && !s.completed)).toBe(true);
  });

  it('scopes stage ids to the given roomId', () => {
    const stages = getDefaultWorkStagesForRoom('salon', 'room-y');
    expect(stages.every((s) => s.id.startsWith('room-y-st-'))).toBe(true);
  });
});

describe('getRoomWorkStages', () => {
  it('returns the room stages when present', () => {
    const stages = getDefaultWorkStagesForRoom('kuchnia', 'room-z');
    const room = withStages(stages);
    expect(getRoomWorkStages(room)).toBe(stages);
  });

  it('falls back to generated defaults when stages are missing or empty', () => {
    expect(getRoomWorkStages(withStages(undefined))).toHaveLength(5);
    expect(getRoomWorkStages(withStages([]))).toHaveLength(5);
  });
});

describe('calculateRoomProgress', () => {
  it('reports 0% for a room with only planned stages', () => {
    const room = withStages(getDefaultWorkStagesForRoom('salon', 'room-a'));
    const progress = calculateRoomProgress(room);
    expect(progress.percent).toBe(0);
    expect(progress.statusText).toBe('Do rozpoczęcia');
  });

  it('weights in-progress stages as 50%', () => {
    const stages = getDefaultWorkStagesForRoom('salon', 'room-b').map((s, i) =>
      i === 0 ? { ...s, status: 'in_progress' as const } : s
    );
    const room = withStages(stages);
    // 1 of 5 stages in progress = 0.5 / 5 = 10%
    expect(calculateRoomProgress(room).percent).toBe(10);
  });

  it('reports 100% when every stage is done', () => {
    const stages = getDefaultWorkStagesForRoom('salon', 'room-c').map((s) => ({
      ...s,
      completed: true,
      status: 'done' as const,
    }));
    const room = withStages(stages);
    const progress = calculateRoomProgress(room);
    expect(progress.percent).toBe(100);
    expect(progress.statusText).toBe('Ukończony');
  });

  it('treats room.isCompleted as an override to 100%', () => {
    const room = { ...withStages(getDefaultWorkStagesForRoom('salon', 'room-d')), isCompleted: true };
    expect(calculateRoomProgress(room).percent).toBe(100);
  });
});

describe('calculateProjectProgress', () => {
  it('returns zeroed summary for an empty room list', () => {
    const summary = calculateProjectProgress([]);
    expect(summary.percent).toBe(0);
    expect(summary.totalRooms).toBe(0);
    expect(summary.overallStatusText).toBe('Brak danych');
  });

  it('area-weights progress across multiple rooms', () => {
    const smallDoneRoom: Room = {
      ...baseRoom,
      id: 'small',
      area: 1,
      isCompleted: true,
      workStages: getDefaultWorkStagesForRoom('lazienka', 'small'),
    };
    const bigPendingRoom: Room = {
      ...baseRoom,
      id: 'big',
      area: 9,
      isCompleted: false,
      workStages: getDefaultWorkStagesForRoom('salon', 'big'),
    };
    const summary = calculateProjectProgress([smallDoneRoom, bigPendingRoom]);
    // 1*100 + 9*0, over total area 10 => 10%
    expect(summary.percent).toBe(10);
    expect(summary.completedRooms).toBe(1);
    expect(summary.pendingRooms).toBe(1);
  });
});
