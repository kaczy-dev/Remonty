/**
 * Options for client-side image compression
 */
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  mimeType: 'image/webp',
};

/**
 * Calculates target width and height maintaining original aspect ratio.
 */
export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

/**
 * Compresses an image File or Blob in the browser using HTML5 Canvas.
 * - Scales down to max dimensions (default 1920x1080)
 * - Converts to WebP (default quality 0.85) to reduce 8MB+ phone photos to ~150-300KB
 * - Preserves aspect ratio
 * - Safe for offline PWA storage in IndexedDB
 */
export async function compressImage(
  fileOrBlob: Blob | File,
  options?: ImageCompressionOptions
): Promise<Blob> {
  const opts: Required<ImageCompressionOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // If running in environment without Image/Canvas (e.g. Node tests without mock canvas),
  // return the original blob safely.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fileOrBlob;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = calculateTargetDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        opts.maxWidth,
        opts.maxHeight
      );

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if canvas context is unavailable
        resolve(fileOrBlob);
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to original blob if conversion failed
            resolve(fileOrBlob);
          }
        },
        opts.mimeType,
        opts.quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${err}`));
    };

    img.src = objectUrl;
  });
}
