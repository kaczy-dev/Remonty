'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Room, RoomFurniture, RoomOutlet } from '@/types/renovation';
import { 
  createWoodTexture, 
  createTileTexture, 
  createMicrocementTexture, 
  createBrickTexture,
  createMarbleTexture,
  createTerrazzoTexture,
  createWoodSlatsTexture,
  createConcretePanelsTexture,
  createSubwayTileTexture,
  createStuccoTexture,
  kelvinToHex
} from '@/lib/procedural-textures';
import { create3DFurnitureMesh } from '@/lib/furniture3d-builder';
import { 
  Sun, 
  Moon, 
  Sunset, 
  Camera, 
  RotateCw, 
  RotateCcw,
  Maximize2, 
  Layers, 
  Eye, 
  Sliders, 
  Check, 
  Sparkles,
  Palette,
  Lightbulb,
  Maximize,
  Compass,
  Move,
  Trash2,
  X,
  Armchair,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  Footprints,
  UploadCloud,
  SlidersHorizontal,
  Image as ImageIcon,
  SplitSquareVertical,
  Wrench,
  Paintbrush,
  Box,
  Crosshair,
  Grid,
  SunMedium,
  Calculator,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { usePhotoSrc, LOCAL_PHOTO_PREFIX, savePhotoBlob } from '@/lib/db';
import { compressImage } from '@/lib/image-compressor';
import { Export3DModal } from '@/components/Export3DModal';

interface Room3DViewerProps {
  room: Room;
  onUpdateRoomDesign?: (roomId: string, design: Room['design']) => void;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onDeleteFurniture?: (roomId: string, furnitureId: string) => void;
  className?: string;
  onOpenShowcase?: () => void;
  onOpenWalkthrough?: () => void;
  onUpdateRoomPhoto?: (photoUrl: string) => void;
}

/**
 * Deep recursive disposal of Three.js objects, geometries, materials, and canvas textures
 * to prevent GPU VRAM leaks during iterative interior remodeling and texture changes.
 */
function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (!mat) return;
        // Dispose textures mapped to material
        const matRecord = mat as unknown as Record<string, unknown>;
        Object.keys(matRecord).forEach((key) => {
          const prop = matRecord[key];
          if (prop && typeof (prop as { dispose?: unknown }).dispose === 'function') {
            (prop as { dispose: () => void }).dispose();
          }
        });
        mat.dispose();
      });
    }
  });
}

type LightingPreset = 'day' | 'sunset' | 'night';
type CameraViewPreset = 'isometric' | 'eye_level' | 'top_down' | 'corner';
export type RemodelPhotoViewMode = '3d_mesh' | 'photo_overlay' | 'photo_wall' | 'split_compare';

const FLOOR_PRESETS = [
  {
    id: 'herringbone_oak',
    name: 'Dąb Jodełka',
    desc: 'Parkiet dębowy jodełka francuska',
    floorType: 'Parkiet Dębowy Jodełka Francuska',
    floorTexture: 'herringbone' as const,
    floorColor: '#b48256',
    floorRoughness: 0.32,
    previewColor: '#b48256',
  },
  {
    id: 'plank_oak',
    name: 'Dąb Deska',
    desc: 'Deska warstwowa dąb bielony',
    floorType: 'Deska Warstwowa Dąb Bielony',
    floorTexture: 'plank' as const,
    floorColor: '#c59b6d',
    floorRoughness: 0.35,
    previewColor: '#c59b6d',
  },
  {
    id: 'marble_carrara',
    name: 'Marmur Carrara',
    desc: 'Gres wielkoformatowy 60x120',
    floorType: 'Gres Wielkoformatowy Marmur Carrara',
    floorTexture: 'marble' as const,
    floorColor: '#f8fafc',
    floorRoughness: 0.15,
    previewColor: '#f8fafc',
  },
  {
    id: 'microcement_loft',
    name: 'Mikrocement',
    desc: 'Posadzka bezspoinowa loft',
    floorType: 'Mikrocement Szary Satynowy',
    floorTexture: 'microcement' as const,
    floorColor: '#94a3b8',
    floorRoughness: 0.45,
    previewColor: '#94a3b8',
  },
  {
    id: 'terrazzo_modern',
    name: 'Terrazzo Lastryko',
    desc: 'Płytki terrazzo lastryko',
    floorType: 'Płytki Terrazzo Lastryko',
    floorTexture: 'terrazzo' as const,
    floorColor: '#e2e8f0',
    floorRoughness: 0.30,
    previewColor: '#cbd5e1',
  },
  {
    id: 'tiles_graphite',
    name: 'Gres Ciemny',
    desc: 'Płyty gresowe grafit mat',
    floorType: 'Płyty Gresowe Grafit Mat',
    floorTexture: 'tiles' as const,
    floorColor: '#334155',
    floorRoughness: 0.25,
    previewColor: '#334155',
  },
];

const WALL_PRESETS = [
  {
    id: 'white_clean',
    name: 'Świeża Biel',
    desc: 'Farba ceramiczna śnieżnobiała',
    wallType: 'Farba Ceramiczna Śnieżnobiała',
    wallTexture: 'matte' as const,
    wallColor: '#f8fafc',
    wallRoughness: 0.85,
    previewColor: '#f8fafc',
  },
  {
    id: 'cashmere_warm',
    name: 'Ciepły Kaszmir',
    desc: 'Farba lateksowa ciepły kaszmir',
    wallType: 'Farba Lateksowa Ciepły Kaszmir',
    wallTexture: 'matte' as const,
    wallColor: '#e7e0d3',
    wallRoughness: 0.85,
    previewColor: '#e7e0d3',
  },
  {
    id: 'wood_slats',
    name: 'Lamele Dębowe',
    desc: 'Panele ścienne lamele akustyczne',
    wallType: 'Panele Ścienne Lamele Dębowe',
    wallTexture: 'slats' as const,
    wallColor: '#a16207',
    wallRoughness: 0.65,
    previewColor: '#a16207',
  },
  {
    id: 'concrete_panels',
    name: 'Beton Loftowy',
    desc: 'Płyty z betonu architektonicznego',
    wallType: 'Płyty z Betonu Architektonicznego',
    wallTexture: 'concrete_panels' as const,
    wallColor: '#64748b',
    wallRoughness: 0.70,
    previewColor: '#64748b',
  },
  {
    id: 'brick_white',
    name: 'Biała Cegła',
    desc: 'Stara cegła bielona',
    wallType: 'Stara Cegła Bielona',
    wallTexture: 'brick' as const,
    wallColor: '#f1f5f9',
    wallRoughness: 0.75,
    previewColor: '#e2e8f0',
  },
  {
    id: 'sage_green',
    name: 'Szałwiowa Zieleń',
    desc: 'Tynk dekoracyjny szałwia mat',
    wallType: 'Tynk Dekoracyjny Szałwia Mat',
    wallTexture: 'stucco' as const,
    wallColor: '#788c7a',
    wallRoughness: 0.85,
    previewColor: '#788c7a',
  },
  {
    id: 'graphite_loft',
    name: 'Antracyt Loft',
    desc: 'Farba magnetyczna grafit mat',
    wallType: 'Farba Magnetyczno-Tablicowa Grafit',
    wallTexture: 'matte' as const,
    wallColor: '#1e293b',
    wallRoughness: 0.85,
    previewColor: '#1e293b',
  },
];

const QUICK_FURNITURE_ITEMS = [
  { id: 'sofa', name: 'Sofa 3-osobowa', iconType: 'sofa', model3DUrl: 'sofa', color: '#384252', width: 32, height: 22 },
  { id: 'table', name: 'Stół Dębowy', iconType: 'table', model3DUrl: 'table', color: '#854d0e', width: 26, height: 18 },
  { id: 'coffee_table', name: 'Stolik Kawowy', iconType: 'coffee_table', model3DUrl: 'coffee_table', color: '#f1f5f9', width: 16, height: 16 },
  { id: 'tv_cabinet', name: 'Szafka RTV + TV', iconType: 'tv_cabinet', model3DUrl: 'tv_cabinet', color: '#1e293b', width: 30, height: 14 },
  { id: 'bed', name: 'Łóżko Kontynentalne', iconType: 'bed', model3DUrl: 'bed', color: '#f8fafc', width: 28, height: 32 },
  { id: 'wardrobe', name: 'Szafa Garderobiana', iconType: 'wardrobe', model3DUrl: 'wardrobe', color: '#78350f', width: 24, height: 16 },
  { id: 'plant', name: 'Monstera w Donicy', iconType: 'plant', model3DUrl: 'plant', color: '#ffffff', width: 12, height: 12 },
  { id: 'chair', name: 'Fotel Wypoczynkowy', iconType: 'chair', model3DUrl: 'chair', color: '#0f766e', width: 16, height: 16 },
];

