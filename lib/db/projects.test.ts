import { describe, expect, it, beforeEach } from 'vitest';
import { getAllProjectsFromDB, getProjectFromDB, saveProjectToDB, deleteProjectFromDB } from './projects';
import { INITIAL_RENOVATION_PROJECT } from '../default-data';
import 'fake-indexeddb/auto';

describe('projects DB repository', () => {
  beforeEach(async () => {
    // fresh fake IndexedDB instance per test file run; each test uses a distinct id
    // instead of resetting the whole DB, since our wrapper caches the open connection.
  });

  it('saves and retrieves a project by id', async () => {
    const project = { ...INITIAL_RENOVATION_PROJECT, id: 'test-proj-1' };
    await saveProjectToDB(project);
    const loaded = await getProjectFromDB('test-proj-1');
    expect(loaded).toEqual(project);
  });

  it('returns undefined for a project that was never saved', async () => {
    const loaded = await getProjectFromDB('does-not-exist');
    expect(loaded).toBeUndefined();
  });

  it('overwrites a project saved twice under the same id', async () => {
    const project = { ...INITIAL_RENOVATION_PROJECT, id: 'test-proj-2', title: 'Original' };
    await saveProjectToDB(project);
    await saveProjectToDB({ ...project, title: 'Updated' });
    const loaded = await getProjectFromDB('test-proj-2');
    expect(loaded?.title).toBe('Updated');
  });

  it('lists all saved projects', async () => {
    await saveProjectToDB({ ...INITIAL_RENOVATION_PROJECT, id: 'list-a' });
    await saveProjectToDB({ ...INITIAL_RENOVATION_PROJECT, id: 'list-b' });
    const all = await getAllProjectsFromDB();
    const ids = all.map((p) => p.id);
    expect(ids).toContain('list-a');
    expect(ids).toContain('list-b');
  });

  it('deletes a project by id', async () => {
    await saveProjectToDB({ ...INITIAL_RENOVATION_PROJECT, id: 'delete-me' });
    expect(await getProjectFromDB('delete-me')).toBeDefined();
    await deleteProjectFromDB('delete-me');
    expect(await getProjectFromDB('delete-me')).toBeUndefined();
  });
});
