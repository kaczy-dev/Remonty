import { RenovationProject } from '@/types/renovation';
import { INITIAL_RENOVATION_PROJECT } from './default-data';
import { getDefaultWorkStagesForRoom } from './progress-helper';

const STORAGE_KEY = 'renovai_project_v1';

/**
 * Minimal structural check for a parsed/imported project object. Not a full schema
 * validation, but catches corrupt/foreign JSON before it reaches `.map`/`.find` calls
 * downstream.
 */
export function isRenovationProjectShape(value: unknown): value is RenovationProject {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    Array.isArray(p.rooms) &&
    Array.isArray(p.stages) &&
    Array.isArray(p.materials)
  );
}

function backfillWorkStages(project: RenovationProject): RenovationProject {
  if (!project.rooms || !Array.isArray(project.rooms)) return project;
  return {
    ...project,
    rooms: project.rooms.map((room) => {
      if (!room.workStages || room.workStages.length === 0) {
        return { ...room, workStages: getDefaultWorkStagesForRoom(room.type, room.id) };
      }
      return room;
    }),
  };
}

/**
 * Reads the pre-IndexedDB (`renovai_project_v1`) localStorage project, if one exists and is
 * valid. Returns `null` (not a default project) when there is nothing to migrate — callers
 * use this to distinguish "no legacy data" from "legacy data present".
 */
export function readLegacyLocalStorageProject(): RenovationProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRenovationProjectShape(parsed)) {
      console.warn('Legacy localStorage project has an invalid shape, ignoring it');
      return null;
    }
    return backfillWorkStages(parsed);
  } catch (e) {
    console.warn('Could not read legacy localStorage project', e);
    return null;
  }
}

export function clearLegacyLocalStorageProject(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** @deprecated Project storage now lives in IndexedDB (see lib/db/projects.ts). Kept only as a migration source. */
export function loadProjectFromStorage(): RenovationProject {
  return readLegacyLocalStorageProject() ?? structuredClone(INITIAL_RENOVATION_PROJECT);
}

/** @deprecated Project storage now lives in IndexedDB (see lib/db/projects.ts). */
export function saveProjectToStorage(project: RenovationProject): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch (e) {
    console.error('Failed to save project to localStorage', e);
    return false;
  }
}

export function exportProjectJson(project: RenovationProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `renovai-${project.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
