'use client';

import { useEffect, useState } from 'react';
import { getPhotoObjectUrl } from './photos';

export const LOCAL_PHOTO_PREFIX = 'idb:';

/**
 * Resolves a room photo reference to a displayable <img> src.
 * Plain URLs (remote seed photos) pass through unchanged; references saved via
 * `savePhotoBlob` (prefixed `idb:<id>`) are resolved from the IndexedDB Blob store.
 */
export function usePhotoSrc(photoUrl: string | undefined): string | undefined {
  const isLocalRef = !!photoUrl && photoUrl.startsWith(LOCAL_PHOTO_PREFIX);
  const [resolvedLocalSrc, setResolvedLocalSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isLocalRef || !photoUrl) return;

    let objectUrl: string | undefined;
    let cancelled = false;
    const photoId = photoUrl.slice(LOCAL_PHOTO_PREFIX.length);

    getPhotoObjectUrl(photoId).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setResolvedLocalSrc(url);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isLocalRef, photoUrl]);

  // Plain remote URLs pass through directly (no effect needed); local `idb:` references
  // resolve asynchronously above.
  return isLocalRef ? resolvedLocalSrc : photoUrl;
}