export const Room3DViewer: React.FC<Room3DViewerProps> = ({
  room,
  onUpdateRoomDesign,
  onUpdateFurniture,
  onDeleteFurniture,
  className = '',
  onOpenShowcase,
  onOpenWalkthrough,
  onUpdateRoomPhoto,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const selectionGroupRef = useRef<THREE.Group | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Keep fresh props in refs for event listeners and animation loop
  const roomRef = useRef(room);
  const onUpdateFurnitureRef = useRef(onUpdateFurniture);

  useEffect(() => {
    roomRef.current = room;
    onUpdateFurnitureRef.current = onUpdateFurniture;
  }, [room, onUpdateFurniture]);

  // Photo & Remodel Mode state
  const [photoDisplayMode, setPhotoDisplayMode] = useState<RemodelPhotoViewMode>(
    room.photoUrl ? 'photo_overlay' : '3d_mesh'
  );
  const photoDisplayModeRef = useRef<RemodelPhotoViewMode>(photoDisplayMode);
  useEffect(() => {
    photoDisplayModeRef.current = photoDisplayMode;
  }, [photoDisplayMode]);

  const [photoBlendOpacity, setPhotoBlendOpacity] = useState<number>(
    room.design.photoBlendOpacity !== undefined ? room.design.photoBlendOpacity : 75
  );
  const [splitSliderPos, setSplitSliderPos] = useState<number>(50);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [showQuickRemodel, setShowQuickRemodel] = useState(false);
  const [quickRemodelTab, setQuickRemodelTab] = useState<'floors' | 'walls' | 'furniture' | 'light'>('floors');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Perspective Calibration & Camera Match state
  const [showPerspectiveMatch, setShowPerspectiveMatch] = useState<boolean>(false);
  const [showVanishingGrid, setShowVanishingGrid] = useState<boolean>(false);
  const [hasSavedPerspective, setHasSavedPerspective] = useState<boolean>(false);

  const [cameraFov, setCameraFov] = useState<number>(
    room.design.perspectiveFov !== undefined ? room.design.perspectiveFov : 60
  );
  const [cameraHeightVal, setCameraHeightVal] = useState<number>(
    room.design.perspectiveHeight !== undefined ? room.design.perspectiveHeight : 1.55
  );
  const [cameraPitchVal, setCameraPitchVal] = useState<number>(
    room.design.perspectivePitch !== undefined ? room.design.perspectivePitch : -12
  );
  const [cameraYawVal, setCameraYawVal] = useState<number>(
    room.design.perspectiveYaw !== undefined ? room.design.perspectiveYaw : 0
  );
  const [cameraDistVal, setCameraDistVal] = useState<number>(
    () => (room.design.perspectiveDist !== undefined ? room.design.perspectiveDist : Math.max(room.width, room.length) * 1.15)
  );

  // AR Overlay Mode: 'full_floor' (nowa posadzka) vs 'furniture_shadows_only' (oryginalna podłoga ze zdjęcia + cienie mebli)
  const [overlayFloorMode, setOverlayFloorMode] = useState<'full_floor' | 'furniture_shadows_only'>(
    room.design.overlayFloorMode || 'full_floor'
  );

  // Sun Light Direction to match real room windows
  const [windowLightDirection, setWindowLightDirection] = useState<'left' | 'center' | 'right' | 'front'>(
    room.design.windowLightDirection || 'right'
  );

  // Floor BOM / Cost Estimate HUD
  const [showFloorBomHud, setShowFloorBomHud] = useState<boolean>(false);

  // Custom Material Photo Swatches (tiles/laminates/wallpaper photo sample from store)
  const floorSwatchInputRef = useRef<HTMLInputElement>(null);
  const wallSwatchInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSwatch, setIsUploadingSwatch] = useState(false);

  const customFloorPhotoSrc = usePhotoSrc(room.design.customFloorPhotoUrl);
  const customWallPhotoSrc = usePhotoSrc(room.design.customWallPhotoUrl);

  const handleFloorSwatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateRoomDesign) return;
    try {
      setIsUploadingSwatch(true);
      const compressed = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      const photoId = `swatch-floor-${room.id}-${Date.now()}`;
      await savePhotoBlob(photoId, compressed);
      onUpdateRoomDesign(room.id, {
        ...room.design,
        customFloorPhotoUrl: `${LOCAL_PHOTO_PREFIX}${photoId}`,
        floorType: 'Własny próbnik ze sklepu',
      });
    } catch (err) {
      console.error('Błąd wgrywania próbnika podłogi:', err);
    } finally {
      setIsUploadingSwatch(false);
      if (floorSwatchInputRef.current) floorSwatchInputRef.current.value = '';
    }
  };

  const handleWallSwatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateRoomDesign) return;
    try {
      setIsUploadingSwatch(true);
      const compressed = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      const photoId = `swatch-wall-${room.id}-${Date.now()}`;
      await savePhotoBlob(photoId, compressed);
      onUpdateRoomDesign(room.id, {
        ...room.design,
        customWallPhotoUrl: `${LOCAL_PHOTO_PREFIX}${photoId}`,
        wallType: 'Własny próbnik ze sklepu',
      });
    } catch (err) {
      console.error('Błąd wgrywania próbnika ściany:', err);
    } finally {
      setIsUploadingSwatch(false);
      if (wallSwatchInputRef.current) wallSwatchInputRef.current.value = '';
    }
  };

  const resolvedPhotoSrc = usePhotoSrc(room.photoUrl);

  // Photo Upload Handler with Client-Side WebP Compression & IndexedDB Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingPhoto(true);
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
      });
      const photoId = `${room.id}-${Date.now()}`;
      await savePhotoBlob(photoId, compressed);
      const newPhotoUrl = `${LOCAL_PHOTO_PREFIX}${photoId}`;
      onUpdateRoomPhoto?.(newPhotoUrl);
      if (photoDisplayMode === '3d_mesh') {
        setPhotoDisplayMode('photo_overlay');
      }
    } catch (err) {
      console.error('Błąd podczas zapisywania zdjęcia pokoju:', err);
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Split Comparison Slider Drag handler (Mouse & Touch)
  const handleSplitDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSplitSliderPos(Math.round(pct));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };

  // Quick Remodel Action Handlers
  const handleSelectFloorPreset = (preset: typeof FLOOR_PRESETS[number]) => {
    if (!onUpdateRoomDesign) return;
    onUpdateRoomDesign(room.id, {
      ...room.design,
      floorType: preset.floorType,
      floorTexture: preset.floorTexture,
      floorColor: preset.floorColor,
      floorRoughness: preset.floorRoughness,
    });
  };

  const handleSelectWallPreset = (preset: typeof WALL_PRESETS[number]) => {
    if (!onUpdateRoomDesign) return;
    onUpdateRoomDesign(room.id, {
      ...room.design,
      wallType: preset.wallType,
      wallTexture: preset.wallTexture,
      wallColor: preset.wallColor,
      wallRoughness: preset.wallRoughness,
    });
  };

  const handleSelectLightTemp = (tempK: number) => {
    if (!onUpdateRoomDesign) return;
    onUpdateRoomDesign(room.id, {
      ...room.design,
      lightingTempK: tempK,
    });
  };

  // Camera Perspective Calibration & Match functions
  const applyCameraPerspective = useCallback((
    fov: number,
    height: number,
    pitchDeg: number,
    yawDeg: number,
    distM?: number
  ) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    camera.fov = fov;
    camera.updateProjectionMatrix();

    const distance = distM !== undefined ? distM : Math.max(room.width, room.length) * 1.15;
    const radYaw = THREE.MathUtils.degToRad(yawDeg);
    const radPitch = THREE.MathUtils.degToRad(pitchDeg);

    const posX = Math.sin(radYaw) * distance;
    const posZ = Math.cos(radYaw) * distance;
    const posY = Math.max(0.35, height);

    const targetX = 0;
    const targetY = Math.max(0.05, posY + Math.tan(radPitch) * (distance * 0.7));
    const targetZ = 0;

    camera.position.set(posX, posY, posZ);
    controls.target.set(targetX, targetY, targetZ);
    controls.update();
  }, [room.width, room.length]);

  const handleApplyPerspectivePreset = (preset: 'eye_standing' | 'sitting_couch' | 'wide_corner' | 'front_door') => {
    let fov = 60;
    let height = 1.55;
    let pitch = -12;
    let yaw = 0;
    let dist = Math.max(room.width, room.length) * 1.15;

    if (preset === 'eye_standing') {
      fov = 65;
      height = 1.55;
      pitch = -12;
      yaw = 0;
      dist = Math.max(room.width, room.length) * 1.1;
    } else if (preset === 'sitting_couch') {
      fov = 60;
      height = 1.10;
      pitch = -8;
      yaw = 15;
      dist = Math.max(room.width, room.length) * 0.95;
    } else if (preset === 'wide_corner') {
      fov = 82;
      height = 1.50;
      pitch = -15;
      yaw = 42;
      dist = Math.max(room.width, room.length) * 1.25;
    } else if (preset === 'front_door') {
      fov = 68;
      height = 1.60;
      pitch = -10;
      yaw = 0;
      dist = Math.max(room.width, room.length) * 1.3;
    }

    setCameraFov(fov);
    setCameraHeightVal(height);
    setCameraPitchVal(pitch);
    setCameraYawVal(yaw);
    setCameraDistVal(dist);
    applyCameraPerspective(fov, height, pitch, yaw, dist);
  };

  const handleSavePerspective = () => {
    if (!onUpdateRoomDesign) return;
    onUpdateRoomDesign(room.id, {
      ...room.design,
      perspectiveFov: cameraFov,
      perspectiveHeight: cameraHeightVal,
      perspectivePitch: cameraPitchVal,
      perspectiveYaw: cameraYawVal,
      perspectiveDist: cameraDistVal,
      overlayFloorMode,
      windowLightDirection,
      photoBlendOpacity,
    });
    setHasSavedPerspective(true);
    setTimeout(() => setHasSavedPerspective(false), 2500);
  };

  const handleSwitchPhotoDisplayMode = (mode: RemodelPhotoViewMode) => {
    setPhotoDisplayMode(mode);
    if (mode === 'photo_overlay' || mode === 'split_compare') {
      applyCameraPerspective(cameraFov, cameraHeightVal, cameraPitchVal, cameraYawVal, cameraDistVal);
    }
  };

  // Smooth camera transition ref
  const cameraTransitionRef = useRef<{
    targetPos: THREE.Vector3;
    targetTarget: THREE.Vector3;
    active: boolean;
  } | null>(null);

  // Dragging / Selection state refs
  const isPointerDownRef = useRef(false);
  const isDraggingFurnitureRef = useRef(false);
  const dragFurnitureIdRef = useRef<string | null>(null);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Viewer state
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('day');
  const [showCeiling, setShowCeiling] = useState(false);
  const [cutawayWalls, setCutawayWalls] = useState(true);
  const [showDimensions3D, setShowDimensions3D] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [enableBloom, setEnableBloom] = useState(true);
  const enableBloomRef = useRef(enableBloom);
  useEffect(() => {
    enableBloomRef.current = enableBloom;
  }, [enableBloom]);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  }, [autoRotate]);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraViewPreset>('isometric');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  // Collision & Clearance state
  const [dragCollisionState, setDragCollisionState] = useState<{
    hasCollision: boolean;
    isTightClearance: boolean;
    message: string;
    clearanceM: number;
  } | null>(null);

  // Active selected furniture item
  const selectedFurnitureItem = room.furniture?.find((f) => f.id === selectedFurnitureId) || null;

  const handleQuickAddFurniture = useCallback((preset: typeof QUICK_FURNITURE_ITEMS[number]) => {
    if (!onUpdateFurniture) return;
    const existingCount = room.furniture?.length || 0;
    const offsetX = (existingCount % 3) * 6;
    const offsetY = (Math.floor(existingCount / 3) % 3) * 6;
    const newFurn: RoomFurniture = {
      id: `furn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name,
      x: Math.min(80, Math.max(20, 50 + offsetX)),
      y: Math.min(80, Math.max(20, 50 + offsetY)),
      width: preset.width,
      height: preset.height,
      rotation: 0,
      iconType: preset.iconType,
      model3DUrl: preset.model3DUrl,
      color: preset.color,
    };
    const updated = [...(room.furniture || []), newFurn];
    onUpdateFurniture(room.id, updated);
    setSelectedFurnitureId(newFurn.id);
  }, [room.furniture, room.id, onUpdateFurniture]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.035);
    sceneRef.current = scene;

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    const initialDist = Math.max(roomRef.current.width, roomRef.current.length) * 1.5;
    camera.position.set(initialDist, roomRef.current.height * 1.6, initialDist);
    cameraRef.current = camera;

    // 3. Renderer with PBR Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3b. EffectComposer for Architectural Bloom & Emissive Glow
    let composer: EffectComposer | null = null;
    try {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth || 800, container.clientHeight || 600),
        0.42, // strength
        0.38, // radius
        0.82  // threshold
      );
      composer.addPass(bloomPass);
      composerRef.current = composer;
    } catch (e) {
      console.warn('EffectComposer Bloom initialization fallback:', e);
    }

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 1.0;
    controls.target.set(0, roomRef.current.height * 0.45, 0);
    controlsRef.current = controls;

    if (photoDisplayModeRef.current === 'photo_overlay' || photoDisplayModeRef.current === 'split_compare') {
      const fov = roomRef.current.design.perspectiveFov ?? 60;
      const h = roomRef.current.design.perspectiveHeight ?? 1.55;
      const pitch = roomRef.current.design.perspectivePitch ?? -12;
      const yaw = roomRef.current.design.perspectiveYaw ?? 0;
      const dist = roomRef.current.design.perspectiveDist ?? Math.max(roomRef.current.width, roomRef.current.length) * 1.15;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      const radYaw = THREE.MathUtils.degToRad(yaw);
      const radPitch = THREE.MathUtils.degToRad(pitch);
      camera.position.set(Math.sin(radYaw) * dist, Math.max(0.35, h), Math.cos(radYaw) * dist);
      controls.target.set(0, Math.max(0.05, h + Math.tan(radPitch) * (dist * 0.7)), 0);
      controls.update();
    }

    // 5. Lights Container
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 6. Room Container
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;

    // 6b. Selection Highlights Container
    const selectionGroup = new THREE.Group();
    scene.add(selectionGroup);
    selectionGroupRef.current = selectionGroup;

    // 7. Ground Grid / Studio Pedestal
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#060910',
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    const gridHelper = new THREE.GridHelper(24, 24, '#1e293b', '#0f172a');
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 8. Pointer Event Listeners for 3D Furniture Click & Floor Drag
    const domElement = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
      isPointerDownRef.current = true;
      isDraggingFurnitureRef.current = false;

      if (!cameraRef.current || !roomGroupRef.current) return;
      raycaster.current.setFromCamera(mouse.current, cameraRef.current);
      const intersects = raycaster.current.intersectObjects(roomGroupRef.current.children, true);

      let hitFurnId: string | null = null;
      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== roomGroupRef.current) {
          if (curr.userData?.furnitureId) {
            hitFurnId = curr.userData.furnitureId;
            break;
          }
          curr = curr.parent;
        }
        if (hitFurnId) break;
      }

      dragFurnitureIdRef.current = hitFurnId;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      const dx = e.clientX - pointerStartPos.current.x;
      const dy = e.clientY - pointerStartPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dragFurnitureIdRef.current && dist > 6) {
        if (!isDraggingFurnitureRef.current) {
          isDraggingFurnitureRef.current = true;
          setIsDraggingActive(true);
          if (controlsRef.current) controlsRef.current.enabled = false;
          setSelectedFurnitureId(dragFurnitureIdRef.current);
        }

        const rect = domElement.getBoundingClientRect();
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (cameraRef.current && roomGroupRef.current) {
          raycaster.current.setFromCamera(mouse.current, cameraRef.current);
          const hitPoint = new THREE.Vector3();
          if (raycaster.current.ray.intersectPlane(dragPlane.current, hitPoint)) {
            const curRoom = roomRef.current;
            const halfW = curRoom.width / 2;
            const halfL = curRoom.length / 2;
            const pctX = Math.max(5, Math.min(95, ((hitPoint.x + halfW) / curRoom.width) * 100));
            const pctY = Math.max(5, Math.min(95, ((hitPoint.z + halfL) / curRoom.length) * 100));

            const furnObj = roomGroupRef.current.getObjectByName(`furniture-${dragFurnitureIdRef.current}`);
            if (furnObj) {
              furnObj.position.x = -halfW + (pctX / 100) * curRoom.width;
              furnObj.position.z = -halfL + (pctY / 100) * curRoom.length;
            }

            // Real-time clearance & collision calculation
            const curFurnX = -halfW + (pctX / 100) * curRoom.width;
            const curFurnZ = -halfL + (pctY / 100) * curRoom.length;

            const distToWest = Math.abs(curFurnX - (-halfW));
            const distToEast = Math.abs(curFurnX - halfW);
            const distToNorth = Math.abs(curFurnZ - (-halfL));
            const distToSouth = Math.abs(curFurnZ - halfL);
            const minWallDist = Math.min(distToWest, distToEast, distToNorth, distToSouth);

            let nearestFurnDist = Infinity;
            let collided = false;
            let collidedItemName = '';

            (curRoom.furniture || []).forEach((other) => {
              if (other.id === dragFurnitureIdRef.current) return;
              const otherX = -halfW + (other.x / 100) * curRoom.width;
              const otherZ = -halfL + (other.y / 100) * curRoom.length;
              const d = Math.hypot(curFurnX - otherX, curFurnZ - otherZ);
              if (d < nearestFurnDist) nearestFurnDist = d;
              if (d < 0.75) {
                collided = true;
                collidedItemName = other.name;
              }
            });

            if (minWallDist < 0.28) {
              collided = true;
              collidedItemName = 'Ściana';
            }

            const clearance = Math.min(minWallDist, nearestFurnDist);
            const isTight = clearance < 0.6;

            if (collided) {
              setDragCollisionState({
                hasCollision: true,
                isTightClearance: false,
                message: `KOLIZJA z: ${collidedItemName} (wymagany odstęp)`,
                clearanceM: Math.round(clearance * 100) / 100,
              });
            } else if (isTight) {
              setDragCollisionState({
                hasCollision: false,
                isTightClearance: true,
                message: `Wąskie przejście: ${Math.round(clearance * 100)} cm (norma min. 60 cm)`,
                clearanceM: Math.round(clearance * 100) / 100,
              });
            } else {
              setDragCollisionState({
                hasCollision: false,
                isTightClearance: false,
                message: `Bezpieczny ciąg komunikacyjny (${clearance.toFixed(2)} m)`,
                clearanceM: Math.round(clearance * 100) / 100,
              });
            }

            // Update Selection Ring Position & Color dynamically
            if (selectionGroupRef.current && selectionGroupRef.current.children.length > 0) {
              const ring = selectionGroupRef.current.children[0] as THREE.Mesh;
              if (ring && furnObj) {
                ring.position.x = furnObj.position.x;
                ring.position.z = furnObj.position.z;
                const mat = ring.material as THREE.MeshBasicMaterial;
                if (mat) {
                  if (collided) {
                    mat.color.set('#ef4444');
                  } else if (isTight) {
                    mat.color.set('#f59e0b');
                  } else {
                    mat.color.set('#14b8a6');
                  }
                }
              }
            }
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (controlsRef.current) controlsRef.current.enabled = true;
      setIsDraggingActive(false);
      setDragCollisionState(null);

      if (isDraggingFurnitureRef.current && dragFurnitureIdRef.current) {
        const rect = domElement.getBoundingClientRect();
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (cameraRef.current) {
          raycaster.current.setFromCamera(mouse.current, cameraRef.current);
          const hitPoint = new THREE.Vector3();
          if (raycaster.current.ray.intersectPlane(dragPlane.current, hitPoint)) {
            const curRoom = roomRef.current;
            const halfW = curRoom.width / 2;
            const halfL = curRoom.length / 2;
            const pctX = Math.max(5, Math.min(95, ((hitPoint.x + halfW) / curRoom.width) * 100));
            const pctY = Math.max(5, Math.min(95, ((hitPoint.z + halfL) / curRoom.length) * 100));

            if (curRoom.furniture && onUpdateFurnitureRef.current) {
              const updated = curRoom.furniture.map((f) => {
                if (f.id !== dragFurnitureIdRef.current) return f;
                return {
                  ...f,
                  x: Math.round(pctX * 10) / 10,
                  y: Math.round(pctY * 10) / 10,
                };
              });
              onUpdateFurnitureRef.current(curRoom.id, updated);
            }
          }
        }
      } else if (isPointerDownRef.current) {
        if (dragFurnitureIdRef.current) {
          setSelectedFurnitureId(dragFurnitureIdRef.current);
        } else {
          setSelectedFurnitureId(null);
        }
      }

      isPointerDownRef.current = false;
      isDraggingFurnitureRef.current = false;
      dragFurnitureIdRef.current = null;
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 9. Animation Loop with Camera Glide Lerp & Optional Bloom
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      if (cameraTransitionRef.current?.active && controlsRef.current && cameraRef.current) {
        const { targetPos, targetTarget } = cameraTransitionRef.current;
        cameraRef.current.position.lerp(targetPos, 0.08);
        controlsRef.current.target.lerp(targetTarget, 0.08);
        if (
          cameraRef.current.position.distanceTo(targetPos) < 0.04 &&
          controlsRef.current.target.distanceTo(targetTarget) < 0.04
        ) {
          cameraRef.current.position.copy(targetPos);
          controlsRef.current.target.copy(targetTarget);
          cameraTransitionRef.current.active = false;
        }
      }

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        if (autoRotateRef.current) {
          controlsRef.current.autoRotateSpeed = 1.2;
        }
      }
      controls.update();

      if (enableBloomRef.current && composerRef.current && photoDisplayModeRef.current !== 'photo_overlay') {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    // 10. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
          if (composerRef.current) {
            composerRef.current.setSize(w, h);
          }
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      composerRef.current?.dispose();
      groundRef.current?.geometry.dispose();
      gridHelperRef.current?.geometry.dispose();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Effect to switch Three.js scene background/clearColor and ground visibility based on photoDisplayMode
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    if (photoDisplayMode === 'photo_overlay') {
      scene.background = null;
      scene.fog = null;
      renderer.setClearColor(0x000000, 0);
      if (groundRef.current) groundRef.current.visible = false;
      if (gridHelperRef.current) gridHelperRef.current.visible = false;
    } else {
      scene.background = new THREE.Color('#090d16');
      scene.fog = new THREE.FogExp2('#090d16', 0.035);
      renderer.setClearColor(0x090d16, 1);
      if (groundRef.current) groundRef.current.visible = true;
      if (gridHelperRef.current) gridHelperRef.current.visible = true;
    }
  }, [photoDisplayMode]);

  const roomW = room.width;
  const roomL = room.length;
  const roomH = room.height;
  const lightingTempK = room.design.lightingTempK || 4000;

  // Update Lighting according to preset and room.design.lightingTempK
  useEffect(() => {
    const lightsGroup = lightsGroupRef.current;
    if (!lightsGroup) return;

    // Clear old lights
    while (lightsGroup.children.length > 0) {
      lightsGroup.remove(lightsGroup.children[0]);
    }

    const w = roomW;
    const l = roomL;
    const h = roomH;
    const lightColorHex = kelvinToHex(lightingTempK);

    // Calculate sun position based on real room window direction
    let sunX = w * 1.8;
    let sunZ = l * 1.2;
    if (windowLightDirection === 'left') {
      sunX = -w * 2.2;
      sunZ = l * 0.4;
    } else if (windowLightDirection === 'right') {
      sunX = w * 2.2;
      sunZ = l * 0.4;
    } else if (windowLightDirection === 'center') {
      sunX = 0;
      sunZ = -l * 2.2;
    } else if (windowLightDirection === 'front') {
      sunX = 0;
      sunZ = l * 2.2;
    }

    if (lightingPreset === 'day') {
      // Natural Daylight
      const ambientLight = new THREE.AmbientLight('#dbeafe', 0.65);
      lightsGroup.add(ambientLight);

      // Sun Directional Light through window
      const sun = new THREE.DirectionalLight('#fffbeb', 1.85);
      sun.position.set(sunX, h * 1.85, sunZ);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 40;
      sun.shadow.camera.left = -Math.max(w, l) * 2;
      sun.shadow.camera.right = Math.max(w, l) * 2;
      sun.shadow.camera.top = h * 2.5;
      sun.shadow.camera.bottom = -1;
      sun.shadow.bias = -0.0005;
      sun.shadow.radius = 2.5;
      lightsGroup.add(sun);

      // Soft interior bounce fill
      const bounceLight = new THREE.HemisphereLight('#f8fafc', '#1e293b', 0.5);
      lightsGroup.add(bounceLight);

    } else if (lightingPreset === 'sunset') {
      // Golden Hour Sunset
      const ambientLight = new THREE.AmbientLight('#fdba74', 0.4);
      lightsGroup.add(ambientLight);

      const sunsetSun = new THREE.DirectionalLight('#fb923c', 2.2);
      sunsetSun.position.set(sunX * 1.1, h * 0.85, sunZ * 1.1);
      sunsetSun.castShadow = true;
      sunsetSun.shadow.mapSize.width = 2048;
      sunsetSun.shadow.mapSize.height = 2048;
      sunsetSun.shadow.radius = 4.0;
      lightsGroup.add(sunsetSun);

      // Warm interior pendant assist
      const ceilingSpot = new THREE.PointLight(lightColorHex, 1.2, 10);
      ceilingSpot.position.set(0, h * 0.85, 0);
      ceilingSpot.castShadow = true;
      lightsGroup.add(ceilingSpot);

    } else {
      // Night Architectural Lighting
      const nightAmbient = new THREE.AmbientLight('#0f172a', 0.25);
      lightsGroup.add(nightAmbient);

      // Main ceiling fixtures based on Kelvin
      const ceilingLight = new THREE.PointLight(lightColorHex, 2.4, 14);
      ceilingLight.position.set(0, h * 0.88, 0);
      ceilingLight.castShadow = true;
      ceilingLight.shadow.mapSize.width = 2048;
      ceilingLight.shadow.mapSize.height = 2048;
      ceilingLight.shadow.radius = 3.0;
      lightsGroup.add(ceilingLight);

      // Accent LED strip cove light (recessed perimeter)
      const ledCove = new THREE.RectAreaLight(lightColorHex, 2.5, w * 0.9, 0.2);
      ledCove.position.set(0, h * 0.96, -l * 0.45);
      ledCove.rotation.x = Math.PI / 2;
      lightsGroup.add(ledCove);

      // Floor lamp warm glow
      const floorLamp = new THREE.PointLight('#fde047', 0.9, 5);
      floorLamp.position.set(-w * 0.38, 1.2, -l * 0.35);
      lightsGroup.add(floorLamp);
    }
  }, [lightingPreset, roomW, roomL, roomH, lightingTempK, windowLightDirection]);

  // Rebuild 3D Room Geometry & Furnishings
  useEffect(() => {
    const roomGroup = roomGroupRef.current;
    if (!roomGroup) return;

    // Clean previous room geometry, materials and procedural canvas textures
    while (roomGroup.children.length > 0) {
      const child = roomGroup.children[0];
      disposeHierarchy(child);
      roomGroup.remove(child);
    }

    const { width: W, length: L, height: H } = room;
    const halfW = W / 2;
    const halfL = L / 2;

    // --- 1. FLOOR ---
    let floorTexture: THREE.Texture;
    const floorTypeStr = (room.design.floorType || '').toLowerCase();
    const explicitFloorTexture = room.design.floorTexture;
    const floorColor = room.design.floorColor || '#b48256';
    const floorRoughness = room.design.floorRoughness !== undefined ? room.design.floorRoughness : 0.32;

    if (customFloorPhotoSrc) {
      const loader = new THREE.TextureLoader();
      const loadedTex = loader.load(customFloorPhotoSrc);
      loadedTex.wrapS = THREE.RepeatWrapping;
      loadedTex.wrapT = THREE.RepeatWrapping;
      loadedTex.repeat.set(Math.max(1, W / 0.8), Math.max(1, L / 0.8));
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      floorTexture = loadedTex;
    } else if (explicitFloorTexture === 'herringbone' || (!explicitFloorTexture && (floorTypeStr.includes('jodeł') || floorTypeStr.includes('dąb') || floorTypeStr.includes('panel')))) {
      floorTexture = createWoodTexture('herringbone', floorColor);
    } else if (explicitFloorTexture === 'marble' || (!explicitFloorTexture && floorTypeStr.includes('marmur'))) {
      floorTexture = createMarbleTexture(floorColor);
    } else if (explicitFloorTexture === 'terrazzo' || (!explicitFloorTexture && (floorTypeStr.includes('terrazzo') || floorTypeStr.includes('lastryko')))) {
      floorTexture = createTerrazzoTexture(floorColor);
    } else if (explicitFloorTexture === 'microcement' || (!explicitFloorTexture && (floorTypeStr.includes('mikrocement') || floorTypeStr.includes('beton')))) {
      floorTexture = createMicrocementTexture(floorColor);
    } else if (explicitFloorTexture === 'tiles' || (!explicitFloorTexture && (floorTypeStr.includes('gres') || floorTypeStr.includes('kamień') || floorTypeStr.includes('płytki')))) {
      floorTexture = createTileTexture(floorColor);
    } else {
      floorTexture = createWoodTexture('plank', floorColor);
    }

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: floorRoughness,
      metalness: floorRoughness < 0.2 ? 0.15 : 0.04,
    });

    let floorMesh: THREE.Mesh;
    if (room.polygonVertices && room.polygonVertices.length >= 3) {
      const shape = new THREE.Shape();
      const poly = room.polygonVertices;
      const polyCenterX = W / 2;
      const polyCenterZ = L / 2;
      poly.forEach((pt, idx) => {
        const px = pt.x - polyCenterX;
        const pz = pt.y - polyCenterZ;
        if (idx === 0) shape.moveTo(px, pz);
        else shape.lineTo(px, pz);
      });
      shape.closePath();

      const polyFloorGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.08,
        bevelEnabled: false,
      });
      polyFloorGeo.rotateX(Math.PI / 2);
      floorMesh = new THREE.Mesh(polyFloorGeo, floorMat);
      floorMesh.position.set(0, 0, 0);
    } else {
      const floorGeo = new THREE.BoxGeometry(W, 0.08, L);
      floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(0, -0.04, 0);
    }
    floorMesh.receiveShadow = true;
    floorMesh.name = 'room-floor-mesh';
    if (overlayFloorMode === 'furniture_shadows_only' && photoDisplayMode === 'photo_overlay') {
      floorMesh.visible = false;
    }
    roomGroup.add(floorMesh);

    // --- 1b. AR SHADOW CATCHER PLANE ---
    // Invisible plane using THREE.ShadowMaterial that intercepts soft contact shadows from 3D furniture
    // grounding them directly onto the user's real room photo
    const shadowCatcherGeo = new THREE.PlaneGeometry(W * 1.4, L * 1.4);
    const shadowCatcherMat = new THREE.ShadowMaterial({ opacity: 0.52 });
    const shadowCatcherMesh = new THREE.Mesh(shadowCatcherGeo, shadowCatcherMat);
    shadowCatcherMesh.rotation.x = -Math.PI / 2;
    shadowCatcherMesh.position.set(0, 0.002, 0);
    shadowCatcherMesh.receiveShadow = true;
    shadowCatcherMesh.name = 'ar-shadow-catcher';
    roomGroup.add(shadowCatcherMesh);

    // --- 2. BASEBOARDS (Listwy przypodłogowe 8cm) ---
    const baseboardH = 0.08;
    const baseboardT = 0.016;
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.25,
      metalness: 0.05,
    });

    const addBaseboard = (length: number, pos: [number, number, number], rotY: number = 0) => {
      const bbGeo = new THREE.BoxGeometry(length, baseboardH, baseboardT);
      const bbMesh = new THREE.Mesh(bbGeo, baseboardMat);
      bbMesh.position.set(...pos);
      bbMesh.rotation.y = rotY;
      bbMesh.castShadow = true;
      bbMesh.receiveShadow = true;
      roomGroup.add(bbMesh);
    };

    // Baseboards on back, left, right walls
    addBaseboard(W - baseboardT * 2, [0, baseboardH / 2, -halfL + baseboardT / 2]);
    addBaseboard(L, [-halfW + baseboardT / 2, baseboardH / 2, 0], Math.PI / 2);
    addBaseboard(L, [halfW - baseboardT / 2, baseboardH / 2, 0], Math.PI / 2);
    if (!cutawayWalls) {
      addBaseboard(W - baseboardT * 2, [0, baseboardH / 2, halfL - baseboardT / 2]);
    }

    // --- 3. WALLS ---
    const wallThick = 0.16;
    const wallColor = room.design.wallColor || '#f8fafc';
    const wallTypeStr = (room.design.wallType || '').toLowerCase();
    const explicitWallTexture = room.design.wallTexture;
    const wallRoughness = room.design.wallRoughness !== undefined ? room.design.wallRoughness : 0.85;

    let wallTex: THREE.Texture | undefined;
    if (customWallPhotoSrc) {
      const loader = new THREE.TextureLoader();
      const loadedTex = loader.load(customWallPhotoSrc);
      loadedTex.wrapS = THREE.RepeatWrapping;
      loadedTex.wrapT = THREE.RepeatWrapping;
      loadedTex.repeat.set(Math.max(1, W / 1.0), Math.max(1, H / 1.0));
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      wallTex = loadedTex;
    } else if (explicitWallTexture === 'brick' || (!explicitWallTexture && wallTypeStr.includes('cegła'))) {
      wallTex = createBrickTexture(wallColor);
    } else if (explicitWallTexture === 'slats' || (!explicitWallTexture && wallTypeStr.includes('lamele'))) {
      wallTex = createWoodSlatsTexture(wallColor);
    } else if (explicitWallTexture === 'concrete_panels' || (!explicitWallTexture && (wallTypeStr.includes('beton architektoniczny') || wallTypeStr.includes('płyty betonowe')))) {
      wallTex = createConcretePanelsTexture(wallColor);
    } else if (explicitWallTexture === 'subway_tiles' || (!explicitWallTexture && (wallTypeStr.includes('metro') || wallTypeStr.includes('cegiełki')))) {
      wallTex = createSubwayTileTexture(wallColor);
    } else if (explicitWallTexture === 'marble' || (!explicitWallTexture && wallTypeStr.includes('marmur'))) {
      wallTex = createMarbleTexture(wallColor);
    } else if (explicitWallTexture === 'stucco' || (!explicitWallTexture && (wallTypeStr.includes('tynk') || wallTypeStr.includes('stiuk')))) {
      wallTex = createStuccoTexture(wallColor);
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallTex ? undefined : wallColor,
      map: wallTex,
      roughness: wallRoughness,
      metalness: wallRoughness < 0.25 ? 0.15 : 0.02,
      side: THREE.DoubleSide,
    });

    // Back Wall
    let backWallMat = wallMat;
    if (photoDisplayMode === 'photo_wall' && resolvedPhotoSrc) {
      try {
        const photoTex = new THREE.TextureLoader().load(resolvedPhotoSrc);
        photoTex.colorSpace = THREE.SRGBColorSpace;
        backWallMat = new THREE.MeshStandardMaterial({
          map: photoTex,
          roughness: 0.65,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
      } catch (err) {
        console.warn('Failed to load photo texture for back wall:', err);
      }
    }

    // Materials for openings
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.3,
      metalness: 0.8,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#c7d2fe',
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.5,
    });
    const parapetMat = new THREE.MeshStandardMaterial({
      color: '#d4a373',
      roughness: 0.35,
    });
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.4,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.95,
      roughness: 0.15,
    });

    // Map room openings to target walls intelligently
    const openingsByWall: { [key in 'back' | 'left' | 'right' | 'front']?: typeof room.openings[0] } = {};
    let windowCounter = 0;
    let doorCounter = 0;

    (room.openings || []).forEach((op) => {
      let targetWall: 'back' | 'left' | 'right' | 'front' = (op.wall as 'back' | 'left' | 'right' | 'front') || 'left';
      if (!op.wall) {
        if (op.type === 'window') {
          targetWall = windowCounter === 0 ? 'left' : windowCounter === 1 ? 'back' : 'right';
          windowCounter++;
        } else {
          targetWall = doorCounter === 0 ? 'right' : doorCounter === 1 ? 'front' : 'left';
          doorCounter++;
        }
      }
      if (!openingsByWall[targetWall]) {
        openingsByWall[targetWall] = op;
      }
    });

    // Determine wall heights when room is an attic with knee walls
    const isAttic = Boolean(room.atticRoof?.isAttic);
    const atticConfig = room.atticRoof;
    const kneeH = isAttic
      ? Math.min(H - 0.2, Math.max(0.3, atticConfig?.kneeWallHeightM ?? 1.0))
      : H;

    const backWallHeight = isAttic && atticConfig?.slopeWall === 'back' ? kneeH : H;
    const frontWallHeight = isAttic && atticConfig?.slopeWall === 'front' ? kneeH : H;
    const leftWallHeight =
      isAttic && (atticConfig?.slopeWall === 'left' || atticConfig?.slopeWall === 'both_sides')
        ? kneeH
        : H;
    const rightWallHeight =
      isAttic && (atticConfig?.slopeWall === 'right' || atticConfig?.slopeWall === 'both_sides')
        ? kneeH
        : H;

    if (room.polygonVertices && room.polygonVertices.length >= 3) {
      // Polygonal Wall Segments Extrusion matching the exact polygon floor shape
      const poly = room.polygonVertices;
      const polyCenterX = W / 2;
      const polyCenterZ = L / 2;
      const n = poly.length;

      for (let i = 0; i < n; i++) {
        const nextI = (i + 1) % n;
        const p1x = poly[i].x - polyCenterX;
        const p1z = poly[i].y - polyCenterZ;
        const p2x = poly[nextI].x - polyCenterX;
        const p2z = poly[nextI].y - polyCenterZ;

        const segLength = Math.hypot(p2x - p1x, p2z - p1z);
        if (segLength < 0.05) continue;

        const midX = (p1x + p2x) / 2;
        const midZ = (p1z + p2z) / 2;
        const angleY = -Math.atan2(p2z - p1z, p2x - p1x);

        let segHeight = H;
        if (isAttic && atticConfig) {
          if (
            (atticConfig.slopeWall === 'left' && midX < -halfW * 0.3) ||
            (atticConfig.slopeWall === 'right' && midX > halfW * 0.3) ||
            (atticConfig.slopeWall === 'back' && midZ < -halfL * 0.3) ||
            (atticConfig.slopeWall === 'front' && midZ > halfL * 0.3) ||
            (atticConfig.slopeWall === 'both_sides' && Math.abs(midX) > halfW * 0.3)
          ) {
            segHeight = kneeH;
          }
        }

        const segWallGeo = new THREE.BoxGeometry(segLength, segHeight, wallThick);
        const segWall = new THREE.Mesh(segWallGeo, wallMat);
        segWall.position.set(midX, segHeight / 2, midZ);
        segWall.rotation.y = angleY;
        segWall.receiveShadow = true;
        segWall.castShadow = true;
        roomGroup.add(segWall);
      }
    } else {
      // 1. Back Wall (along X axis at Z = -halfL - wallThick / 2, width = W + wallThick * 2)
      const backOp = openingsByWall['back'];
      const totalBackW = W + wallThick * 2;
      if (!backOp) {
        const backWallGeo = new THREE.BoxGeometry(totalBackW, backWallHeight, wallThick);
        const backWall = new THREE.Mesh(backWallGeo, backWallMat);
        backWall.position.set(0, backWallHeight / 2, -halfL - wallThick / 2);
        backWall.receiveShadow = true;
        backWall.castShadow = true;
        roomGroup.add(backWall);
      } else {
        const opW = Math.min(backOp.width || 1.4, totalBackW * 0.7);
        const opH = Math.min(backOp.height || 1.4, backWallHeight * 0.85);
        const isWin = backOp.type === 'window';
        const sillH = isWin ? (backOp.sillHeight ?? (opH >= 2.0 ? 0 : 0.85)) : 0;
        const topH = Math.max(0, backWallHeight - (sillH + opH));
        const sideW = (totalBackW - opW) / 2;

        const p1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, backWallHeight, wallThick), backWallMat);
        p1.position.set(-totalBackW / 2 + sideW / 2, backWallHeight / 2, -halfL - wallThick / 2);
        p1.receiveShadow = true;
        p1.castShadow = true;
        roomGroup.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, backWallHeight, wallThick), backWallMat);
        p2.position.set(totalBackW / 2 - sideW / 2, backWallHeight / 2, -halfL - wallThick / 2);
        p2.receiveShadow = true;
        p2.castShadow = true;
        roomGroup.add(p2);

        if (sillH > 0.05) {
          const pBelow = new THREE.Mesh(new THREE.BoxGeometry(opW, sillH, wallThick), backWallMat);
          pBelow.position.set(0, sillH / 2, -halfL - wallThick / 2);
          pBelow.receiveShadow = true;
          pBelow.castShadow = true;
          roomGroup.add(pBelow);
        }
        if (topH > 0.05) {
          const pAbove = new THREE.Mesh(new THREE.BoxGeometry(opW, topH, wallThick), backWallMat);
          pAbove.position.set(0, backWallHeight - topH / 2, -halfL - wallThick / 2);
          pAbove.receiveShadow = true;
          pAbove.castShadow = true;
          roomGroup.add(pAbove);
        }

        if (isWin) {
          const glass = new THREE.Mesh(new THREE.BoxGeometry(opW - 0.08, opH - 0.08, 0.02), glassMat);
          glass.position.set(0, sillH + opH / 2, -halfL - wallThick / 2);
          roomGroup.add(glass);

          const wFrame = new THREE.Mesh(new THREE.BoxGeometry(opW, 0.05, wallThick + 0.04), frameMat);
          wFrame.position.set(0, sillH, -halfL - wallThick / 2);
          roomGroup.add(wFrame);

          if (sillH > 0.05) {
            const parapet = new THREE.Mesh(new THREE.BoxGeometry(opW + 0.12, 0.035, wallThick + 0.1), parapetMat);
            parapet.position.set(0, sillH, -halfL - wallThick / 2 + 0.04);
            parapet.castShadow = true;
            roomGroup.add(parapet);
          }
        } else {
          const door = new THREE.Mesh(new THREE.BoxGeometry(opW - 0.04, opH - 0.02, 0.04), doorMat);
          door.position.set(0, opH / 2, -halfL - wallThick / 2);
          door.castShadow = true;
          roomGroup.add(door);

          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), handleMat);
          handle.position.set(opW * 0.35, 1.05, -halfL - wallThick / 2 + 0.03);
          roomGroup.add(handle);
        }
      }

      // 2. Left Wall (along Z axis at X = -halfW - wallThick / 2, length = L)
      const leftOp = openingsByWall['left'];
      if (!leftOp) {
        const leftWallGeo = new THREE.BoxGeometry(wallThick, leftWallHeight, L);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.set(-halfW - wallThick / 2, leftWallHeight / 2, 0);
        leftWall.receiveShadow = true;
        leftWall.castShadow = true;
        roomGroup.add(leftWall);
      } else {
        const opW = Math.min(leftOp.width || 1.4, L * 0.7);
        const opH = Math.min(leftOp.height || 1.4, leftWallHeight * 0.85);
        const isWin = leftOp.type === 'window';
        const sillH = isWin ? (leftOp.sillHeight ?? (opH >= 2.0 ? 0 : 0.85)) : 0;
        const topH = Math.max(0, leftWallHeight - (sillH + opH));
        const sideL = (L - opW) / 2;

        const p1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, leftWallHeight, sideL), wallMat);
        p1.position.set(-halfW - wallThick / 2, leftWallHeight / 2, -halfL + sideL / 2);
        p1.receiveShadow = true;
        p1.castShadow = true;
        roomGroup.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, leftWallHeight, sideL), wallMat);
        p2.position.set(-halfW - wallThick / 2, leftWallHeight / 2, halfL - sideL / 2);
        p2.receiveShadow = true;
        p2.castShadow = true;
        roomGroup.add(p2);

        if (sillH > 0.05) {
          const pBelow = new THREE.Mesh(new THREE.BoxGeometry(wallThick, sillH, opW), wallMat);
          pBelow.position.set(-halfW - wallThick / 2, sillH / 2, 0);
          pBelow.receiveShadow = true;
          pBelow.castShadow = true;
          roomGroup.add(pBelow);
        }
        if (topH > 0.05) {
          const pAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, topH, opW), wallMat);
          pAbove.position.set(-halfW - wallThick / 2, leftWallHeight - topH / 2, 0);
          pAbove.receiveShadow = true;
          pAbove.castShadow = true;
          roomGroup.add(pAbove);
        }

        if (isWin) {
          const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, opH - 0.08, opW - 0.08), glassMat);
          glass.position.set(-halfW - wallThick / 2, sillH + opH / 2, 0);
          roomGroup.add(glass);

          const wFrame = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.04, 0.05, opW), frameMat);
          wFrame.position.set(-halfW - wallThick / 2, sillH, 0);
          roomGroup.add(wFrame);

          if (sillH > 0.05) {
            const parapet = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.1, 0.035, opW + 0.12), parapetMat);
            parapet.position.set(-halfW - wallThick / 2 + 0.04, sillH, 0);
            parapet.castShadow = true;
            roomGroup.add(parapet);
          }
        } else {
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, opH - 0.02, opW - 0.04), doorMat);
          door.position.set(-halfW - wallThick / 2, opH / 2, 0);
          door.castShadow = true;
          roomGroup.add(door);

          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), handleMat);
          handle.position.set(-halfW - wallThick / 2 + 0.03, 1.05, opW * 0.35);
          roomGroup.add(handle);
        }
      }

      // 3. Right Wall (along Z axis at X = halfW + wallThick / 2, length = L)
      const rightOp = openingsByWall['right'];
      if (!rightOp) {
        const rightWallGeo = new THREE.BoxGeometry(wallThick, rightWallHeight, L);
        const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
        rightWall.position.set(halfW + wallThick / 2, rightWallHeight / 2, 0);
        rightWall.receiveShadow = true;
        rightWall.castShadow = true;
        roomGroup.add(rightWall);
      } else {
        const opW = Math.min(rightOp.width || 0.9, L * 0.7);
        const opH = Math.min(rightOp.height || 2.1, rightWallHeight * 0.9);
        const isWin = rightOp.type === 'window';
        const sillH = isWin ? (rightOp.sillHeight ?? (opH >= 2.0 ? 0 : 0.85)) : 0;
        const topH = Math.max(0, rightWallHeight - (sillH + opH));
        const sideL = (L - opW) / 2;

        const p1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, rightWallHeight, sideL), wallMat);
        p1.position.set(halfW + wallThick / 2, rightWallHeight / 2, -halfL + sideL / 2);
        p1.receiveShadow = true;
        p1.castShadow = true;
        roomGroup.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, rightWallHeight, sideL), wallMat);
        p2.position.set(halfW + wallThick / 2, rightWallHeight / 2, halfL - sideL / 2);
        p2.receiveShadow = true;
        p2.castShadow = true;
        roomGroup.add(p2);

        if (sillH > 0.05) {
          const pBelow = new THREE.Mesh(new THREE.BoxGeometry(wallThick, sillH, opW), wallMat);
          pBelow.position.set(halfW + wallThick / 2, sillH / 2, 0);
          pBelow.receiveShadow = true;
          pBelow.castShadow = true;
          roomGroup.add(pBelow);
        }
        if (topH > 0.05) {
          const pAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, topH, opW), wallMat);
          pAbove.position.set(halfW + wallThick / 2, rightWallHeight - topH / 2, 0);
          pAbove.receiveShadow = true;
          pAbove.castShadow = true;
          roomGroup.add(pAbove);
        }

        if (isWin) {
          const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, opH - 0.08, opW - 0.08), glassMat);
          glass.position.set(halfW + wallThick / 2, sillH + opH / 2, 0);
          roomGroup.add(glass);

          const wFrame = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.04, 0.05, opW), frameMat);
          wFrame.position.set(halfW + wallThick / 2, sillH, 0);
          roomGroup.add(wFrame);

          if (sillH > 0.05) {
            const parapet = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.1, 0.035, opW + 0.12), parapetMat);
            parapet.position.set(halfW + wallThick / 2 - 0.04, sillH, 0);
            parapet.castShadow = true;
            roomGroup.add(parapet);
          }
        } else {
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, opH - 0.02, opW - 0.04), doorMat);
          door.position.set(halfW + wallThick / 2, opH / 2, 0);
          door.castShadow = true;
          roomGroup.add(door);

          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), handleMat);
          handle.position.set(halfW + wallThick / 2 - 0.03, 1.05, opW * 0.35);
          roomGroup.add(handle);
        }
      }

      // 4. Front Wall (Sectioned or semi-transparent in cutaway)
      if (!cutawayWalls) {
        const frontOp = openingsByWall['front'];
        if (!frontOp) {
          const frontWallGeo = new THREE.BoxGeometry(W + wallThick * 2, frontWallHeight, wallThick);
          const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
          frontWall.position.set(0, frontWallHeight / 2, halfL + wallThick / 2);
          frontWall.receiveShadow = true;
          roomGroup.add(frontWall);
        } else {
          const opW = Math.min(frontOp.width || 1.4, totalBackW * 0.7);
          const opH = Math.min(frontOp.height || 1.4, frontWallHeight * 0.85);
          const isWin = frontOp.type === 'window';
          const sillH = isWin ? (frontOp.sillHeight ?? (opH >= 2.0 ? 0 : 0.85)) : 0;
          const topH = Math.max(0, frontWallHeight - (sillH + opH));
          const sideW = (totalBackW - opW) / 2;

          const p1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, frontWallHeight, wallThick), wallMat);
          p1.position.set(-totalBackW / 2 + sideW / 2, frontWallHeight / 2, halfL + wallThick / 2);
          p1.receiveShadow = true;
          roomGroup.add(p1);

          const p2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, frontWallHeight, wallThick), wallMat);
          p2.position.set(totalBackW / 2 - sideW / 2, frontWallHeight / 2, halfL + wallThick / 2);
          p2.receiveShadow = true;
          roomGroup.add(p2);

          if (sillH > 0.05) {
            const pBelow = new THREE.Mesh(new THREE.BoxGeometry(opW, sillH, wallThick), wallMat);
            pBelow.position.set(0, sillH / 2, halfL + wallThick / 2);
            roomGroup.add(pBelow);
          }
          if (topH > 0.05) {
            const pAbove = new THREE.Mesh(new THREE.BoxGeometry(opW, topH, wallThick), wallMat);
            pAbove.position.set(0, frontWallHeight - topH / 2, halfL + wallThick / 2);
            roomGroup.add(pAbove);
          }
        }
      } else {
        // Half-height cutaway wall indicator for architectural section
        const stubWallGeo = new THREE.BoxGeometry(W + wallThick * 2, 0.35, wallThick);
        const stubWallMat = new THREE.MeshStandardMaterial({
          color: '#334155',
          roughness: 0.5,
        });
        const stubWall = new THREE.Mesh(stubWallGeo, stubWallMat);
        stubWall.position.set(0, 0.35 / 2, halfL + wallThick / 2);
        roomGroup.add(stubWall);
      }
    }

    // --- 3b. ATTIC ROOF SLOPING CEILING PLANES ---
    if (isAttic && atticConfig) {
      const pitchDeg = Math.min(75, Math.max(20, atticConfig.roofPitchDeg || 40));
      const pitchRad = (pitchDeg * Math.PI) / 180;
      const deltaH = H - kneeH;
      const slopeRun = Math.min(halfW, deltaH / Math.tan(pitchRad));
      const slopeLen = deltaH / Math.sin(pitchRad);

      const roofMat = new THREE.MeshStandardMaterial({
        color: room.design.ceilingColor || '#f8fafc',
        roughness: 0.85,
        side: THREE.DoubleSide,
      });

      // Slope on left
      if (atticConfig.slopeWall === 'left' || atticConfig.slopeWall === 'both_sides') {
        const slopeGeo = new THREE.PlaneGeometry(slopeLen, L + wallThick * 2);
        const slopeMesh = new THREE.Mesh(slopeGeo, roofMat);
        const midSlopeX = -halfW + slopeRun / 2;
        const midSlopeY = kneeH + deltaH / 2;
        slopeMesh.position.set(midSlopeX, midSlopeY, 0);
        slopeMesh.rotation.y = Math.PI / 2;
        slopeMesh.rotation.x = Math.PI / 2 - pitchRad;
        slopeMesh.receiveShadow = true;
        roomGroup.add(slopeMesh);

        if (atticConfig.hasSkylight) {
          const skylightGroup = new THREE.Group();
          const skyFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.2, 0.05),
            new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
          );
          const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), glassMat);
          skyGlass.position.z = 0.03;
          skylightGroup.add(skyFrame);
          skylightGroup.add(skyGlass);
          skylightGroup.position.set(midSlopeX + 0.01, midSlopeY, 0);
          skylightGroup.rotation.y = Math.PI / 2;
          skylightGroup.rotation.x = Math.PI / 2 - pitchRad;
          roomGroup.add(skylightGroup);
        }
      }

      // Slope on right
      if (atticConfig.slopeWall === 'right' || atticConfig.slopeWall === 'both_sides') {
        const slopeGeo = new THREE.PlaneGeometry(slopeLen, L + wallThick * 2);
        const slopeMesh = new THREE.Mesh(slopeGeo, roofMat);
        const midSlopeX = halfW - slopeRun / 2;
        const midSlopeY = kneeH + deltaH / 2;
        slopeMesh.position.set(midSlopeX, midSlopeY, 0);
        slopeMesh.rotation.y = -Math.PI / 2;
        slopeMesh.rotation.x = -(Math.PI / 2 - pitchRad);
        slopeMesh.receiveShadow = true;
        roomGroup.add(slopeMesh);

        if (atticConfig.hasSkylight && (atticConfig.slopeWall === 'right' || atticConfig.slopeWall === 'both_sides')) {
          const skylightGroup = new THREE.Group();
          const skyFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.2, 0.05),
            new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
          );
          const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), glassMat);
          skyGlass.position.z = 0.03;
          skylightGroup.add(skyFrame);
          skylightGroup.add(skyGlass);
          skylightGroup.position.set(midSlopeX - 0.01, midSlopeY, 0);
          skylightGroup.rotation.y = -Math.PI / 2;
          skylightGroup.rotation.x = -(Math.PI / 2 - pitchRad);
          roomGroup.add(skylightGroup);
        }
      }

      // Slope on back
      if (atticConfig.slopeWall === 'back') {
        const slopeRunZ = Math.min(halfL, deltaH / Math.tan(pitchRad));
        const slopeLenZ = deltaH / Math.sin(pitchRad);
        const slopeGeo = new THREE.PlaneGeometry(W + wallThick * 2, slopeLenZ);
        const slopeMesh = new THREE.Mesh(slopeGeo, roofMat);
        const midSlopeZ = -halfL + slopeRunZ / 2;
        const midSlopeY = kneeH + deltaH / 2;
        slopeMesh.position.set(0, midSlopeY, midSlopeZ);
        slopeMesh.rotation.x = Math.PI / 2 - pitchRad;
        slopeMesh.receiveShadow = true;
        roomGroup.add(slopeMesh);

        if (atticConfig.hasSkylight) {
          const skylightGroup = new THREE.Group();
          const skyFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 0.05),
            new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
          );
          const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), glassMat);
          skyGlass.position.z = 0.03;
          skylightGroup.add(skyFrame);
          skylightGroup.add(skyGlass);
          skylightGroup.position.set(0, midSlopeY, midSlopeZ + 0.01);
          skylightGroup.rotation.x = Math.PI / 2 - pitchRad;
          roomGroup.add(skylightGroup);
        }
      }

      // Slope on front
      if (atticConfig.slopeWall === 'front') {
        const slopeRunZ = Math.min(halfL, deltaH / Math.tan(pitchRad));
        const slopeLenZ = deltaH / Math.sin(pitchRad);
        const slopeGeo = new THREE.PlaneGeometry(W + wallThick * 2, slopeLenZ);
        const slopeMesh = new THREE.Mesh(slopeGeo, roofMat);
        const midSlopeZ = halfL - slopeRunZ / 2;
        const midSlopeY = kneeH + deltaH / 2;
        slopeMesh.position.set(0, midSlopeY, midSlopeZ);
        slopeMesh.rotation.x = -(Math.PI / 2 - pitchRad);
        slopeMesh.receiveShadow = true;
        roomGroup.add(slopeMesh);

        if (atticConfig.hasSkylight) {
          const skylightGroup = new THREE.Group();
          const skyFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 0.05),
            new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
          );
          const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), glassMat);
          skyGlass.position.z = 0.03;
          skylightGroup.add(skyFrame);
          skylightGroup.add(skyGlass);
          skylightGroup.position.set(0, midSlopeY, midSlopeZ - 0.01);
          skylightGroup.rotation.x = -(Math.PI / 2 - pitchRad);
          roomGroup.add(skylightGroup);
        }
      }
    }

    // --- 4. CEILING & LED COVE ---
    if (showCeiling) {
      const ceilingGeo = new THREE.BoxGeometry(W + wallThick * 2, 0.12, L + wallThick * 2);
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: room.design.ceilingColor || '#ffffff',
        roughness: 0.9,
      });
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.position.set(0, H + 0.06, 0);
      ceilingMesh.receiveShadow = true;
      roomGroup.add(ceilingMesh);
    }

    // Modern Ceiling Track / Chandelier
    const trackGroup = new THREE.Group();
    const trackRailGeo = new THREE.BoxGeometry(W * 0.6, 0.03, 0.04);
    const trackRailMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.2 });
    const trackRail = new THREE.Mesh(trackRailGeo, trackRailMat);
    trackRail.position.set(0, H - 0.05, 0);
    trackGroup.add(trackRail);

    // 3 spot lamps along the rail
    for (let i = -1; i <= 1; i++) {
      const spotHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.1, 16),
        trackRailMat
      );
      spotHead.position.set(i * (W * 0.22), H - 0.11, 0);
      spotHead.rotation.x = Math.PI / 12;
      trackGroup.add(spotHead);

      // Light diffuser lens
      const lensMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), lensMat);
      lens.position.set(i * (W * 0.22), H - 0.16, 0.01);
      lens.rotation.x = Math.PI / 2;
      trackGroup.add(lens);
    }
    roomGroup.add(trackGroup);

    // --- 5. ELECTRICAL OUTLETS & SWITCHES ---
    if (room.outlets && room.outlets.length > 0) {
      const outletPlateMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.2,
      });
      room.outlets.forEach((out) => {
        // Map 2D x,y percent to 3D wall placement
        const plateGeo = new THREE.BoxGeometry(0.08, 0.08, 0.015);
        const plate = new THREE.Mesh(plateGeo, outletPlateMat);
        const wallPosX = (out.x / 100 - 0.5) * (W - 0.4);
        plate.position.set(wallPosX, 0.35, -halfL + 0.01);
        roomGroup.add(plate);

        // Small indicator LED dot
        const ledDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.006, 8, 8),
          new THREE.MeshBasicMaterial({ color: out.type === 'socket' ? '#22c55e' : '#0ea5e9' })
        );
        ledDot.position.set(wallPosX, 0.35, -halfL + 0.02);
        roomGroup.add(ledDot);
      });
    }

    // --- 6. REALISTIC ARCHITECTURAL FURNITURE (DYNAMIC & SCENE ACCURATE) ---
    if (room.furniture && room.furniture.length > 0) {
      // Dynamically render each user-configured piece of furniture
      room.furniture.forEach((item) => {
        const meshGroup = create3DFurnitureMesh(item, W, L);
        roomGroup.add(meshGroup);
      });
    } else {
      // Fallback: Default Scandi Setup if no furniture array is specified
      // A. Cozy Scandi/Modern 3-Seater Sofa
      const sofaGroup = new THREE.Group();
      const fabricMat = new THREE.MeshStandardMaterial({
        color: '#384252',
        roughness: 0.85,
        metalness: 0.05,
      });
      const pillowMat = new THREE.MeshStandardMaterial({
        color: '#0d9488',
        roughness: 0.75,
      });
      const woodLegMat = new THREE.MeshStandardMaterial({
        color: '#92400e',
        roughness: 0.4,
      });

      const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 0.95), fabricMat);
      sofaBase.position.set(0, 0.24, 0);
      sofaBase.castShadow = true;
      sofaBase.receiveShadow = true;
      sofaGroup.add(sofaBase);

      for (let i = -0.5; i <= 0.5; i += 1.0) {
        const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.85), fabricMat);
        seatCushion.position.set(i * 0.51, 0.42, 0.03);
        seatCushion.castShadow = true;
        seatCushion.receiveShadow = true;
        sofaGroup.add(seatCushion);
      }

      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 0.22), fabricMat);
      sofaBack.position.set(0, 0.62, -0.38);
      sofaBack.castShadow = true;
      sofaGroup.add(sofaBack);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.95), fabricMat);
      armL.position.set(-1.05, 0.46, 0);
      armL.castShadow = true;
      sofaGroup.add(armL);

      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.95), fabricMat);
      armR.position.set(1.05, 0.46, 0);
      armR.castShadow = true;
      sofaGroup.add(armR);

      const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.12), pillowMat);
      pillowL.position.set(-0.85, 0.52, -0.22);
      pillowL.rotation.y = 0.2;
      pillowL.rotation.z = -0.15;
      pillowL.castShadow = true;
      sofaGroup.add(pillowL);

      for (let lx of [-0.95, 0.95]) {
        for (let lz of [-0.38, 0.38]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.14, 12), woodLegMat);
          leg.position.set(lx, 0.07, lz);
          leg.castShadow = true;
          sofaGroup.add(leg);
        }
      }

      sofaGroup.position.set(-0.3, 0, -halfL + 0.95);
      roomGroup.add(sofaGroup);

      // B. Minimalist Coffee Table
      const tableGroup = new THREE.Group();
      const tableTopMat = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.18,
        metalness: 0.1,
      });
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.035, 32), tableTopMat);
      tableTop.position.set(0, 0.42, 0);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      tableGroup.add(tableTop);

      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.03, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 })
      );
      cup.position.set(0.12, 0.48, -0.08);
      cup.castShadow = true;
      tableGroup.add(cup);

      const steelLegMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 });
      for (let a = 0; a < 3; a++) {
        const angle = (a * Math.PI * 2) / 3;
        const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.42, 8), steelLegMat);
        tLeg.position.set(Math.cos(angle) * 0.35, 0.21, Math.sin(angle) * 0.35);
        tLeg.rotation.z = Math.cos(angle) * 0.12;
        tLeg.rotation.x = Math.sin(angle) * 0.12;
        tLeg.castShadow = true;
        tableGroup.add(tLeg);
      }
      tableGroup.position.set(-0.3, 0, -halfL + 1.95);
      roomGroup.add(tableGroup);

      // C. Modern TV Media Console
      const tvGroup = new THREE.Group();
      const cabinetMat = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.3,
      });
      const tvCabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.42), cabinetMat);
      tvCabinet.position.set(0, 0.23, 0);
      tvCabinet.castShadow = true;
      tvCabinet.receiveShadow = true;
      tvGroup.add(tvCabinet);

      const tvScreenMat = new THREE.MeshStandardMaterial({
        color: '#090d16',
        roughness: 0.1,
        metalness: 0.8,
      });
      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.03), tvScreenMat);
      tvScreen.position.set(0, 1.15, -0.05);
      tvScreen.castShadow = true;
      tvGroup.add(tvScreen);

      const tvGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.54, 0.89),
        new THREE.MeshBasicMaterial({ color: '#0284c7' })
      );
      tvGlow.position.set(0, 1.15, -0.03);
      tvGroup.add(tvGlow);

      tvGroup.position.set(-0.3, 0, halfL - 0.45);
      tvGroup.rotation.y = Math.PI;
      roomGroup.add(tvGroup);
    }

    // D. Architectural Monstera Potted Plant (Accent)
    const plantGroup = new THREE.Group();
    const potGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.45, 24);
    const potMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(0, 0.23, 0);
    pot.castShadow = true;
    plantGroup.add(pot);

    // Soil
    const soil = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 16),
      new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.9 })
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(0, 0.44, 0);
    plantGroup.add(soil);

    // Lush Monstera leaves
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    for (let l = 0; l < 7; l++) {
      const angle = (l * Math.PI * 2) / 7;
      const leafGeo = new THREE.SphereGeometry(0.24, 12, 12);
      leafGeo.scale(1, 0.1, 1.7);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.18, 0.55 + l * 0.07, Math.sin(angle) * 0.18);
      leaf.rotation.x = 0.5;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }
    plantGroup.position.set(halfW - 0.55, 0, -halfL + 0.55);
    roomGroup.add(plantGroup);

    // E. Framed Wall Art (Gallery Abstract Print)
    const artGroup = new THREE.Group();
    const frameGeo = new THREE.BoxGeometry(1.2, 0.8, 0.03);
    const artFrameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 });
    const artFrame = new THREE.Mesh(frameGeo, artFrameMat);
    artGroup.add(artFrame);

    // Artwork canvas (geometric Bauhaus style)
    const artCanvas = document.createElement('canvas');
    artCanvas.width = 512;
    artCanvas.height = 340;
    const actx = artCanvas.getContext('2d');
    if (actx) {
      actx.fillStyle = '#f8fafc';
      actx.fillRect(0, 0, 512, 340);
      actx.fillStyle = '#0f766e';
      actx.beginPath();
      actx.arc(256, 170, 90, 0, Math.PI * 2);
      actx.fill();
      actx.fillStyle = '#f97316';
      actx.fillRect(200, 160, 180, 70);
      actx.fillStyle = '#1e293b';
      actx.font = 'bold 22px monospace';
      actx.fillText('ARCHITECTURAL FORM', 40, 300);
    }
    const artTex = new THREE.CanvasTexture(artCanvas);
    const artMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.14, 0.74),
      new THREE.MeshBasicMaterial({ map: artTex })
    );
    artMesh.position.set(0, 0, 0.016);
    artGroup.add(artMesh);

    artGroup.position.set(0, 1.7, -halfL + 0.02);
    roomGroup.add(artGroup);

  }, [room, showCeiling, cutawayWalls, photoDisplayMode, resolvedPhotoSrc, overlayFloorMode, customFloorPhotoSrc, customWallPhotoSrc]);

  // Update selection highlight ring and bracket when selectedFurnitureId or room.furniture changes
  useEffect(() => {
    const selectionGroup = selectionGroupRef.current;
    const roomGroup = roomGroupRef.current;
    if (!selectionGroup || !roomGroup) return;

    while (selectionGroup.children.length > 0) {
      const child = selectionGroup.children[0];
      selectionGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    if (!selectedFurnitureId) return;

    const targetObj = roomGroup.getObjectByName(`furniture-${selectedFurnitureId}`);
    if (!targetObj) return;

    const box = new THREE.Box3().setFromObject(targetObj);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Soft glowing cyan floor ring
    const ringRadius = Math.max(0.6, Math.max(size.x, size.z) * 0.62);
    const ringGeo = new THREE.RingGeometry(ringRadius * 0.94, ringRadius * 1.06, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#0d9488',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(targetObj.position.x, 0.005, targetObj.position.z);
    selectionGroup.add(ringMesh);

    // 3D Box outline helper
    const boxHelper = new THREE.Box3Helper(box, new THREE.Color('#2dd4bf'));
    selectionGroup.add(boxHelper);
  }, [selectedFurnitureId, room.furniture]);

  // Set Camera Presets smoothly via glide interpolation
  const handleSetCameraView = (preset: CameraViewPreset) => {
    setActiveCameraPreset(preset);
    const { width: W, length: L, height: H } = room;
    const maxDim = Math.max(W, L);
    const targetPos = new THREE.Vector3();
    const targetTarget = new THREE.Vector3(0, H * 0.4, 0);

    if (preset === 'isometric') {
      targetPos.set(maxDim * 1.35, H * 1.5, maxDim * 1.35);
      targetTarget.set(0, H * 0.35, 0);
    } else if (preset === 'corner') {
      targetPos.set(-maxDim * 0.95, H * 1.15, maxDim * 1.15);
      targetTarget.set(0, H * 0.42, 0);
    } else if (preset === 'top_down') {
      targetPos.set(0, maxDim * 2.2, 0.001);
      targetTarget.set(0, 0, 0);
    } else if (preset === 'eye_level') {
      targetPos.set(0, 1.65, L * 0.32);
      targetTarget.set(0, 1.35, -L * 0.35);
    }

    cameraTransitionRef.current = {
      targetPos,
      targetTarget,
      active: true,
    };
  };

  // Furniture Manipulations (Rotation, Color, Deletion)
  const handleRotateSelectedFurniture = (deltaDeg: number) => {
    if (!selectedFurnitureId || !room.furniture || !onUpdateFurniture) return;
    const updated = room.furniture.map((f) => {
      if (f.id !== selectedFurnitureId) return f;
      const nextRot = ((f.rotation || 0) + deltaDeg + 360) % 360;
      return { ...f, rotation: nextRot };
    });
    onUpdateFurniture(room.id, updated);
  };

  const handleColorSelectedFurniture = (colorHex: string) => {
    if (!selectedFurnitureId || !room.furniture || !onUpdateFurniture) return;
    const updated = room.furniture.map((f) => {
      if (f.id !== selectedFurnitureId) return f;
      return { ...f, color: colorHex };
    });
    onUpdateFurniture(room.id, updated);
  };

  const handleDeleteSelectedFurniture = () => {
    if (!selectedFurnitureId) return;
    if (onDeleteFurniture) {
      onDeleteFurniture(room.id, selectedFurnitureId);
    } else if (room.furniture && onUpdateFurniture) {
      const updated = room.furniture.filter((f) => f.id !== selectedFurnitureId);
      onUpdateFurniture(room.id, updated);
    }
    setSelectedFurnitureId(null);
  };

  // High-Resolution Snapshot Capture (compositing real photo + 3D canvas if AR overlay is active)
  const handleCaptureSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    setIsExporting(true);
    renderer.render(scene, camera);

    setTimeout(() => {
      try {
        const domCanvas = renderer.domElement;
        
        if (resolvedPhotoSrc && (photoDisplayMode === 'photo_overlay' || photoDisplayMode === 'split_compare')) {
          const compCanvas = document.createElement('canvas');
          compCanvas.width = domCanvas.width;
          compCanvas.height = domCanvas.height;
          const ctx = compCanvas.getContext('2d');
          if (ctx) {
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.onload = () => {
              // Draw background photo scaled to cover (preserving aspect ratio)
              const imgRatio = bgImg.width / bgImg.height;
              const canvasRatio = compCanvas.width / compCanvas.height;
              let drawW = compCanvas.width;
              let drawH = compCanvas.height;
              let drawX = 0;
              let drawY = 0;
              if (imgRatio > canvasRatio) {
                drawW = compCanvas.height * imgRatio;
                drawX = (compCanvas.width - drawW) / 2;
              } else {
                drawH = compCanvas.width / imgRatio;
                drawY = (compCanvas.height - drawH) / 2;
              }
              ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
              
              if (photoDisplayMode === 'photo_overlay') {
                ctx.globalAlpha = photoBlendOpacity / 100;
                ctx.drawImage(domCanvas, 0, 0);
              } else if (photoDisplayMode === 'split_compare') {
                const splitPx = (splitSliderPos / 100) * compCanvas.width;
                ctx.save();
                ctx.beginPath();
                ctx.rect(splitPx, 0, compCanvas.width - splitPx, compCanvas.height);
                ctx.clip();
                ctx.drawImage(domCanvas, 0, 0);
                ctx.restore();
                
                // Draw split line
                ctx.strokeStyle = '#2dd4bf';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(splitPx, 0);
                ctx.lineTo(splitPx, compCanvas.height);
                ctx.stroke();
              }
              
              const dataUrl = compCanvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `Renowacja-AR-${room.name.replace(/\s+/g, '_')}-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
              setIsExporting(false);
            };
            bgImg.onerror = () => {
              // Fallback to domCanvas directly
              const dataUrl = domCanvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `Renowacja-3D-${room.name.replace(/\s+/g, '_')}-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
              setIsExporting(false);
            };
            bgImg.src = resolvedPhotoSrc;
            return;
          }
        }

        const dataUrl = domCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Renowacja-3D-${room.name.replace(/\s+/g, '_')}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Błąd eksportu zrzutu 3D:', err);
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl select-none ${className}`}>
      
      {/* Hidden File Input for Room Photo Upload from Gallery/Disk */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Hidden File Input for Live Camera Capture on Mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Hidden File Inputs for Material Swatches */}
      <input
        ref={floorSwatchInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFloorSwatchUpload}
      />
      <input
        ref={wallSwatchInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWallSwatchUpload}
      />

      {/* Mode 1 & Mode 3: Photo Background underlay when photoDisplayMode is 'photo_overlay' or 'split_compare' */}
      {(photoDisplayMode === 'photo_overlay' || photoDisplayMode === 'split_compare') && resolvedPhotoSrc && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all pointer-events-none"
          style={{ backgroundImage: `url(${resolvedPhotoSrc})` }}
        />
      )}

      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="w-full h-[540px] sm:h-[620px] cursor-grab active:cursor-grabbing outline-hidden relative z-10"
        style={{
          opacity: photoDisplayMode === 'photo_overlay' ? photoBlendOpacity / 100 : 1,
          clipPath: photoDisplayMode === 'split_compare' ? `inset(0 0 0 ${splitSliderPos}%)` : undefined,
        }}
      />

      {/* Split Screen Draggable Curtain & Badges for 'split_compare' */}
      {photoDisplayMode === 'split_compare' && resolvedPhotoSrc && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Before Label (Left) */}
          <div className="absolute top-16 left-4 pointer-events-auto flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/85 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow-lg">
            <span>Stan Przed Remontem (Zdjęcie)</span>
          </div>

          {/* After Label (Right) */}
          <div className="absolute top-16 right-4 pointer-events-auto flex items-center gap-1.5 rounded-xl border border-teal-500/50 bg-teal-950/85 px-2.5 py-1 text-[11px] font-bold text-teal-300 backdrop-blur-md shadow-lg">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Projekt Po Remoncie (3D)</span>
          </div>

          {/* Draggable Divider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 via-white to-teal-400 shadow-2xl cursor-ew-resize flex items-center justify-center -ml-0.5 pointer-events-auto"
            style={{ left: `${splitSliderPos}%` }}
            onMouseDown={handleSplitDragStart}
            onTouchStart={handleSplitDragStart}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-teal-400 text-teal-300 flex items-center justify-center shadow-2xl text-xs font-bold select-none hover:scale-110 active:scale-95 transition">
              ↔
            </div>
          </div>
        </div>
      )}

      {/* Perspective Vanishing Lines & Horizon Guide Overlay */}
      {showVanishingGrid && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="vanishing-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(45, 212, 191, 0.12)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#vanishing-pattern)" />
            
            {/* Horizon Guide Line (Linia Horyzontu) */}
            <line 
              x1="0" 
              y1={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              x2="100%" 
              y2={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              stroke="#f59e0b" 
              strokeWidth="2" 
              strokeDasharray="8 4" 
              opacity="0.9" 
            />
            
            {/* Vanishing Lines converging from floor bottom to horizon vanishing point */}
            <line 
              x1="50%" 
              y1={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              x2="0%" 
              y2="100%" 
              stroke="#14b8a6" 
              strokeWidth="2" 
              strokeDasharray="6 4" 
              opacity="0.8" 
            />
            <line 
              x1="50%" 
              y1={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              x2="100%" 
              y2="100%" 
              stroke="#14b8a6" 
              strokeWidth="2" 
              strokeDasharray="6 4" 
              opacity="0.8" 
            />
            <line 
              x1="50%" 
              y1={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              x2="25%" 
              y2="100%" 
              stroke="#06b6d4" 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
              opacity="0.65" 
            />
            <line 
              x1="50%" 
              y1={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              x2="75%" 
              y2="100%" 
              stroke="#06b6d4" 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
              opacity="0.65" 
            />

            {/* Vanishing Center Point */}
            <circle 
              cx="50%" 
              cy={`${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}%`} 
              r="6" 
              fill="#f59e0b" 
              stroke="#ffffff"
              strokeWidth="2"
            />
          </svg>
          <div 
            className="absolute right-4 text-[10px] font-mono text-amber-300 bg-amber-950/90 border border-amber-500/50 px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5"
            style={{ top: `calc(${Math.max(15, Math.min(85, 50 - (cameraPitchVal * 1.3)))}% - 14px)` }}
          >
            <span>Horyzont wzroku: {cameraHeightVal.toFixed(2)}m</span>
            <span className="text-amber-500 font-bold">• Pochylenie: {cameraPitchVal}°</span>
          </div>
        </div>
      )}

      {/* Opacity Blend & AR Overlay Controls for 'photo_overlay' */}
      {photoDisplayMode === 'photo_overlay' && resolvedPhotoSrc && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-teal-500/50 bg-slate-950/95 p-2 px-3.5 shadow-2xl backdrop-blur-xl">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <span className="font-semibold text-slate-300 whitespace-nowrap flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Przenikanie:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Foto</span>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={photoBlendOpacity}
              onChange={(e) => setPhotoBlendOpacity(parseInt(e.target.value, 10))}
              className="w-20 sm:w-32 accent-teal-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
            />
            <span className="text-[10px] text-teal-300 font-mono font-bold w-9">{photoBlendOpacity}%</span>
          </div>

          {/* Selective Floor Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setOverlayFloorMode('full_floor')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                overlayFloorMode === 'full_floor'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pokazuje nową posadzkę 3D nałożoną na zdjęcie"
            >
              Nowa Posadzka
            </button>
            <button
              onClick={() => setOverlayFloorMode('furniture_shadows_only')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                overlayFloorMode === 'furniture_shadows_only'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ukrywa posadzkę 3D — widzisz swoją realną podłogę ze zdjęcia, a nowe meble rzucają na nią realistyczne cienie!"
            >
              Tylko Meble + Cienie
            </button>
          </div>

          {/* Perspective Calibration Toggle */}
          <button
            onClick={() => setShowPerspectiveMatch(!showPerspectiveMatch)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
              showPerspectiveMatch
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Dopasuj wysokość kamery, kąt FOV i perspektywę do Twojego zdjęcia"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Kalibracja</span>
          </button>
        </div>
      )}

      {/* Real-time Clearance / Collision HUD indicator */}
      {dragCollisionState && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 ${
          dragCollisionState.hasCollision
            ? 'bg-rose-950/90 border-rose-500/80 text-rose-200'
            : dragCollisionState.isTightClearance
            ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
            : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
        }`}>
          {dragCollisionState.hasCollision ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span>{dragCollisionState.message}</span>
          <span className="font-mono text-[11px] opacity-80 pl-1 border-l border-white/20">
            {dragCollisionState.clearanceM.toFixed(2)}m
          </span>
        </div>
      )}

      {/* Floating 3D Furniture Manipulator Bar (Active on Selection) */}
      {selectedFurnitureItem && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-teal-500/60 bg-slate-950/95 p-2 px-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 max-w-[95%]">
          <div className="flex items-center gap-2 pr-2.5 border-r border-slate-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{selectedFurnitureItem.name}</span>
                <span className="text-[10px] text-teal-300 bg-teal-950/80 border border-teal-800/80 px-1.5 py-0.2 rounded-md font-mono">
                  {selectedFurnitureItem.rotation || 0}°
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {isDraggingActive ? (
                  <span className="text-teal-400 font-semibold animate-pulse">Przeciągasz po podłodze 3D...</span>
                ) : (
                  <span>Przeciągaj myszą po podłodze (X: {selectedFurnitureItem.x.toFixed(0)}%, Y: {selectedFurnitureItem.y.toFixed(0)}%)</span>
                )}
              </div>
            </div>
          </div>

          {/* Rotation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleRotateSelectedFurniture(-45)}
              className="flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 transition active:scale-95"
              title="Obróć o -45°"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-mono">-45°</span>
            </button>
            <button
              onClick={() => handleRotateSelectedFurniture(45)}
              className="flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 transition active:scale-95"
              title="Obróć o +45°"
            >
              <RotateCw className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-mono">+45°</span>
            </button>
            <button
              onClick={() => handleRotateSelectedFurniture(90)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 text-[11px] font-mono text-slate-200 transition active:scale-95"
              title="Obróć o 90°"
            >
              90°
            </button>
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-1.5 px-2 border-l border-r border-slate-800">
            {[
              { hex: '#384252', label: 'Grafit' },
              { hex: '#854d0e', label: 'Dąb naturalny' },
              { hex: '#1e293b', label: 'Antracyt' },
              { hex: '#f8fafc', label: 'Biel kreda' },
              { hex: '#0f766e', label: 'Morski teal' },
              { hex: '#b91c1c', label: 'Terakota' },
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => handleColorSelectedFurniture(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`h-5 w-5 rounded-full border transition transform hover:scale-115 ${
                  selectedFurnitureItem.color === c.hex ? 'border-teal-400 ring-2 ring-teal-400/40' : 'border-slate-700'
                }`}
                title={c.label}
              />
            ))}
          </div>

          {/* Delete button */}
          <button
            onClick={handleDeleteSelectedFurniture}
            className="flex items-center gap-1 rounded-xl bg-red-950/40 hover:bg-red-900/70 border border-red-800/60 py-1.5 px-2.5 text-xs text-red-300 transition active:scale-95"
            title="Usuń ten mebel ze sceny"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Usuń</span>
          </button>

          {/* Close button */}
          <button
            onClick={() => setSelectedFurnitureId(null)}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 p-1.5 text-slate-400 hover:text-white transition"
            title="Odznacz mebel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Floating Overlay Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-30">
        
        {/* Room Architectural Tag */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs backdrop-blur-md shadow-lg">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{room.name}</span>
              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-300">
                PBR 3D Real-Time
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {room.width.toFixed(2)}m × {room.length.toFixed(2)}m • Wys. {room.height.toFixed(2)}m • Pow. {room.area.toFixed(2)} m²
            </div>
          </div>
        </div>

        {/* Photo Upload & Remodeling Mode Switcher */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {resolvedPhotoSrc ? (
            <div className="flex items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-lg">
              <button
                onClick={() => handleSwitchPhotoDisplayMode('3d_mesh')}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  photoDisplayMode === '3d_mesh'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Czysty model 3D bez podkładu zdjęcia"
              >
                <Box className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Model 3D</span>
              </button>
              <button
                onClick={() => handleSwitchPhotoDisplayMode('photo_overlay')}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  photoDisplayMode === 'photo_overlay'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Podkład Twojego zdjęcia z suwakiem przenikania projektu 3D"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Podkład AR</span>
              </button>
              <button
                onClick={() => handleSwitchPhotoDisplayMode('photo_wall')}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  photoDisplayMode === 'photo_wall'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Zdjęcie nałożone na tylną ścianę pokoju w 3D"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ściana Foto</span>
              </button>
              <button
                onClick={() => handleSwitchPhotoDisplayMode('split_compare')}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  photoDisplayMode === 'split_compare'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Interaktywny suwak porównania Przed i Po"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Przed / Po</span>
              </button>

              {/* Change Photo Buttons (Camera & File) */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressingPhoto}
                className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-2 py-1.5 text-[11px] text-slate-300 ml-1 transition"
                title="Zrób nowe zdjęcie aparatem"
              >
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden md:inline">Aparat</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressingPhoto}
                className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-2 py-1.5 text-[11px] text-slate-300 transition"
                title="Wybierz inne zdjęcie z galerii"
              >
                <img
                  src={resolvedPhotoSrc}
                  alt="Pokój"
                  className="w-4 h-4 rounded-xs object-cover border border-slate-600"
                />
                <span className="hidden md:inline">Zmień</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressingPhoto}
                className="flex items-center gap-1.5 rounded-2xl border border-teal-500/60 bg-gradient-to-r from-teal-600 to-cyan-700 hover:brightness-110 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition active:scale-95"
                title="Zrób zdjęcie pokoju aparatem telefonu i zobacz remont na żywo"
              >
                <Camera className="w-4 h-4 text-teal-200" />
                <span>{isCompressingPhoto ? 'Kompresja...' : 'Aparat'}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressingPhoto}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 shadow-lg backdrop-blur-md transition active:scale-95"
                title="Wgraj zdjęcie pokoju z dysku / galerii"
              >
                <UploadCloud className="w-4 h-4 text-teal-300" />
                <span>Z pliku</span>
              </button>
            </div>
          )}

          {/* Quick Remodel Toggle Button */}
          <button
            onClick={() => setShowQuickRemodel(!showQuickRemodel)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold backdrop-blur-md shadow-lg transition active:scale-95 ${
              showQuickRemodel
                ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            title="Otwórz panel szybkiej zmiany podłóg, ścian, mebli i światła"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Szybki Remont</span>
          </button>

          {/* Perspective Match Calibration Button */}
          <button
            onClick={() => setShowPerspectiveMatch(!showPerspectiveMatch)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold backdrop-blur-md shadow-lg transition active:scale-95 ${
              showPerspectiveMatch
                ? 'border-teal-400 bg-teal-500/20 text-teal-300'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Dopasuj wysokość kamery, kąt widzenia i perspektywę do Twojego zdjęcia pokoju"
          >
            <Crosshair className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Perspektywa</span>
          </button>

          {/* Floor BOM HUD Button */}
          <button
            onClick={() => setShowFloorBomHud(!showFloorBomHud)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold backdrop-blur-md shadow-lg transition active:scale-95 ${
              showFloorBomHud
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Przedmiar, naddatek ITB 10% i kosztorys posadzki"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Kosztorys</span>
          </button>
        </div>

        {/* View Angles Quick Switcher & Showcase button */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-lg">
            <button
              onClick={() => handleSetCameraView('isometric')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeCameraPreset === 'isometric'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Widok izometryczny 3D"
            >
              <span>Izometryczny</span>
            </button>
            <button
              onClick={() => handleSetCameraView('corner')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeCameraPreset === 'corner'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Narożnik 45°"
            >
              <span>Narożnik</span>
            </button>
            <button
              onClick={() => handleSetCameraView('eye_level')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeCameraPreset === 'eye_level'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Spacer wewnątrz na wysokości wzroku (1.65m)"
            >
              <span>Wnętrze (1.65m)</span>
            </button>
            <button
              onClick={() => handleSetCameraView('top_down')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeCameraPreset === 'top_down'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Rzut z góry (Top-Down)"
            >
              <span>Rzut z góry</span>
            </button>
          </div>

          {onOpenWalkthrough && (
            <button
              onClick={onOpenWalkthrough}
              className="flex items-center gap-1.5 rounded-2xl border border-teal-400/50 bg-gradient-to-r from-teal-500 to-cyan-600 hover:brightness-110 px-3 py-2 text-xs font-bold text-slate-950 backdrop-blur-md shadow-lg transition active:scale-95"
              title="Przejdź do wirtualnego spaceru pierwszoosobowego 3D"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spacer 3D</span>
            </button>
          )}

          {onOpenShowcase && (
            <button
              onClick={onOpenShowcase}
              className="flex items-center gap-1.5 rounded-2xl border border-teal-500/40 bg-teal-950/80 hover:bg-teal-900/90 px-3 py-2 text-xs font-bold text-teal-300 backdrop-blur-md shadow-lg transition active:scale-95"
              title="Otwórz pełnoekranowy tryb prezentacji dla inwestora / klienta"
            >
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Prezentacja</span>
            </button>
          )}
        </div>

      </div>

      {/* Szybki Remont w 3D - Floating Remodel Drawer */}
      {showQuickRemodel && (
        <div className="absolute bottom-20 left-4 right-4 z-40 pointer-events-auto rounded-3xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 max-h-[320px] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Szybki Remont w 3D — Natychmiastowa Metamorfoza
              </h4>
            </div>
            
            {/* Category Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setQuickRemodelTab('floors')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  quickRemodelTab === 'floors'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Posadzka ({FLOOR_PRESETS.length})
              </button>
              <button
                onClick={() => setQuickRemodelTab('walls')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  quickRemodelTab === 'walls'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ściany ({WALL_PRESETS.length})
              </button>
              <button
                onClick={() => setQuickRemodelTab('furniture')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  quickRemodelTab === 'furniture'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Mebel 3D ({QUICK_FURNITURE_ITEMS.length})
              </button>
              <button
                onClick={() => setQuickRemodelTab('light')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  quickRemodelTab === 'light'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Światło
              </button>
            </div>

            <button
              onClick={() => setShowQuickRemodel(false)}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Zamknij panel szybkiego remontu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab 1: Posadzka */}
          {quickRemodelTab === 'floors' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5">
                {FLOOR_PRESETS.map((p) => {
                  const isSelected = room.design.floorTexture === p.floorTexture || room.design.floorType === p.floorType;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectFloorPreset(p)}
                      className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition active:scale-95 ${
                        isSelected
                          ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-400/40'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl border border-white/20 mb-2 shadow-inner"
                        style={{ backgroundColor: p.previewColor }}
                      />
                      <span className="text-xs font-bold text-white leading-tight">{p.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{p.desc}</span>
                      {isSelected && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-teal-400 font-semibold">
                          <Check className="w-3 h-3" /> Aktywna
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Custom User Floor Swatch from Store */}
                {customFloorPhotoSrc ? (
                  <button
                    onClick={() => {
                      if (!onUpdateRoomDesign) return;
                      onUpdateRoomDesign(room.id, {
                        ...room.design,
                        floorType: 'Własny próbnik ze sklepu',
                      });
                    }}
                    className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition active:scale-95 ${
                      room.design.floorType === 'Własny próbnik ze sklepu'
                        ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-400/40'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <img
                      src={customFloorPhotoSrc}
                      alt="Własny próbnik"
                      className="w-10 h-10 rounded-xl border border-teal-400/50 mb-2 object-cover shadow-inner"
                    />
                    <span className="text-xs font-bold text-teal-300 leading-tight">Twój Próbnik</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Ze zdjęcia</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        floorSwatchInputRef.current?.click();
                      }}
                      className="mt-1 text-[10px] text-teal-400 underline hover:text-teal-300"
                    >
                      Zmień foto
                    </button>
                  </button>
                ) : (
                  <button
                    onClick={() => floorSwatchInputRef.current?.click()}
                    disabled={isUploadingSwatch}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-dashed border-teal-500/60 bg-teal-950/20 hover:bg-teal-900/30 text-center transition active:scale-95 group"
                    title="Zrób zdjęcie próbki paneli lub płytek w sklepie budowlanym i zobacz ją na podłodze 3D"
                  >
                    <div className="w-10 h-10 rounded-xl border border-teal-400/40 bg-teal-500/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition text-teal-300">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-teal-300 leading-tight">
                      {isUploadingSwatch ? 'Kompresja...' : '+ Próbnik ze sklepu'}
                    </span>
                    <span className="text-[10px] text-teal-400/80 mt-0.5">Foto płytki / paneli</span>
                  </button>
                )}
              </div>

              {/* Instant Floor-to-BOM HUD widget */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Przedmiar & Kosztorys Posadzki</span>
                      <span className="text-[10px] text-teal-300 bg-teal-950 border border-teal-800/80 px-1.5 py-0.5 rounded font-mono">
                        Norma ITB: +10% zapas na docinki
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span>Powierzchnia netto: <strong className="text-slate-200 font-mono">{(room.width * room.length).toFixed(2)} m²</strong></span>
                      <span>•</span>
                      <span>Zapas 10%: <strong className="text-teal-300 font-mono">{(room.width * room.length * 1.10).toFixed(2)} m²</strong></span>
                      <span>•</span>
                      <span>Opakowania: <strong className="text-white font-mono">{Math.ceil((room.width * room.length * 1.10) / 2.22)} paczek</strong> (~2.22 m²/op.)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Szacowany koszt materiału</div>
                    <div className="text-sm font-bold text-teal-300 font-mono">
                      ~{Math.round(room.width * room.length * 1.10 * 129).toLocaleString('pl-PL')} PLN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Ściany */}
          {quickRemodelTab === 'walls' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {WALL_PRESETS.map((w) => {
                const isSelected = room.design.wallTexture === w.wallTexture || room.design.wallType === w.wallType;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWallPreset(w)}
                    className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition active:scale-95 ${
                      isSelected
                        ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-400/40'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl border border-white/20 mb-2 shadow-inner"
                      style={{ backgroundColor: w.previewColor }}
                    />
                    <span className="text-xs font-bold text-white leading-tight">{w.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{w.desc}</span>
                    {isSelected && (
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-teal-400 font-semibold">
                        <Check className="w-3 h-3" /> Aktywna
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom User Wall Swatch from Store */}
              {customWallPhotoSrc ? (
                <button
                  onClick={() => {
                    if (!onUpdateRoomDesign) return;
                    onUpdateRoomDesign(room.id, {
                      ...room.design,
                      wallType: 'Własny próbnik ze sklepu',
                    });
                  }}
                  className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition active:scale-95 ${
                    room.design.wallType === 'Własny próbnik ze sklepu'
                      ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-400/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <img
                    src={customWallPhotoSrc}
                    alt="Własny próbnik ściany"
                    className="w-10 h-10 rounded-xl border border-teal-400/50 mb-2 object-cover shadow-inner"
                  />
                  <span className="text-xs font-bold text-teal-300 leading-tight">Twój Próbnik</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Ze zdjęcia</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      wallSwatchInputRef.current?.click();
                    }}
                    className="mt-1 text-[10px] text-teal-400 underline hover:text-teal-300"
                  >
                    Zmień foto
                  </button>
                </button>
              ) : (
                <button
                  onClick={() => wallSwatchInputRef.current?.click()}
                  disabled={isUploadingSwatch}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-dashed border-teal-500/60 bg-teal-950/20 hover:bg-teal-900/30 text-center transition active:scale-95 group"
                  title="Zrób zdjęcie próbki tapety, cegły lub farby i zobacz ją na ścianie 3D"
                >
                  <div className="w-10 h-10 rounded-xl border border-teal-400/40 bg-teal-500/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition text-teal-300">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-teal-300 leading-tight">
                    {isUploadingSwatch ? 'Kompresja...' : '+ Próbnik ze sklepu'}
                  </span>
                  <span className="text-[10px] text-teal-400/80 mt-0.5">Foto tapety / cegły</span>
                </button>
              )}
            </div>
          )}

          {/* Tab 3: Meble 3D */}
          {quickRemodelTab === 'furniture' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {QUICK_FURNITURE_ITEMS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleQuickAddFurniture(f)}
                  className="flex flex-col items-center p-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-teal-500/60 hover:bg-teal-950/20 text-center transition active:scale-95 group"
                >
                  <div
                    className="w-10 h-10 rounded-xl border border-white/20 mb-2 flex items-center justify-center shadow-inner group-hover:scale-105 transition"
                    style={{ backgroundColor: f.color }}
                  >
                    <Armchair className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-xs font-bold text-white leading-tight">{f.name}</span>
                  <span className="text-[10px] text-teal-400 mt-1 font-medium">+ Wstaw</span>
                </button>
              ))}
            </div>
          )}

          {/* Tab 4: Światło */}
          {quickRemodelTab === 'light' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { k: 2700, name: 'Ciepłe Przytulne (2700K)', desc: 'Idealne do salonu i sypialni, relaksująca złota barwa' },
                  { k: 4000, name: 'Neutralne Dzienne (4000K)', desc: 'Standard do pracy, kuchni i łazienki, naturalne oddawanie barw' },
                  { k: 6000, name: 'Chłodne Nowoczesne (6000K)', desc: 'Loftowy, nowoczesny styl, mocny kontrast detali' },
                ].map((lt) => {
                  const isSelected = (room.design.lightingTempK || 4000) === lt.k;
                  return (
                    <button
                      key={lt.k}
                      onClick={() => handleSelectLightTemp(lt.k)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition active:scale-95 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{lt.name}</span>
                          {isSelected && <span className="text-amber-400 text-[10px] font-mono">● Aktywne</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{lt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Window Light Direction controls */}
              <div className="mt-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <SunMedium className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Kierunek Okna & Słońca (dopasuj padanie cieni do Twojego zdjęcia):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { dir: 'left' as const, label: 'Okno po lewej', desc: 'Cienie padają w prawo' },
                    { dir: 'center' as const, label: 'Okno z tyłu', desc: 'Cienie padają do przodu' },
                    { dir: 'right' as const, label: 'Okno po prawej', desc: 'Cienie padają w lewo' },
                    { dir: 'front' as const, label: 'Światło od wejścia', desc: 'Cienie padają w głąb' },
                  ].map((d) => {
                    const isSel = windowLightDirection === d.dir;
                    return (
                      <button
                        key={d.dir}
                        onClick={() => setWindowLightDirection(d.dir)}
                        className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                          isSel
                            ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/40 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{d.label}</span>
                          {isSel && <span className="text-amber-400 text-[10px]">●</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asystent Kalibracji Perspektywy Zdjęcia */}
      {showPerspectiveMatch && (
        <div className="absolute bottom-20 right-4 left-4 sm:left-auto sm:w-[460px] z-40 pointer-events-auto rounded-3xl border border-teal-500/60 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 max-h-[460px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Kalibracja Perspektywy Zdjęcia
                </h4>
                <p className="text-[10px] text-slate-400">Dopasuj kamerę 3D do geometrii Twojego pokoju</p>
              </div>
            </div>
            <button
              onClick={() => setShowPerspectiveMatch(false)}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Zamknij asystenta kalibracji"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick 1-Click Presets */}
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Szybkie profile wysokości aparatu:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleApplyPerspectivePreset('eye_standing')}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-teal-500/60 hover:bg-teal-950/20 text-left transition text-xs"
              >
                <div className="font-bold text-white">🚶 Na stojąco</div>
                <div className="text-[10px] text-slate-400">Wys. 1.55m • FOV 65°</div>
              </button>
              <button
                onClick={() => handleApplyPerspectivePreset('sitting_couch')}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-teal-500/60 hover:bg-teal-950/20 text-left transition text-xs"
              >
                <div className="font-bold text-white">🛋️ Z Kanapy / Krzesła</div>
                <div className="text-[10px] text-slate-400">Wys. 1.10m • FOV 60°</div>
              </button>
              <button
                onClick={() => handleApplyPerspectivePreset('wide_corner')}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-teal-500/60 hover:bg-teal-950/20 text-left transition text-xs"
              >
                <div className="font-bold text-white">📐 Narożnik 0.5x</div>
                <div className="text-[10px] text-slate-400">Wys. 1.50m • Szeroki kąt 82°</div>
              </button>
              <button
                onClick={() => handleApplyPerspectivePreset('front_door')}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-teal-500/60 hover:bg-teal-950/20 text-left transition text-xs"
              >
                <div className="font-bold text-white">🚪 Z Progu Drzwi</div>
                <div className="text-[10px] text-slate-400">Wys. 1.60m • FOV 68°</div>
              </button>
            </div>
          </div>

          {/* Sliders for precise adjustment */}
          <div className="space-y-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
            {/* FOV (Kąt widzenia obiektywu) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Kąt obiektywu (FOV):</span>
                <span className="text-teal-400 font-mono font-bold">{cameraFov}°</span>
              </div>
              <input
                type="range"
                min="45"
                max="90"
                step="1"
                value={cameraFov}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCameraFov(val);
                  applyCameraPerspective(val, cameraHeightVal, cameraPitchVal, cameraYawVal, cameraDistVal);
                }}
                className="w-full accent-teal-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>Wąski (45°)</span>
                <span>Smartfon 1x (60°-68°)</span>
                <span>Szeroki 0.5x (82°-90°)</span>
              </div>
            </div>

            {/* Height (Wysokość trzymania telefonu) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Wysokość trzymania telefonu:</span>
                <span className="text-teal-400 font-mono font-bold">{cameraHeightVal.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.60"
                max="2.40"
                step="0.05"
                value={cameraHeightVal}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCameraHeightVal(val);
                  applyCameraPerspective(cameraFov, val, cameraPitchVal, cameraYawVal, cameraDistVal);
                }}
                className="w-full accent-teal-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
              />
            </div>

            {/* Pitch (Pochylenie w dół/górę) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Kąt pochylenia (Pitch):</span>
                <span className="text-teal-400 font-mono font-bold">{cameraPitchVal}°</span>
              </div>
              <input
                type="range"
                min="-35"
                max="20"
                step="1"
                value={cameraPitchVal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCameraPitchVal(val);
                  applyCameraPerspective(cameraFov, cameraHeightVal, val, cameraYawVal, cameraDistVal);
                }}
                className="w-full accent-teal-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
              />
            </div>

            {/* Yaw (Kąt obrotu wokół pokoju) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Kierunek patrzenia (Yaw):</span>
                <span className="text-teal-400 font-mono font-bold">{cameraYawVal}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="2"
                value={cameraYawVal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCameraYawVal(val);
                  applyCameraPerspective(cameraFov, cameraHeightVal, cameraPitchVal, val, cameraDistVal);
                }}
                className="w-full accent-teal-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Vanishing Lines Grid toggle */}
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">Siatka zbiegu perspektywy</div>
                <div className="text-[10px] text-slate-400">Linia horyzontu i linie zbiegu ścian</div>
              </div>
            </div>
            <button
              onClick={() => setShowVanishingGrid(!showVanishingGrid)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                showVanishingGrid
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {showVanishingGrid ? 'Włączona' : 'Wyłączona'}
            </button>
          </div>

          {/* Save Calibration Button */}
          {onUpdateRoomDesign && (
            <button
              onClick={handleSavePerspective}
              className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 ${
                hasSavedPerspective
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:brightness-110 text-slate-950'
              }`}
            >
              {hasSavedPerspective ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dopasowanie zapisane w projekcie!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Zapisz tę perspektywę dla pokoju</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Floating Floor BOM / Cost Estimate HUD Widget */}
      {showFloorBomHud && (
        <div className="absolute top-20 right-4 z-40 pointer-events-auto rounded-3xl border border-emerald-500/50 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 w-80">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Kosztorys Posadzki</h4>
                <p className="text-[10px] text-slate-400">{room.name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowFloorBomHud(false)}
              className="rounded-xl p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Wybrany materiał:</span>
              <span className="text-white font-bold">{room.design.floorType || 'Panele / Posadzka'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Powierzchnia netto:</span>
              <span className="text-slate-200 font-mono font-bold">{(room.width * room.length).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Zapas ITB (+10% docinki):</span>
              <span className="text-emerald-400 font-mono font-bold">{(room.width * room.length * 1.10).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Zapotrzebowanie paczek:</span>
              <span className="text-white font-mono font-bold">{Math.ceil((room.width * room.length * 1.10) / 2.22)} paczek</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-300 font-bold">Szacowany koszt:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ~{Math.round(room.width * room.length * 1.10 * 129).toLocaleString('pl-PL')} zł
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Toolbar: Lighting & Architectural Toggles */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Toolbar: Lighting Presets */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1.5 backdrop-blur-md shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1 hidden sm:inline">
            Światło:
          </span>
          <button
            onClick={() => setLightingPreset('day')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              lightingPreset === 'day'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Dzień</span>
          </button>
          <button
            onClick={() => setLightingPreset('sunset')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              lightingPreset === 'sunset'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sunset className="w-3.5 h-3.5 text-orange-400" />
            <span>Zmierzch</span>
          </button>
          <button
            onClick={() => setLightingPreset('night')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              lightingPreset === 'night'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Noc & LED</span>
          </button>
        </div>

        {/* Center/Right Toolbar: Visibility & Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1.5 backdrop-blur-md shadow-lg">
          
          {/* Cutaway Toggle */}
          <button
            onClick={() => setCutawayWalls(!cutawayWalls)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              cutawayWalls
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Przekrój architektoniczny (usuwa frontową ścianę)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Przekrój</span>
          </button>

          {/* Ceiling Toggle */}
          <button
            onClick={() => setShowCeiling(!showCeiling)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              showCeiling
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Włącz/wyłącz widoczność sufitu"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sufit</span>
          </button>

          {/* Bloom Emissive Glow Toggle */}
          <button
            onClick={() => setEnableBloom(!enableBloom)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              enableBloom
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Włącz realistyczny efekt poświaty optycznej Bloom"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Bloom</span>
          </button>

          {/* Auto Rotate Turntable */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Włącz płynny obrót kamery"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Obrót</span>
          </button>

          {/* Showcase / Presentation mode button */}
          {onOpenShowcase && (
            <button
              onClick={onOpenShowcase}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/60 px-3 py-1.5 text-xs font-semibold text-teal-300 shadow-sm hover:bg-teal-900/60 hover:text-white transition"
              title="Otwórz pełnoekranowy tryb prezentacji dla klienta"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prezentacja</span>
            </button>
          )}

          {/* Render Capture Snapshot */}
          <button
            onClick={handleCaptureSnapshot}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
            title="Pobierz wysokiej rozdzielczości render PNG wizualizacji"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Render...' : 'Render HD'}</span>
          </button>

          {/* 3D / AR Model Export */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
            title="Eksportuj model do formatu GLB / USDZ lub zobacz w AR (Rzeczywistość Rozszerzona)"
            data-testid="open-export-modal-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Eksport 3D / AR</span>
          </button>

        </div>

      </div>

      {/* Floating 3D Material Legend */}
      <div className="absolute top-20 right-4 hidden md:flex flex-col gap-2 pointer-events-auto">
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/85 p-3 backdrop-blur-md text-[11px] shadow-xl w-60">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-semibold">
            <span className="flex items-center gap-1.5 text-teal-400">
              <Palette className="w-3.5 h-3.5" />
              Materiały 3D w scenie
            </span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Podłoga:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[130px]" title={room.design.floorType}>
                {room.design.floorType}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ściany:</span>
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-white/20" 
                  style={{ backgroundColor: room.design.wallColor }} 
                />
                <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={room.design.wallType}>
                  {room.design.wallType}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Temperatura:</span>
              <span className="font-mono text-amber-300">
                {room.design.lightingTempK}K
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Model Export & AR QuickLook Modal */}
      <Export3DModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        room={room}
        getSceneObject={() => roomGroupRef.current}
      />

    </div>
  );
};
