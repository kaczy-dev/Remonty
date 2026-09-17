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
  Footprints
} from 'lucide-react';

interface Room3DViewerProps {
  room: Room;
  onUpdateRoomDesign?: (roomId: string, design: Room['design']) => void;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onDeleteFurniture?: (roomId: string, furnitureId: string) => void;
  className?: string;
  onOpenShowcase?: () => void;
  onOpenWalkthrough?: () => void;
}

type LightingPreset = 'day' | 'sunset' | 'night';
type CameraViewPreset = 'isometric' | 'eye_level' | 'top_down' | 'corner';

export const Room3DViewer: React.FC<Room3DViewerProps> = ({
  room,
  onUpdateRoomDesign,
  onUpdateFurniture,
  onDeleteFurniture,
  className = '',
  onOpenShowcase,
  onOpenWalkthrough,
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

  // Keep fresh props in refs for event listeners and animation loop
  const roomRef = useRef(room);
  const onUpdateFurnitureRef = useRef(onUpdateFurniture);

  useEffect(() => {
    roomRef.current = room;
    onUpdateFurnitureRef.current = onUpdateFurniture;
  }, [room, onUpdateFurniture]);

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
    controls.maxDistance = 25.0;
    controls.target.set(0, roomRef.current.height * 0.45, 0);
    controlsRef.current = controls;

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

    const gridHelper = new THREE.GridHelper(24, 24, '#1e293b', '#0f172a');
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

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

      if (enableBloom && composerRef.current) {
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
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [enableBloom]);

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

    if (lightingPreset === 'day') {
      // Natural Daylight
      const ambientLight = new THREE.AmbientLight('#dbeafe', 0.65);
      lightsGroup.add(ambientLight);

      // Sun Directional Light through window
      const sun = new THREE.DirectionalLight('#fffbeb', 1.8);
      sun.position.set(w * 1.5, h * 1.8, l * 1.2);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 40;
      sun.shadow.camera.left = -w * 1.8;
      sun.shadow.camera.right = w * 1.8;
      sun.shadow.camera.top = h * 2.2;
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
      sunsetSun.position.set(w * 2, h * 0.8, l * 1.8);
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
  }, [lightingPreset, roomW, roomL, roomH, lightingTempK]);

  // Rebuild 3D Room Geometry & Furnishings
  useEffect(() => {
    const roomGroup = roomGroupRef.current;
    if (!roomGroup) return;

    // Clean previous room geometry
    while (roomGroup.children.length > 0) {
      const child = roomGroup.children[0];
      roomGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    const { width: W, length: L, height: H } = room;
    const halfW = W / 2;
    const halfL = L / 2;

    // --- 1. FLOOR ---
    let floorTexture: THREE.CanvasTexture;
    const floorTypeStr = (room.design.floorType || '').toLowerCase();
    const explicitFloorTexture = room.design.floorTexture;
    const floorColor = room.design.floorColor || '#b48256';
    const floorRoughness = room.design.floorRoughness !== undefined ? room.design.floorRoughness : 0.32;

    if (explicitFloorTexture === 'herringbone' || (!explicitFloorTexture && (floorTypeStr.includes('jodeł') || floorTypeStr.includes('dąb') || floorTypeStr.includes('panel')))) {
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

    const floorGeo = new THREE.BoxGeometry(W, 0.08, L);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: floorRoughness,
      metalness: floorRoughness < 0.2 ? 0.15 : 0.04,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.04, 0);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

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

    let wallTex: THREE.CanvasTexture | undefined;
    if (explicitWallTexture === 'brick' || (!explicitWallTexture && wallTypeStr.includes('cegła'))) {
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
    const backWallGeo = new THREE.BoxGeometry(W + wallThick * 2, H, wallThick);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, H / 2, -halfL - wallThick / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    roomGroup.add(backWall);

    // Left Wall with Window Cutout
    // We create left wall with a clean architectural window opening
    const windowW = Math.min(1.6, L * 0.45);
    const windowH = Math.min(1.4, H * 0.55);
    const windowBottom = 0.85;

    // Solid wall section before window
    const lwL1 = (L - windowW) / 2;
    const leftWallPart1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, lwL1), wallMat);
    leftWallPart1.position.set(-halfW - wallThick / 2, H / 2, -halfL + lwL1 / 2);
    leftWallPart1.receiveShadow = true;
    leftWallPart1.castShadow = true;
    roomGroup.add(leftWallPart1);

    const leftWallPart2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, lwL1), wallMat);
    leftWallPart2.position.set(-halfW - wallThick / 2, H / 2, halfL - lwL1 / 2);
    leftWallPart2.receiveShadow = true;
    leftWallPart2.castShadow = true;
    roomGroup.add(leftWallPart2);

    // Below window (parapet wall)
    const leftWallBelow = new THREE.Mesh(new THREE.BoxGeometry(wallThick, windowBottom, windowW), wallMat);
    leftWallBelow.position.set(-halfW - wallThick / 2, windowBottom / 2, 0);
    leftWallBelow.receiveShadow = true;
    leftWallBelow.castShadow = true;
    roomGroup.add(leftWallBelow);

    // Above window (nadproże)
    const topH = H - (windowBottom + windowH);
    if (topH > 0) {
      const leftWallAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, topH, windowW), wallMat);
      leftWallAbove.position.set(-halfW - wallThick / 2, H - topH / 2, 0);
      leftWallAbove.receiveShadow = true;
      leftWallAbove.castShadow = true;
      roomGroup.add(leftWallAbove);
    }

    // Window Frame & Glass
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

    // Glass pane
    const glassMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, windowH - 0.08, windowW - 0.08),
      glassMat
    );
    glassMesh.position.set(-halfW - wallThick / 2, windowBottom + windowH / 2, 0);
    roomGroup.add(glassMesh);

    // Window mullions (ramy i szprosy)
    const windowFrameOuter = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick + 0.04, 0.05, windowW),
      frameMat
    );
    windowFrameOuter.position.set(-halfW - wallThick / 2, windowBottom, 0);
    roomGroup.add(windowFrameOuter);

    // Windowsill (parapet dębowy)
    const parapetGeo = new THREE.BoxGeometry(wallThick + 0.1, 0.035, windowW + 0.12);
    const parapetMat = new THREE.MeshStandardMaterial({
      color: '#d4a373',
      roughness: 0.35,
    });
    const parapet = new THREE.Mesh(parapetGeo, parapetMat);
    parapet.position.set(-halfW - wallThick / 2 + 0.04, windowBottom, 0);
    parapet.castShadow = true;
    roomGroup.add(parapet);

    // Right Wall with Door
    const doorW = 0.9;
    const doorH = 2.1;
    const rwL1 = (L - doorW) / 2;

    const rightWallPart1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, rwL1), wallMat);
    rightWallPart1.position.set(halfW + wallThick / 2, H / 2, -halfL + rwL1 / 2);
    rightWallPart1.receiveShadow = true;
    rightWallPart1.castShadow = true;
    roomGroup.add(rightWallPart1);

    const rightWallPart2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, rwL1), wallMat);
    rightWallPart2.position.set(halfW + wallThick / 2, H / 2, halfL - rwL1 / 2);
    rightWallPart2.receiveShadow = true;
    rightWallPart2.castShadow = true;
    roomGroup.add(rightWallPart2);

    const rightWallAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H - doorH, doorW), wallMat);
    rightWallAbove.position.set(halfW + wallThick / 2, doorH + (H - doorH) / 2, 0);
    rightWallAbove.receiveShadow = true;
    rightWallAbove.castShadow = true;
    roomGroup.add(rightWallAbove);

    // Door leaf & handle
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.4,
    });
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH - 0.02, doorW - 0.04), doorMat);
    doorLeaf.position.set(halfW + wallThick / 2, doorH / 2, 0);
    doorLeaf.castShadow = true;
    roomGroup.add(doorLeaf);

    // Door handle (Klamka chrom)
    const handleMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.95,
      roughness: 0.15,
    });
    const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), handleMat);
    handleMesh.position.set(halfW + wallThick / 2 - 0.03, 1.05, doorW * 0.35);
    roomGroup.add(handleMesh);

    // Front Wall (Sectioned or semi-transparent in cutaway)
    if (!cutawayWalls) {
      const frontWallGeo = new THREE.BoxGeometry(W + wallThick * 2, H, wallThick);
      const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
      frontWall.position.set(0, H / 2, halfL + wallThick / 2);
      frontWall.receiveShadow = true;
      roomGroup.add(frontWall);
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

  }, [room, showCeiling, cutawayWalls]);

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

  // High-Resolution Snapshot Capture
  const handleCaptureSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    setIsExporting(true);
    renderer.render(scene, camera);

    setTimeout(() => {
      try {
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `RenovAI-3D-${room.name.replace(/\s+/g, '_')}-${Date.now()}.png`;
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
    <div className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      
      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="w-full h-[540px] sm:h-[620px] cursor-grab active:cursor-grabbing outline-hidden"
      />

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
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
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

    </div>
  );
};
