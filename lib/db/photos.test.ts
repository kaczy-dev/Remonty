// @vitest-environment node
//
// fake-indexeddb's structured-clone of Blob doesn't recognize jsdom's Blob global
// (it checks `instanceof` against Node's own Blob) — this store doesn't need the DOM,
// so it runs under the plain Node environment where Blob round-trips correctly.
import { describe, expect, it } from 'vitest';
import { deletePhotoBlob, getPhotoBlob, savePhotoBlob } from './photos';
import 'fake-indexeddb/auto';

describe('photos DB repository', () => {
  it('saves and retrieves a photo Blob by id', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' });
    await savePhotoBlob('photo-1', blob);
    const loaded = await getPhotoBlob('photo-1');
    expect(loaded).toBeDefined();
    expect(loaded?.type).toBe('image/png');
    expect(loaded?.size).toBe(blob.size);
  });

  it('returns undefined for a photo that was never saved', async () => {
    expect(await getPhotoBlob('missing-photo')).toBeUndefined();
  });

  it('deletePhotoBlob removes the stored blob', async () => {
    await savePhotoBlob('photo-2', new Blob(['x']));
    await deletePhotoBlob('photo-2');
    expect(await getPhotoBlob('photo-2')).toBeUndefined();
  });
});
