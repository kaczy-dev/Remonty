/**
 * model-3d-exporter.ts
 * Eksport modeli 3D z Three.js do formatów:
 * - GLB (Binary glTF 2.0) - uniwersalny format do Blendera, SketchUp, CAD, Unity, Unreal oraz Google ARCore Scene Viewer
 * - USDZ (Universal Scene Description) - natywny format dla Apple AR Quick Look na urządzeniach iOS (iPhone / iPad)
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  sizeBytes: number;
}

/**
 * Wykrywa platformę użytkownika (iOS, Android, Desktop)
 */
export function detectDevicePlatform(): {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isIOS: false, isAndroid: false, isMobile: false };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet|Touch/.test(ua);

  return { isIOS, isAndroid, isMobile };
}

/**
 * Czyści nazwę pliku z niedozwolonych znaków
 */
export function sanitizeFilename(name: string, ext: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => {
      const map: Record<string, string> = {
        ą: 'a',
        ć: 'c',
        ę: 'e',
        ł: 'l',
        ń: 'n',
        ó: 'o',
        ś: 's',
        ź: 'z',
        ż: 'z',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${clean || 'pokoj_3d'}.${ext}`;
}

const createSafeObjectURL = (blob: Blob): string => {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(blob);
  }
  return '';
};

/**
 * Eksportuje obiekt Three.js do formatu GLB (Binary glTF)
 */
export async function exportToGLB(
  object: THREE.Object3D,
  customName = 'renowacja_pokoj'
): Promise<ExportResult> {
  const exporter = new GLTFExporter();
  const filename = sanitizeFilename(customName, 'glb');

  // Klonujemy obiekt lub przekazujemy czystą kopię geometryczną
  const output = await exporter.parseAsync(object, {
    binary: true,
    embedImages: true,
    onlyVisible: true,
  });

  const arrayBuffer = output as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  const url = createSafeObjectURL(blob);

  return {
    blob,
    url,
    filename,
    sizeBytes: blob.size,
  };
}

/**
 * Eksportuje obiekt Three.js do formatu USDZ (Apple AR Quick Look)
 */
export async function exportToUSDZ(
  object: THREE.Object3D,
  customName = 'renowacja_pokoj'
): Promise<ExportResult> {
  const exporter = new USDZExporter();
  const filename = sanitizeFilename(customName, 'usdz');

  const arrayBuffer = await exporter.parseAsync(object, {
    ar: {
      anchoring: { type: 'plane' },
      planeAnchoring: { alignment: 'horizontal' },
    },
  });

  const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
  const url = createSafeObjectURL(blob);

  return {
    blob,
    url,
    filename,
    sizeBytes: blob.size,
  };
}

/**
 * Wywołuje pobieranie pliku w przeglądarce
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = createSafeObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

/**
 * Uruchamia natywne Apple AR Quick Look na urządzeniach iOS Safari
 */
export function launchAppleARQuickLook(usdzBlob: Blob, filename = 'model.usdz'): void {
  const usdzUrl = createSafeObjectURL(usdzBlob);
  const link = document.createElement('a');
  link.setAttribute('rel', 'ar');
  link.setAttribute('href', usdzUrl);
  link.download = filename;

  // Wymóg iOS: link musi posiadać dziecko img
  const dummyImg = document.createElement('img');
  dummyImg.setAttribute('alt', 'Podgląd AR Quick Look');
  link.appendChild(dummyImg);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (usdzUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(usdzUrl), 15000);
  }
}

/**
 * Generuje link Google Scene Viewer dla urządzeń z systemem Android
 */
export function getAndroidSceneViewerUrl(
  publicGlbUrl: string,
  title = 'Wizualizacja Remontu'
): string {
  const encodedGlb = encodeURIComponent(publicGlbUrl);
  const encodedTitle = encodeURIComponent(title);
  return `intent://arvr.google.com/scene-viewer/1.0?file=${encodedGlb}&title=${encodedTitle}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end;`;
}
