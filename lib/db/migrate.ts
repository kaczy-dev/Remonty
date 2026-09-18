import { RenovationProject } from '@/types/renovation';
import { INITIAL_RENOVATION_PROJECT } from '../default-data';
import { clearLegacyLocalStorageProject, readLegacyLocalStorageProject } from '../storage';
import { getAllProjectsFromDB, saveProjectToDB } from './projects';
import { isIndexedDBAvailable } from './database';

/**
 * Resolves the project to show on startup:
 * 1. If IndexedDB already has a project, use it (no migration needed).
 * 2. Else, if a legacy `renovai_project_v1` localStorage entry exists, migrate it into
 *    IndexedDB once and remove the localStorage copy.
 * 3. Else, seed IndexedDB with the initial demo project.
 *
 * Falls back to the in-memory default (unpersisted) if IndexedDB is unavailable
 * (e.g. private browsing in some browsers) — the app still works, just without persistence.
 */
export async function loadOrMigrateInitialProject(): Promise<RenovationProject> {
  if (!isIndexedDBAvailable()) {
    return readLegacyLocalStorageProject() ?? structuredClone(INITIAL_RENOVATION_PROJECT);
  }

  try {
    const existing = await getAllProjectsFromDB();
    if (existing.length > 0) {
      if (typeof window !== 'undefined') {
        const lastActiveId = localStorage.getItem('renovai_active_project_id');
        if (lastActiveId) {
          const found = existing.find((p) => p.id === lastActiveId);
          if (found) return found;
        }
      }
      return existing[0];
    }

    const legacy = readLegacyLocalStorageProject();
    if (legacy) {
      await saveProjectToDB(legacy);
      clearLegacyLocalStorageProject();
      return legacy;
    }

    const seeded = structuredClone(INITIAL_RENOVATION_PROJECT);
    await saveProjectToDB(seeded);
    return seeded;
  } catch (e) {
    console.warn('IndexedDB unavailable, falling back to legacy localStorage/default project', e);
    return readLegacyLocalStorageProject() ?? structuredClone(INITIAL_RENOVATION_PROJECT);
  }
}
