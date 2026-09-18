import { RenovationProject } from '@/types/renovation';
import { dbGet, dbGetAll, dbPut, dbDelete, PROJECTS_STORE } from './database';

export async function saveProjectToDB(project: RenovationProject): Promise<void> {
  await dbPut(PROJECTS_STORE, project);
}

export async function getProjectFromDB(id: string): Promise<RenovationProject | undefined> {
  return dbGet<RenovationProject>(PROJECTS_STORE, id);
}

export async function getAllProjectsFromDB(): Promise<RenovationProject[]> {
  return dbGetAll<RenovationProject>(PROJECTS_STORE);
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  await dbDelete(PROJECTS_STORE, id);
}

