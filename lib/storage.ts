import { RenovationProject } from '@/types/renovation';
import { INITIAL_RENOVATION_PROJECT } from './default-data';
import { getDefaultWorkStagesForRoom } from './progress-helper';

const STORAGE_KEY = 'renovai_project_v1';
const E2EE_PASS_HASH_KEY = 'renovai_vault_hash';

export function loadProjectFromStorage(): RenovationProject {
  if (typeof window === 'undefined') {
    return INITIAL_RENOVATION_PROJECT;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: RenovationProject = JSON.parse(raw);
      // Ensure all rooms have workStages populated
      if (parsed.rooms && Array.isArray(parsed.rooms)) {
        parsed.rooms = parsed.rooms.map((room) => {
          if (!room.workStages || room.workStages.length === 0) {
            return {
              ...room,
              workStages: getDefaultWorkStagesForRoom(room.type, room.id),
            };
          }
          return room;
        });
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Could not load from localStorage, returning initial project', e);
  }
  return INITIAL_RENOVATION_PROJECT;
}

export function saveProjectToStorage(project: RenovationProject): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('Failed to save project to localStorage', e);
  }
}

export function getVaultPassHash(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(E2EE_PASS_HASH_KEY);
}

export function setVaultPassHash(hash: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(E2EE_PASS_HASH_KEY, hash);
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
