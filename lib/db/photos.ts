import { dbDelete, dbGet, dbPut, PHOTOS_STORE } from './database';

/**
 * Local photo Blob storage — lets a room or expense reference a user-captured photo
 * (`idb:<id>`) instead of only a remote URL. Wired into ViewRoomScanMeasure's photo
 * upload and AddExpenseModal's receipt attachment; resolved for display via usePhotoSrc.
 */
export async function savePhotoBlob(id: string, blob: Blob): Promise<void> {
  await dbPut(PHOTOS_STORE, blob, id);
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  return dbGet<Blob>(PHOTOS_STORE, id);
}

export async function deletePhotoBlob(id: string): Promise<void> {
  await dbDelete(PHOTOS_STORE, id);
}

/** Creates a local object URL for a stored photo Blob. Caller must revoke it when done. */
export async function getPhotoObjectUrl(id: string): Promise<string | undefined> {
  const blob = await getPhotoBlob(id);
  return blob ? URL.createObjectURL(blob) : undefined;
}
