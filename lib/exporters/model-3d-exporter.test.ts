import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  sanitizeFilename,
  detectDevicePlatform,
  getAndroidSceneViewerUrl,
  exportToGLB,
  exportToUSDZ,
  triggerFileDownload,
  launchAppleARQuickLook,
} from './model-3d-exporter';

vi.mock('three/examples/jsm/exporters/GLTFExporter.js', () => {
  return {
    GLTFExporter: class {
      parseAsync = vi.fn().mockResolvedValue(new ArrayBuffer(128));
    },
  };
});

vi.mock('three/examples/jsm/exporters/USDZExporter.js', () => {
  return {
    USDZExporter: class {
      parseAsync = vi.fn().mockResolvedValue(new ArrayBuffer(64));
    },
  };
});

describe('model-3d-exporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('sanitizeFilename', () => {
    it('cleans special characters, spaces and replaces Polish letters', () => {
      const result = sanitizeFilename('Pokój Żółty & Łazienka!', 'glb');
      expect(result).toBe('pokoj_zolty_lazienka.glb');
    });

    it('falls back to default name if string is empty', () => {
      const result = sanitizeFilename('   ', 'usdz');
      expect(result).toBe('pokoj_3d.usdz');
    });
  });

  describe('detectDevicePlatform', () => {
    it('detects desktop when userAgent is typical desktop browser', () => {
      const originalUa = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      const { isIOS, isAndroid, isMobile } = detectDevicePlatform();
      expect(isIOS).toBe(false);
      expect(isAndroid).toBe(false);
      expect(isMobile).toBe(false);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUa,
        configurable: true,
      });
    });

    it('detects iPhone when userAgent contains iPhone', () => {
      const originalUa = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        configurable: true,
      });

      const { isIOS, isAndroid, isMobile } = detectDevicePlatform();
      expect(isIOS).toBe(true);
      expect(isAndroid).toBe(false);
      expect(isMobile).toBe(true);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUa,
        configurable: true,
      });
    });

    it('detects Android when userAgent contains Android', () => {
      const originalUa = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        configurable: true,
      });

      const { isIOS, isAndroid, isMobile } = detectDevicePlatform();
      expect(isIOS).toBe(false);
      expect(isAndroid).toBe(true);
      expect(isMobile).toBe(true);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUa,
        configurable: true,
      });
    });
  });

  describe('getAndroidSceneViewerUrl', () => {
    it('builds a valid Google Scene Viewer intent URL', () => {
      const url = getAndroidSceneViewerUrl('https://example.com/room.glb', 'Salon 3D');
      expect(url).toContain('intent://arvr.google.com/scene-viewer/1.0');
      expect(url).toContain('file=https%3A%2F%2Fexample.com%2Froom.glb');
      expect(url).toContain('title=Salon%203D');
      expect(url).toContain('package=com.google.ar.core');
    });
  });

  describe('exportToGLB & exportToUSDZ', () => {
    it('exports a Three.js scene to GLB result with blob and url', async () => {
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      scene.add(mesh);

      const result = await exportToGLB(scene, 'Sypialnia');
      expect(result.filename).toBe('sypialnia.glb');
      expect(result.blob.type).toBe('model/gltf-binary');
      expect(result.sizeBytes).toBe(128);
      expect(result.url).toBeDefined();
    });

    it('exports a Three.js scene to USDZ result with blob and url', async () => {
      const scene = new THREE.Scene();
      const result = await exportToUSDZ(scene, 'Gabinet');
      expect(result.filename).toBe('gabinet.usdz');
      expect(result.blob.type).toBe('model/vnd.usdz+zip');
      expect(result.sizeBytes).toBe(64);
      expect(result.url).toBeDefined();
    });
  });

  describe('triggerFileDownload and launchAppleARQuickLook', () => {
    it('triggers file download by creating a temporary link element', () => {
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      const blob = new Blob(['test'], { type: 'text/plain' });
      triggerFileDownload(blob, 'test.txt');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('launches Apple AR QuickLook with rel=ar link and dummy img child', () => {
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      let createdLink: HTMLAnchorElement | null = null;

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          createdLink = el as HTMLAnchorElement;
          el.click = clickSpy;
        }
        return el;
      });

      const blob = new Blob(['usdz-data'], { type: 'model/vnd.usdz+zip' });
      launchAppleARQuickLook(blob, 'model.usdz');

      expect(clickSpy).toHaveBeenCalled();
      expect(createdLink).not.toBeNull();
      const anchor = createdLink as unknown as HTMLAnchorElement;
      expect(anchor.getAttribute('rel')).toBe('ar');
      expect(anchor.querySelector('img')).not.toBeNull();
    });
  });
});
