'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
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
  kelvinToHex,
} from '@/lib/procedural-textures';
import { create3DFurnitureMesh } from '@/lib/furniture3d-builder';
import {
  Footprints,
  Compass,
  Flashlight,
  Maximize2,
  Minimize2,
  Camera,
  Sun,
  Moon,
  Sunset,
  Move,
  RotateCcw,
  RotateCw,
  Eye,
  Info,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Zap,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface RoomWalkthrough3DProps {
  room: Room;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onConsultAI?: (prompt: string) => void;
  onClose?: () => void;
  className?: string;
  isModal?: boolean;
}

type LightingMode = 'day' | 'sunset' | 'night';

interface Hotspot {
  id: string;
  label: string;
  x: number; // percentage in room (0-100)
  z: number;
  rotY: number; // facing angle in radians
}

export const RoomWalkthrough3D: React.FC<RoomWalkthrough3DProps> = ({
  room,
  onUpdateFurniture,
  onConsultAI,
  onClose,
  className = '',
  isModal = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const roomGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const flashlightRef = useRef<THREE.SpotLight | null>(null);

  // Player Walkthrough State Refs
  const playerPos = useRef(new THREE.Vector3(0, 1.68, 0));
  const playerYaw = useRef<number>(0); // radians around Y
  const playerPitch = useRef<number>(0); // radians up/down (-80 deg to +80 deg)
  const isCrouching = useRef<boolean>(false);
  const isSprinting = useRef<boolean>(false);
  const headBobOffset = useRef<number>(0);
  const walkDistanceAccum = useRef<number>(0);

  // Key input tracking
  const keysDown = useRef<Record<string, boolean>>({});
  const isPointerLocked = useRef<boolean>(false);
  const isDraggingLook = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // UI States
  const [lighting, setLighting] = useState<LightingMode>('day');
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [crouchActive, setCrouchActive] = useState<boolean>(false);
  const [sprintActive, setSprintActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  // Real-time inspected furniture or outlet nearby
  const [nearbyItem, setNearbyItem] = useState<{
    type: 'furniture' | 'outlet';
    name: string;
    details: string;
    distanceM: number;
    clearanceOk: boolean;
  } | null>(null);

  // Player coordinates for React state (Minimap rendering)
  const [playerCoords, setPlayerCoords] = useState<{ xPct: number; zPct: number; angleDeg: number }>({
    xPct: 50,
    zPct: 50,
    angleDeg: 0,
  });

  const roomW = Math.max(1, room.width);
  const roomL = Math.max(1, room.length);
  const roomH = Math.max(2.2, room.height);

  // Generate dynamic hotspots according to room layout
  const hotspots: Hotspot[] = [
    {
      id: 'entrance',
      label: 'Wejście (Próg)',
      x: 85,
      z: 50,
      rotY: Math.PI * 0.9,
    },
    {
      id: 'center',
      label: 'Środek pokoju',
      x: 50,
      z: 50,
      rotY: 0,
    },
    {
      id: 'window',
      label: 'Przy oknie',
      x: 20,
      z: 50,
      rotY: Math.PI * 0.5,
    },
    {
      id: 'corner-sw',
      label: 'Narożnik południowy',
      x: 20,
      z: 80,
      rotY: -Math.PI * 0.25,
    },
    {
      id: 'corner-ne',
      label: 'Narożnik północny',
      x: 80,
      z: 20,
      rotY: Math.PI * 0.75,
    },
  ];

  // Initialize Initial Player Position (entrance)
  useEffect(() => {
    const halfW = roomW / 2;
    const halfL = roomL / 2;
    // Start slightly inside door
    playerPos.current.set(halfW * 0.65, 1.68, halfL * 0.45);
    playerYaw.current = Math.PI * 0.85; // looking back into the room
    playerPitch.current = -0.05;
  }, [roomW, roomL]);

  // Teleport Player to a Hotspot or Coordinates
  const teleportTo = useCallback(
    (xPct: number, zPct: number, facingRotY?: number) => {
      const halfW = roomW / 2;
      const halfL = roomL / 2;
      const targetX = -halfW + (xPct / 100) * roomW;
      const targetZ = -halfL + (zPct / 100) * roomL;

      // Wall boundary clamping
      const margin = 0.4;
      const clampedX = Math.max(-halfW + margin, Math.min(halfW - margin, targetX));
      const clampedZ = Math.max(-halfL + margin, Math.min(halfL - margin, targetZ));

      playerPos.current.x = clampedX;
      playerPos.current.z = clampedZ;

      if (facingRotY !== undefined) {
        playerYaw.current = facingRotY;
        playerPitch.current = 0;
      }
    },
    [roomW, roomL]
  );

  // Toggle Flashlight
  const handleToggleFlashlight = useCallback(() => {
    setIsFlashlightOn((prev) => {
      const next = !prev;
      if (flashlightRef.current) {
        flashlightRef.current.intensity = next ? 2.5 : 0;
      }
      return next;
    });
  }, []);

  // Set up Three.js Scene & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0f1d');
    sceneRef.current = scene;

    // 2. Camera: Perspective with human FOV (75 degrees for natural interior perspective)
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.05, 100);
    camera.position.copy(playerPos.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High-Precision Shadows & Tone Mapping
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
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights Container
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 5. Room Structure & Furnishings Container
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;

    // 6. Architectural Player-Mounted Flashlight (SpotLight attached to camera)
    const flashlight = new THREE.SpotLight('#ffffff', isFlashlightOn ? 2.5 : 0, 12, Math.PI / 5, 0.45, 1.2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    flashlight.shadow.bias = -0.001;
    scene.add(flashlight);
    scene.add(flashlight.target);
    flashlightRef.current = flashlight;

    // 7. Event Listeners for Look & Movement
    const domElement = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      // Allow drag-look on click
      isDraggingLook.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingLook.current && !isPointerLocked.current) return;

      let movementX = e.movementX;
      let movementY = e.movementY;

      if (!isPointerLocked.current) {
        movementX = e.clientX - lastMousePos.current.x;
        movementY = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      const sensitivity = 0.0035;
      playerYaw.current -= movementX * sensitivity;
      playerPitch.current -= movementY * sensitivity;

      // Clamp pitch so player cannot flip upside down (-85 deg to +85 deg)
      const maxPitch = (Math.PI / 2) * 0.92;
      playerPitch.current = Math.max(-maxPitch, Math.min(maxPitch, playerPitch.current));
    };

    const handlePointerUp = () => {
      isDraggingLook.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current[key] = true;

      if (key === 'c') {
        // Toggle Crouch
        isCrouching.current = !isCrouching.current;
        setCrouchActive(isCrouching.current);
      } else if (key === 'f') {
        // Toggle Flashlight
        handleToggleFlashlight();
      } else if (key === 'shift') {
        isSprinting.current = true;
        setSprintActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current[key] = false;

      if (key === 'shift') {
        isSprinting.current = false;
        setSprintActive(false);
      }
    };

    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 8. Animation & Physics Simulation Loop (60 FPS)
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // A. Keyboard & Navigation Movement vectors
      const forward = new THREE.Vector3(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current)).negate();
      const right = new THREE.Vector3(Math.cos(playerYaw.current), 0, -Math.sin(playerYaw.current));

      const moveDir = new THREE.Vector3(0, 0, 0);

      // WASD / Arrow Keys
      if (keysDown.current['w'] || keysDown.current['arrowup']) moveDir.add(forward);
      if (keysDown.current['s'] || keysDown.current['arrowdown']) moveDir.sub(forward);
      if (keysDown.current['d'] || keysDown.current['arrowright']) moveDir.add(right);
      if (keysDown.current['a'] || keysDown.current['arrowleft']) moveDir.sub(right);

      // Turn keys Q & E
      if (keysDown.current['q']) playerYaw.current += 1.8 * deltaSec;
      if (keysDown.current['e']) playerYaw.current -= 1.8 * deltaSec;

      const isMoving = moveDir.lengthSq() > 0.001;

      if (isMoving) {
        moveDir.normalize();

        const baseSpeed = isCrouching.current ? 0.9 : isSprinting.current ? 3.0 : 1.75;
        const moveDist = baseSpeed * deltaSec;
        const proposedPos = playerPos.current.clone().addScaledVector(moveDir, moveDist);

        // B. Collision Detection with Walls (Boundary constraints)
        const halfW = roomW / 2;
        const halfL = roomL / 2;
        const playerRadius = 0.35; // 35 cm personal bounding radius

        let nextX = proposedPos.x;
        let nextZ = proposedPos.z;

        // Slide along walls
        nextX = Math.max(-halfW + playerRadius, Math.min(halfW - playerRadius, nextX));
        nextZ = Math.max(-halfL + playerRadius, Math.min(halfL - playerRadius, nextZ));

        // C. Collision Avoidance with Furniture Objects
        if (room.furniture && room.furniture.length > 0) {
          for (const item of room.furniture) {
            const furnX = -halfW + (item.x / 100) * roomW;
            const furnZ = -halfL + (item.y / 100) * roomL;

            // Approximate footprint radius based on item dimensions
            const itemW = Math.max(0.4, (item.width / 100) * roomW || 0.8);
            const itemL = Math.max(0.4, (item.height / 100) * roomL || 0.8);
            const itemRadius = Math.hypot(itemW, itemL) * 0.42;

            const dist = Math.hypot(nextX - furnX, nextZ - furnZ);
            const minDist = playerRadius + itemRadius;

            if (dist < minDist) {
              // Push player back gently out of furniture bounding cylinder
              const pushAngle = Math.atan2(nextZ - furnZ, nextX - furnX);
              nextX = furnX + Math.cos(pushAngle) * minDist;
              nextZ = furnZ + Math.sin(pushAngle) * minDist;

              // Re-clamp against walls after push
              nextX = Math.max(-halfW + playerRadius, Math.min(halfW - playerRadius, nextX));
              nextZ = Math.max(-halfL + playerRadius, Math.min(halfL - playerRadius, nextZ));
            }
          }
        }

        playerPos.current.x = nextX;
        playerPos.current.z = nextZ;

        // D. Subtle Head-bobbing
        walkDistanceAccum.current += moveDist;
        headBobOffset.current = Math.sin(walkDistanceAccum.current * 7.5) * (isSprinting.current ? 0.035 : 0.02);
      } else {
        // Return head bob to rest
        headBobOffset.current = THREE.MathUtils.lerp(headBobOffset.current, 0, 0.1);
      }

      // Target Eye Height (1.68m standing, 1.10m crouching)
      const targetEyeY = (isCrouching.current ? 1.1 : 1.68) + headBobOffset.current;
      playerPos.current.y = THREE.MathUtils.lerp(playerPos.current.y, targetEyeY, 0.15);

      // E. Update Camera Position & Rotation
      camera.position.copy(playerPos.current);

      const lookTarget = new THREE.Vector3(
        camera.position.x - Math.sin(playerYaw.current) * Math.cos(playerPitch.current),
        camera.position.y + Math.sin(playerPitch.current),
        camera.position.z - Math.cos(playerYaw.current) * Math.cos(playerPitch.current)
      );
      camera.lookAt(lookTarget);

      // F. Update Player-Mounted Flashlight Position & Direction
      if (flashlightRef.current) {
        flashlightRef.current.position.copy(camera.position);
        flashlightRef.current.position.addScaledVector(right, 0.15); // right shoulder mount
        flashlightRef.current.target.position.copy(lookTarget);
      }

      // G. Real-time Proximity Check (Nearest Furniture / Outlet to HUD)
      const curX = playerPos.current.x;
      const curZ = playerPos.current.z;
      const halfW = roomW / 2;
      const halfL = roomL / 2;

      let nearest: {
        type: 'furniture' | 'outlet';
        name: string;
        details: string;
        distanceM: number;
        clearanceOk: boolean;
      } | null = null;
      let minDis = 1.6; // proximity threshold 1.6 meters

      // Check furniture
      if (room.furniture) {
        for (const item of room.furniture) {
          const fx = -halfW + (item.x / 100) * roomW;
          const fz = -halfL + (item.y / 100) * roomL;
          const d = Math.hypot(curX - fx, curZ - fz);
          if (d < minDis) {
            minDis = d;
            nearest = {
              type: 'furniture',
              name: item.name,
              details: `Wymiary: ${item.width}×${item.height} cm • Kąt: ${item.rotation || 0}°`,
              distanceM: Math.round(d * 100) / 100,
              clearanceOk: d >= 0.6,
            };
          }
        }
      }

      // Check outlets
      if (room.outlets) {
        for (const out of room.outlets) {
          const ox = -halfW + (out.x / 100) * roomW;
          const oz = -halfL + (out.y / 100) * roomL;
          const d = Math.hypot(curX - ox, curZ - oz);
          if (d < minDis) {
            minDis = d;
            nearest = {
              type: 'outlet',
              name: out.label,
              details: `Punkt instalacyjny: ${out.type === 'socket' ? 'Gniazdo 230V' : 'Włącznik oświetlenia'} • wys. 35cm`,
              distanceM: Math.round(d * 100) / 100,
              clearanceOk: true,
            };
          }
        }
      }

      setNearbyItem(nearest);

      // H. Update React coordinates for Minimap (Throttled update)
      const curXPct = Math.max(0, Math.min(100, ((curX + halfW) / roomW) * 100));
      const curZPct = Math.max(0, Math.min(100, ((curZ + halfL) / roomL) * 100));
      const angleDegrees = (((-playerYaw.current * 180) / Math.PI) % 360 + 360) % 360;

      setPlayerCoords({
        xPct: Math.round(curXPct * 10) / 10,
        zPct: Math.round(curZPct * 10) / 10,
        angleDeg: Math.round(angleDegrees),
      });

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [roomW, roomL, roomH, room.furniture, room.outlets, isFlashlightOn, handleToggleFlashlight]);

  // Rebuild Lighting based on Mode
  useEffect(() => {
    const lightsGroup = lightsGroupRef.current;
    if (!lightsGroup) return;

    while (lightsGroup.children.length > 0) {
      lightsGroup.remove(lightsGroup.children[0]);
    }

    const lightColorHex = kelvinToHex(room.design.lightingTempK || 4000);

    if (lighting === 'day') {
      // Natural Daylight streaming through window
      const ambient = new THREE.AmbientLight('#dbeafe', 0.65);
      lightsGroup.add(ambient);

      const sun = new THREE.DirectionalLight('#fffbeb', 1.8);
      sun.position.set(roomW * 1.5, roomH * 1.7, roomL * 1.2);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.bias = -0.0005;
      lightsGroup.add(sun);

      const bounce = new THREE.HemisphereLight('#f8fafc', '#1e293b', 0.45);
      lightsGroup.add(bounce);
    } else if (lighting === 'sunset') {
      // Golden hour sunset glow
      const ambient = new THREE.AmbientLight('#fdba74', 0.4);
      lightsGroup.add(ambient);

      const sunsetSun = new THREE.DirectionalLight('#fb923c', 2.0);
      sunsetSun.position.set(roomW * 2, roomH * 0.9, roomL * 1.5);
      sunsetSun.castShadow = true;
      lightsGroup.add(sunsetSun);

      // Warm interior pendant assist
      const ceilingSpot = new THREE.PointLight(lightColorHex, 1.4, 12);
      ceilingSpot.position.set(0, roomH * 0.9, 0);
      ceilingSpot.castShadow = true;
      lightsGroup.add(ceilingSpot);
    } else {
      // Night Mode: Realistic Ceiling Fixtures & LED Cove
      const nightAmbient = new THREE.AmbientLight('#0f172a', 0.22);
      lightsGroup.add(nightAmbient);

      const mainLight = new THREE.PointLight(lightColorHex, 2.6, 14);
      mainLight.position.set(0, roomH * 0.9, 0);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      lightsGroup.add(mainLight);

      // Warm perimeter LED strip
      const ledStrip = new THREE.RectAreaLight(lightColorHex, 3.0, roomW * 0.8, 0.2);
      ledStrip.position.set(0, roomH * 0.96, -roomL * 0.45);
      ledStrip.rotation.x = Math.PI / 2;
      lightsGroup.add(ledStrip);
    }
  }, [lighting, roomW, roomL, roomH, room.design.lightingTempK]);

  // Build Full 3D Room Enclosure, Windows, Doors, Materials & Furniture
  useEffect(() => {
    const roomGroup = roomGroupRef.current;
    if (!roomGroup) return;

    while (roomGroup.children.length > 0) {
      const c = roomGroup.children[0];
      roomGroup.remove(c);
      if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
    }

    const W = roomW;
    const L = roomL;
    const H = roomH;
    const halfW = W / 2;
    const halfL = L / 2;

    // 1. FLOOR with Procedural Texture
    let floorTexture: THREE.CanvasTexture;
    const floorTypeStr = (room.design.floorType || '').toLowerCase();
    const explicitFloorTexture = room.design.floorTexture;
    const floorColor = room.design.floorColor || '#b48256';

    if (
      explicitFloorTexture === 'herringbone' ||
      (!explicitFloorTexture && (floorTypeStr.includes('jodeł') || floorTypeStr.includes('dąb')))
    ) {
      floorTexture = createWoodTexture('herringbone', floorColor);
    } else if (explicitFloorTexture === 'marble' || (!explicitFloorTexture && floorTypeStr.includes('marmur'))) {
      floorTexture = createMarbleTexture(floorColor);
    } else if (explicitFloorTexture === 'terrazzo' || (!explicitFloorTexture && floorTypeStr.includes('lastryko'))) {
      floorTexture = createTerrazzoTexture(floorColor);
    } else if (explicitFloorTexture === 'microcement' || (!explicitFloorTexture && floorTypeStr.includes('beton'))) {
      floorTexture = createMicrocementTexture(floorColor);
    } else if (explicitFloorTexture === 'tiles' || (!explicitFloorTexture && floorTypeStr.includes('płytki'))) {
      floorTexture = createTileTexture(floorColor);
    } else {
      floorTexture = createWoodTexture('plank', floorColor);
    }

    const floorGeo = new THREE.BoxGeometry(W, 0.08, L);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: room.design.floorRoughness !== undefined ? room.design.floorRoughness : 0.35,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.04, 0);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // 2. CEILING (Solid enclosed for true first-person walk experience)
    const ceilingGeo = new THREE.BoxGeometry(W, 0.08, L);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: room.design.ceilingColor || '#ffffff',
      roughness: 0.88,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, H + 0.04, 0);
    ceilingMesh.receiveShadow = true;
    roomGroup.add(ceilingMesh);

    // Modern flush ceiling spots / track lights
    const trackRail = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.65, 0.03, 0.04),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.2 })
    );
    trackRail.position.set(0, H - 0.04, 0);
    roomGroup.add(trackRail);

    for (let i = -1; i <= 1; i++) {
      const spot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.09, 16),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8 })
      );
      spot.position.set(i * (W * 0.22), H - 0.09, 0);
      roomGroup.add(spot);

      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 16),
        new THREE.MeshBasicMaterial({ color: '#fef08a' })
      );
      lens.position.set(i * (W * 0.22), H - 0.136, 0);
      lens.rotation.x = Math.PI / 2;
      roomGroup.add(lens);
    }

    // 3. WALLS & BASEBOARDS
    const wallThick = 0.16;
    const wallColor = room.design.wallColor || '#f8fafc';
    const wallTypeStr = (room.design.wallType || '').toLowerCase();
    const explicitWallTexture = room.design.wallTexture;

    let wallTex: THREE.CanvasTexture | undefined;
    if (explicitWallTexture === 'brick' || (!explicitWallTexture && wallTypeStr.includes('cegła'))) {
      wallTex = createBrickTexture(wallColor);
    } else if (explicitWallTexture === 'slats' || (!explicitWallTexture && wallTypeStr.includes('lamele'))) {
      wallTex = createWoodSlatsTexture(wallColor);
    } else if (explicitWallTexture === 'concrete_panels' || (!explicitWallTexture && wallTypeStr.includes('beton'))) {
      wallTex = createConcretePanelsTexture(wallColor);
    } else if (explicitWallTexture === 'subway_tiles' || (!explicitWallTexture && wallTypeStr.includes('metro'))) {
      wallTex = createSubwayTileTexture(wallColor);
    } else if (explicitWallTexture === 'stucco' || (!explicitWallTexture && wallTypeStr.includes('tynk'))) {
      wallTex = createStuccoTexture(wallColor);
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallTex ? undefined : wallColor,
      map: wallTex,
      roughness: room.design.wallRoughness !== undefined ? room.design.wallRoughness : 0.85,
      side: THREE.DoubleSide,
    });

    // Baseboards (Listwy przypodłogowe 8cm MDF białe)
    const baseboardH = 0.08;
    const baseboardT = 0.016;
    const bbMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });

    const addBB = (len: number, pos: [number, number, number], rotY: number = 0) => {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(len, baseboardH, baseboardT), bbMat);
      bb.position.set(...pos);
      bb.rotation.y = rotY;
      bb.castShadow = true;
      roomGroup.add(bb);
    };

    // North Wall (Back)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(W + wallThick * 2, H, wallThick), wallMat);
    northWall.position.set(0, H / 2, -halfL - wallThick / 2);
    northWall.receiveShadow = true;
    roomGroup.add(northWall);
    addBB(W, [0, baseboardH / 2, -halfL + baseboardT / 2]);

    // South Wall (Front)
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(W + wallThick * 2, H, wallThick), wallMat);
    southWall.position.set(0, H / 2, halfL + wallThick / 2);
    southWall.receiveShadow = true;
    roomGroup.add(southWall);
    addBB(W, [0, baseboardH / 2, halfL - baseboardT / 2]);

    // West Wall with Architectural Window Opening
    const windowW = Math.min(1.8, L * 0.45);
    const windowH = Math.min(1.4, H * 0.55);
    const windowBottom = 0.85;
    const lwL1 = (L - windowW) / 2;

    const westWall1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, lwL1), wallMat);
    westWall1.position.set(-halfW - wallThick / 2, H / 2, -halfL + lwL1 / 2);
    roomGroup.add(westWall1);

    const westWall2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, lwL1), wallMat);
    westWall2.position.set(-halfW - wallThick / 2, H / 2, halfL - lwL1 / 2);
    roomGroup.add(westWall2);

    const westWallBelow = new THREE.Mesh(new THREE.BoxGeometry(wallThick, windowBottom, windowW), wallMat);
    westWallBelow.position.set(-halfW - wallThick / 2, windowBottom / 2, 0);
    roomGroup.add(westWallBelow);

    const topH = H - (windowBottom + windowH);
    if (topH > 0) {
      const westWallAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, topH, windowW), wallMat);
      westWallAbove.position.set(-halfW - wallThick / 2, H - topH / 2, 0);
      roomGroup.add(westWallAbove);
    }

    // Window Glass Pane & Frame
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#c7d2fe',
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      transmission: 0.85,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, windowH - 0.06, windowW - 0.06), glassMat);
    glass.position.set(-halfW - wallThick / 2, windowBottom + windowH / 2, 0);
    roomGroup.add(glass);

    // Windowsill
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick + 0.1, 0.035, windowW + 0.12),
      new THREE.MeshStandardMaterial({ color: '#d4a373', roughness: 0.35 })
    );
    parapet.position.set(-halfW - wallThick / 2 + 0.04, windowBottom, 0);
    roomGroup.add(parapet);

    // East Wall with Entrance Door
    const doorW = 0.9;
    const doorH = 2.1;
    const rwL1 = (L - doorW) / 2;

    const eastWall1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, rwL1), wallMat);
    eastWall1.position.set(halfW + wallThick / 2, H / 2, -halfL + rwL1 / 2);
    roomGroup.add(eastWall1);

    const eastWall2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, rwL1), wallMat);
    eastWall2.position.set(halfW + wallThick / 2, H / 2, halfL - rwL1 / 2);
    roomGroup.add(eastWall2);

    const eastWallAbove = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H - doorH, doorW), wallMat);
    eastWallAbove.position.set(halfW + wallThick / 2, doorH + (H - doorH) / 2, 0);
    roomGroup.add(eastWallAbove);

    // Door Leaf & Modern Chrome Handle
    const doorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, doorH - 0.02, doorW - 0.04),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4 })
    );
    doorLeaf.position.set(halfW + wallThick / 2, doorH / 2, 0);
    doorLeaf.castShadow = true;
    roomGroup.add(doorLeaf);

    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.12),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.95, roughness: 0.15 })
    );
    doorHandle.position.set(halfW + wallThick / 2 - 0.03, 1.05, doorW * 0.35);
    roomGroup.add(doorHandle);

    // 4. ELECTRICAL OUTLETS (3D Sockets & Switches on Walls)
    if (room.outlets && room.outlets.length > 0) {
      const socketMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 });
      room.outlets.forEach((out) => {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.015), socketMat);
        const wallX = -halfW + (out.x / 100) * W;
        plate.position.set(wallX, 0.35, -halfL + 0.01);
        roomGroup.add(plate);

        const ledIndicator = new THREE.Mesh(
          new THREE.SphereGeometry(0.005, 8, 8),
          new THREE.MeshBasicMaterial({ color: out.type === 'socket' ? '#22c55e' : '#0ea5e9' })
        );
        ledIndicator.position.set(wallX, 0.35, -halfL + 0.02);
        roomGroup.add(ledIndicator);
      });
    }

    // 5. IMPORTED 3D FURNITURE (Exact coordinates, sizes, rotations & materials)
    if (room.furniture && room.furniture.length > 0) {
      room.furniture.forEach((item) => {
        const meshGroup = create3DFurnitureMesh(item, W, L);
        roomGroup.add(meshGroup);
      });
    }

    // 6. Architectural Accent Plant (Potted Monstera)
    const plantGroup = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.42, 24),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    pot.position.set(0, 0.21, 0);
    pot.castShadow = true;
    plantGroup.add(pot);

    const leafMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.3, side: THREE.DoubleSide });
    for (let l = 0; l < 6; l++) {
      const angle = (l * Math.PI * 2) / 6;
      const leafGeo = new THREE.SphereGeometry(0.22, 10, 10);
      leafGeo.scale(1, 0.12, 1.6);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.16, 0.5 + l * 0.06, Math.sin(angle) * 0.16);
      leaf.rotation.x = 0.45;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }
    plantGroup.position.set(halfW - 0.5, 0, -halfL + 0.5);
    roomGroup.add(plantGroup);

    // 7. Framed Modern Wall Art
    const artGroup = new THREE.Group();
    const artFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.03),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 })
    );
    artGroup.add(artFrame);

    const artCanvas = document.createElement('canvas');
    artCanvas.width = 512;
    artCanvas.height = 340;
    const actx = artCanvas.getContext('2d');
    if (actx) {
      actx.fillStyle = '#f8fafc';
      actx.fillRect(0, 0, 512, 340);
      actx.fillStyle = '#0f766e';
      actx.beginPath();
      actx.arc(256, 170, 85, 0, Math.PI * 2);
      actx.fill();
      actx.fillStyle = '#ea580c';
      actx.fillRect(200, 150, 180, 65);
      actx.fillStyle = '#1e293b';
      actx.font = 'bold 20px monospace';
      actx.fillText('RENOVAI INTERIOR', 50, 290);
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
  }, [room, roomW, roomL, roomH]);

  // High-Resolution Snapshot Capture from Walker's Viewpoint
  const handleTakeSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    setIsCapturing(true);
    renderer.render(scene, camera);

    setTimeout(() => {
      try {
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Spacer-3D-${room.name.replace(/\s+/g, '_')}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Błąd zapisu zrzutu:', err);
      } finally {
        setIsCapturing(false);
      }
    }, 150);
  };

  // Virtual D-Pad / Controls helpers for touch/mobile
  const handleVirtualMove = (direction: 'forward' | 'backward' | 'left' | 'right') => {
    const step = (isSprinting.current ? 0.7 : 0.4);
    const forward = new THREE.Vector3(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current)).negate();
    const right = new THREE.Vector3(Math.cos(playerYaw.current), 0, -Math.sin(playerYaw.current));

    const halfW = roomW / 2;
    const halfL = roomL / 2;
    const margin = 0.35;

    let delta = new THREE.Vector3();
    if (direction === 'forward') delta.copy(forward).multiplyScalar(step);
    if (direction === 'backward') delta.copy(forward).multiplyScalar(-step);
    if (direction === 'left') delta.copy(right).multiplyScalar(-step);
    if (direction === 'right') delta.copy(right).multiplyScalar(step);

    const nx = Math.max(-halfW + margin, Math.min(halfW - margin, playerPos.current.x + delta.x));
    const nz = Math.max(-halfL + margin, Math.min(halfL - margin, playerPos.current.z + delta.z));

    playerPos.current.x = nx;
    playerPos.current.z = nz;
  };

  const handleVirtualTurn = (direction: 'left' | 'right' | 'up' | 'down' | 'center') => {
    const turnStep = 0.25;
    if (direction === 'left') playerYaw.current += turnStep;
    if (direction === 'right') playerYaw.current -= turnStep;
    if (direction === 'up') playerPitch.current = Math.min(0.8, playerPitch.current + 0.15);
    if (direction === 'down') playerPitch.current = Math.max(-0.8, playerPitch.current - 0.15);
    if (direction === 'center') playerPitch.current = 0;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-teal-500/40 bg-slate-950 shadow-2xl ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* 3D WebGL Canvas for Virtual Walkthrough */}
      <div
        ref={containerRef}
        className={`w-full cursor-grab active:cursor-grabbing outline-hidden transition-all ${
          isFullscreen ? 'h-screen' : 'h-[580px] sm:h-[660px] lg:h-[720px]'
        }`}
        title="Przeciągaj myszką, aby się rozglądać. Używaj klawiszy W, A, S, D, aby chodzić."
      />

      {/* Crosshair in the Center for Architectural Sight Line */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-70">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
          <div className="absolute w-5 h-0.5 border-t border-teal-400/40" />
          <div className="absolute h-5 w-0.5 border-l border-teal-400/40" />
        </div>
      </div>

      {/* Top Floating Header: Status & Room Title */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-30">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-teal-500/50 bg-slate-950/90 px-4 py-2 text-xs backdrop-blur-xl shadow-2xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
            <Footprints className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">{room.name}</span>
              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-300 font-semibold border border-teal-500/30">
                Wirtualny Spacer 3D
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <span>Wzrok: {crouchActive ? '1.10 m (Kucanie)' : '1.68 m (Stojący)'}</span>
              <span>•</span>
              <span>
                Poz: X={playerCoords.xPct}%, Y={playerCoords.zPct}% ({playerCoords.angleDeg}°)
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Flashlight button */}
          <button
            onClick={handleToggleFlashlight}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-xl shadow-lg transition active:scale-95 ${
              isFlashlightOn
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-amber-500/20'
                : 'border-slate-800 bg-slate-900/85 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Włącz/wyłącz latarkę architektoniczną do inspekcji narożników i detali (Klawisz F)"
          >
            <Flashlight className={`w-3.5 h-3.5 ${isFlashlightOn ? 'text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Latarka</span>
          </button>

          {/* Minimap toggle button */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-xl shadow-lg transition active:scale-95 ${
              showMinimap
                ? 'border-teal-500/50 bg-teal-950/80 text-teal-300'
                : 'border-slate-800 bg-slate-900/85 text-slate-400 hover:text-white'
            }`}
            title="Pokaż / ukryj radar z rzutem 2D"
          >
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Radar 2D</span>
          </button>

          {/* Photo HD Snapshot */}
          <button
            onClick={handleTakeSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition"
            title="Zrób zdjęcie wnętrza z perspektywy spaceru (PNG)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCapturing ? 'Zapisuję...' : 'Zrób Foto'}</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-xl border border-slate-800 bg-slate-900/85 p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title={isFullscreen ? 'Wyjdź z trybu pełnoekranowego' : 'Pełny ekran spaceru'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close modal if provided */}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900/85 p-2 text-slate-400 hover:text-white hover:bg-red-950/60 transition"
              title="Zamknij spacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Proximity Inspection HUD Notification (Appears when near furniture or outlets) */}
      {nearbyItem && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border border-teal-500/60 bg-slate-950/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 max-w-[90%]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
            {nearbyItem.type === 'furniture' ? <Move className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{nearbyItem.name}</span>
              <span className="font-mono text-[10px] text-teal-300 bg-teal-950/80 border border-teal-800 px-1.5 py-0.5 rounded-md">
                Odległość: {nearbyItem.distanceM.toFixed(2)} m
              </span>
            </div>
            <div className="text-[11px] text-slate-300">{nearbyItem.details}</div>
          </div>
          {nearbyItem.clearanceOk ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 pl-2 border-l border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Ciąg OK</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-amber-400 pl-2 border-l border-slate-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Blisko</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive 2D Minimap / Radar in Bottom Left */}
      {showMinimap && (
        <div className="pointer-events-auto absolute bottom-20 left-4 z-30 rounded-2xl border border-slate-800/90 bg-slate-950/90 p-3 backdrop-blur-xl shadow-2xl w-48 sm:w-56">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5 text-teal-400">
              <Compass className="w-3.5 h-3.5" />
              Radar Pomieszczenia
            </span>
            <span className="font-mono text-[10px] text-slate-400">Kliknij = Teleport</span>
          </div>

          {/* Minimap SVG Canvas */}
          <div
            className="relative w-full aspect-square rounded-xl bg-slate-900 border border-slate-800 cursor-crosshair overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickXPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
              const clickZPct = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
              teleportTo(clickXPct, clickZPct);
            }}
            title="Kliknij w dowolny punkt rzutu, aby natychmiast się tam przenieść"
          >
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />

            {/* Furniture footprints */}
            {room.furniture?.map((f) => (
              <div
                key={f.id}
                className="absolute border border-teal-500/50 bg-teal-500/20 rounded-xs flex items-center justify-center text-[7px] text-teal-300 font-mono truncate px-0.5"
                style={{
                  left: `${f.x - (f.width / 2 / roomW) * 10}%`,
                  top: `${f.y - (f.height / 2 / roomL) * 10}%`,
                  width: `${Math.max(8, (f.width / roomW) * 10)}%`,
                  height: `${Math.max(8, (f.height / roomL) * 10)}%`,
                  transform: `rotate(${f.rotation || 0}deg)`,
                }}
                title={f.name}
              >
                {f.name.slice(0, 4)}
              </div>
            ))}

            {/* Outlets dots */}
            {room.outlets?.map((o) => (
              <div
                key={o.id}
                className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}

            {/* Player Marker: Dot & Vision Frustum Cone */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${playerCoords.xPct}%`,
                top: `${playerCoords.zPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Rotating vision frustum */}
              <div
                className="relative flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `rotate(${playerCoords.angleDeg}deg)`,
                }}
              >
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[26px] border-t-teal-400/40 -mt-7 filter drop-shadow-[0_0_6px_#2dd4bf]" />
                <div className="absolute w-3 h-3 rounded-full bg-teal-400 border border-white shadow-md" />
              </div>
            </div>

            {/* North Marker */}
            <div className="absolute top-1 left-1.5 text-[9px] font-bold text-teal-400 font-mono">N ↑</div>
          </div>
        </div>
      )}

      {/* Quick Teleport Hotspots Ribbon (Bottom Right / Center) */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-30">
        
        {/* Atmosphere & Lighting Presets */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/90 p-1.5 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setLighting('day')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              lighting === 'day'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Naturalne dzienne światło słoneczne"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Dzień</span>
          </button>
          <button
            onClick={() => setLighting('sunset')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              lighting === 'sunset'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ciepła złota godzina o zmierzchu"
          >
            <Sunset className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Zmierzch</span>
          </button>
          <button
            onClick={() => setLighting('night')}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              lighting === 'night'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Noc z oświetleniem sufitowym LED o zadanej temperaturze"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Noc</span>
          </button>
        </div>

        {/* Teleport Hotspots Carousel */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/90 p-1.5 backdrop-blur-xl shadow-2xl overflow-x-auto max-w-[55%]">
          <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1 hidden md:inline flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            Punkt:
          </span>
          {hotspots.map((hs) => (
            <button
              key={hs.id}
              onClick={() => {
                setActiveHotspot(hs.id);
                teleportTo(hs.x, hs.z, hs.rotY);
              }}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeHotspot === hs.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {hs.label}
            </button>
          ))}
        </div>

        {/* Mobile / Touch Navigation D-Pad & Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Crouch button */}
          <button
            onClick={() => {
              isCrouching.current = !isCrouching.current;
              setCrouchActive(isCrouching.current);
            }}
            className={`rounded-xl border p-2 text-xs font-semibold backdrop-blur-xl shadow-lg transition ${
              crouchActive
                ? 'border-teal-400 bg-teal-500/20 text-teal-300'
                : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white'
            }`}
            title="Kucnij / Wstań (Klawisz C)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* D-Pad Buttons for Touch Screens */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-xl shadow-2xl">
            <button
              onClick={() => handleVirtualTurn('left')}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Obróć w lewo (Q)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleVirtualMove('forward')}
              className="rounded-lg p-1.5 text-teal-400 hover:text-white hover:bg-slate-800 transition"
              title="Krok w przód (W)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVirtualTurn('right')}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Obróć w prawo (E)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleVirtualMove('left')}
              className="rounded-lg p-1.5 text-teal-400 hover:text-white hover:bg-slate-800 transition"
              title="Krok w lewo (A)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVirtualMove('backward')}
              className="rounded-lg p-1.5 text-teal-400 hover:text-white hover:bg-slate-800 transition"
              title="Krok w tył (S)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVirtualMove('right')}
              className="rounded-lg p-1.5 text-teal-400 hover:text-white hover:bg-slate-800 transition"
              title="Krok w prawo (D)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Onboarding Keyboard Hints Banner (Dismissable) */}
      {showHelp && (
        <div className="absolute top-18 left-4 z-20 flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-300 backdrop-blur-md shadow-xl hidden sm:flex">
          <div className="flex items-center gap-1 font-mono text-[10px] text-teal-300 font-bold">
            <span className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">W</span>
            <span className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">A</span>
            <span className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">S</span>
            <span className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">D</span>
          </div>
          <span>Chodzenie</span>
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-slate-200">Przeciągnij myszką:</span>
          <span>Rozglądanie się</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-amber-300">F: Latarka</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-teal-300">C: Kucnij</span>
          <button
            onClick={() => setShowHelp(false)}
            className="ml-1 text-slate-400 hover:text-white"
            title="Zamknij podpowiedź"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
