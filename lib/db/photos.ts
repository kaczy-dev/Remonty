import { dbDelete, dbGet, dbGetAllKeys, dbPut, openDatabase, PHOTOS_STORE } from './database';

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

/** Retrieves all photo IDs stored in IndexedDB. */
export async function getAllPhotoIds(): Promise<string[]> {
  const keys = await dbGetAllKeys(PHOTOS_STORE);
  return keys.map((k) => String(k));
}

/** Returns a Map of all photo blobs keyed by photo ID string. */
export async function getAllPhotosMap(): Promise<Map<string, Blob>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const map = new Map<string, Blob>();
    const tx = db.transaction(PHOTOS_STORE, 'readonly');
    const store = tx.objectStore(PHOTOS_STORE);
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        map.set(String(cursor.key), cursor.value as Blob);
        cursor.continue();
      } else {
        resolve(map);
      }
    };
    req.onerror = () => reject(tx.error || req.error);
  });
}

/** Saves multiple photo blobs in a single readwrite transaction. */
export async function saveMultiplePhotoBlobs(entries: [string, Blob][]): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, 'readwrite');
    const store = tx.objectStore(PHOTOS_STORE);
    for (const [id, blob] of entries) {
      store.put(blob, id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
