import { describe, expect, it, beforeEach } from 'vitest';
import {
  isRenovationProjectShape,
  readLegacyLocalStorageProject,
  clearLegacyLocalStorageProject,
  saveProjectToStorage,
} from './storage';
import { INITIAL_RENOVATION_PROJECT } from './default-data';

describe('isRenovationProjectShape', () => {
  it('accepts a well-formed project', () => {
    expect(isRenovationProjectShape(INITIAL_RENOVATION_PROJECT)).toBe(true);
  });

  it.each([
    [null],
    [undefined],
    ['a string'],
    [42],
    [{}],
    [{ id: 'x' }], // missing title/rooms/stages/materials
    [{ id: 'x', title: 'y', rooms: [], stages: [], materials: 'not-an-array' }],
  ])('rejects %p', (value) => {
    expect(isRenovationProjectShape(value)).toBe(false);
  });
});

describe('legacy localStorage project (migration source)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(readLegacyLocalStorageProject()).toBeNull();
  });

  it('returns null (not a default project) for corrupted JSON', () => {
    localStorage.setItem('renovai_project_v1', '{not valid json');
    expect(readLegacyLocalStorageProject()).toBeNull();
  });

  it('returns null for a structurally invalid stored object', () => {
    localStorage.setItem('renovai_project_v1', JSON.stringify({ foo: 'bar' }));
    expect(readLegacyLocalStorageProject()).toBeNull();
  });

  it('round-trips a valid stored project and backfills missing workStages', () => {
    const projectWithoutStages = {
      ...INITIAL_RENOVATION_PROJECT,
      rooms: INITIAL_RENOVATION_PROJECT.rooms.map((r) => ({ ...r, workStages: [] })),
    };
    saveProjectToStorage(projectWithoutStages);

    const loaded = readLegacyLocalStorageProject();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(INITIAL_RENOVATION_PROJECT.id);
    expect(loaded!.rooms.every((r) => (r.workStages?.length ?? 0) > 0)).toBe(true);
  });

  it('clearLegacyLocalStorageProject removes the stored entry', () => {
    saveProjectToStorage(INITIAL_RENOVATION_PROJECT);
    clearLegacyLocalStorageProject();
    expect(readLegacyLocalStorageProject()).toBeNull();
  });
});
