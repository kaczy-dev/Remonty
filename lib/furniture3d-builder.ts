import * as THREE from 'three';
import { RoomFurniture } from '@/types/renovation';

/**
 * Creates a soft realistic ambient occlusion contact shadow decal for furniture base
 */
function createContactShadowMesh(width: number, length: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(width * 1.18, length * 1.18);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.003; // Just above floor plane
  shadowMesh.renderOrder = 1;
  return shadowMesh;
}

/**
 * Procedural Realistic 3D Furniture Meshes Builder
 * Builds parametric 3D groups according to furniture type, model3DUrl, color, and dimensions.
 */
export function create3DFurnitureMesh(
  item: RoomFurniture,
  roomW: number,
  roomL: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = `furniture-${item.id}`;
  group.userData = { furnitureId: item.id, item };

  const defaultColor = item.color || '#384252';
  const primaryMat = new THREE.MeshStandardMaterial({
    color: defaultColor,
    roughness: 0.65,
    metalness: 0.15,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#854d0e',
    roughness: 0.45,
    metalness: 0.05,
  });

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.3,
    metalness: 0.8,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.6,
  });

  const modelKey = (item.model3DUrl || item.iconType || '').toLowerCase();

  let footprintW = 1.0;
  let footprintL = 1.0;

  if (modelKey.includes('sofa') || modelKey.includes('kanapa') || modelKey.includes('couch')) {
    // --- 3D SOFA ---
    footprintW = 2.2;
    footprintL = 1.05;

    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 0.95), primaryMat);
    sofaBase.position.set(0, 0.24, 0);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    group.add(sofaBase);

    // 2 Plush Cushions
    for (let i = -0.5; i <= 0.5; i += 1.0) {
      const cushionMat = new THREE.MeshStandardMaterial({
        color: item.color || '#334155',
        roughness: 0.8,
      });
      const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.85), cushionMat);
      seatCushion.position.set(i * 0.51, 0.42, 0.03);
      seatCushion.castShadow = true;
      group.add(seatCushion);
    }

    // Backrest
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 0.22), primaryMat);
    sofaBack.position.set(0, 0.62, -0.38);
    sofaBack.castShadow = true;
    group.add(sofaBack);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.95), primaryMat);
    armL.position.set(-1.05, 0.46, 0);
    armL.castShadow = true;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.95), primaryMat);
    armR.position.set(1.05, 0.46, 0);
    armR.castShadow = true;
    group.add(armR);

    // 4 Wooden legs
    for (const lx of [-0.95, 0.95]) {
      for (const lz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.14, 12), woodMat);
        leg.position.set(lx, 0.07, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
  } else if (modelKey.includes('table') || modelKey.includes('stół') || modelKey.includes('desk') || modelKey.includes('biurko')) {
    // --- 3D DINING / WORK TABLE ---
    footprintW = 1.6;
    footprintL = 1.0;
    const tableTopGeo = new THREE.BoxGeometry(1.5, 0.05, 0.9);
    const tableTop = new THREE.Mesh(tableTopGeo, item.color ? primaryMat : woodMat);
    tableTop.position.set(0, 0.74, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // 4 Metal Legs
    for (const lx of [-0.68, 0.68]) {
      for (const lz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 16), darkSteelMat);
        leg.position.set(lx, 0.36, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
  } else if (modelKey.includes('coffee') || modelKey.includes('kawowy')) {
    // --- 3D ROUND COFFEE TABLE ---
    footprintW = 1.05;
    footprintL = 1.05;
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: item.color || '#f1f5f9',
      roughness: 0.18,
      metalness: 0.1,
    });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.035, 32), tableTopMat);
    tableTop.position.set(0, 0.42, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // Steel Legs
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 12), darkSteelMat);
      leg.position.set(Math.cos(angle) * 0.36, 0.21, Math.sin(angle) * 0.36);
      leg.rotation.z = Math.cos(angle) * 0.08;
      leg.rotation.x = Math.sin(angle) * 0.08;
      leg.castShadow = true;
      group.add(leg);
    }
  } else if (modelKey.includes('tv') || modelKey.includes('rtv') || modelKey.includes('cabinet') || modelKey.includes('szafka')) {
    // --- 3D TV & MEDIA CABINET ---
    footprintW = 2.1;
    footprintL = 0.55;
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.44), woodMat);
    cabinet.position.set(0, 0.26, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);

    // TV Screen
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.92, 0.04),
      new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.1, metalness: 0.85 })
    );
    tvScreen.position.set(0, 1.05, 0);
    tvScreen.castShadow = true;
    group.add(tvScreen);

    // TV Stand
    const tvPole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.05), darkSteelMat);
    tvPole.position.set(0, 0.58, 0);
    group.add(tvPole);

    const tvBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.26), darkSteelMat);
    tvBase.position.set(0, 0.48, 0);
    group.add(tvBase);
  } else if (modelKey.includes('bed') || modelKey.includes('łóżko') || modelKey.includes('lozko')) {
    // --- 3D DOUBLE BED ---
    footprintW = 1.8;
    footprintL = 2.2;
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 2.1), woodMat);
    bedFrame.position.set(0, 0.18, 0);
    bedFrame.castShadow = true;
    group.add(bedFrame);

    // Mattress
    const mattressMat = new THREE.MeshStandardMaterial({ color: item.color || '#f8fafc', roughness: 0.9 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 2.0), mattressMat);
    mattress.position.set(0, 0.42, 0);
    mattress.castShadow = true;
    group.add(mattress);

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.9, 0.12), woodMat);
    headboard.position.set(0, 0.65, -1.02);
    headboard.castShadow = true;
    group.add(headboard);

    // Pillows
    const pillowMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.85 });
    for (const px of [-0.45, 0.45]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.38), pillowMat);
      pillow.position.set(px, 0.58, -0.72);
      pillow.rotation.x = 0.15;
      group.add(pillow);
    }
  } else if (modelKey.includes('wardrobe') || modelKey.includes('szafa') || modelKey.includes('closet')) {
    // --- 3D WARDROBE / CLOSET ---
    footprintW = 1.5;
    footprintL = 0.7;
    const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.62), woodMat);
    wardrobe.position.set(0, 1.05, 0);
    wardrobe.castShadow = true;
    wardrobe.receiveShadow = true;
    group.add(wardrobe);

    // Mirror or accent door
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.9), glassMat);
    mirror.position.set(0.32, 1.05, 0.315);
    group.add(mirror);
  } else if (modelKey.includes('plant') || modelKey.includes('roślina') || modelKey.includes('kwiat')) {
    // --- 3D INDOOR MONSTERA / PLANTER ---
    footprintW = 0.65;
    footprintL = 0.65;
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: item.color || '#ffffff', roughness: 0.25 })
    );
    pot.position.set(0, 0.23, 0);
    pot.castShadow = true;
    group.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CircleGeometry(0.23, 24),
      new THREE.MeshStandardMaterial({ color: '#3f2e18', roughness: 0.95 })
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(0, 0.44, 0);
    group.add(soil);

    // Green Foliage
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.55,
      side: THREE.DoubleSide,
    });

    for (let l = 0; l < 8; l++) {
      const angle = (l * Math.PI * 2) / 8;
      const leafGeo = new THREE.SphereGeometry(0.26, 12, 12);
      leafGeo.scale(1, 0.08, 1.6);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.16, 0.52 + l * 0.06, Math.sin(angle) * 0.16);
      leaf.rotation.x = 0.45;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }
  } else if (modelKey.includes('chair') || modelKey.includes('fotel') || modelKey.includes('krzesło')) {
    // --- 3D ARMCHAIR / CHAIR ---
    footprintW = 0.8;
    footprintL = 0.8;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.68), primaryMat);
    seat.position.set(0, 0.42, 0);
    seat.castShadow = true;
    group.add(seat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.55, 0.12), primaryMat);
    chairBack.position.set(0, 0.72, -0.28);
    chairBack.castShadow = true;
    group.add(chairBack);

    // 4 legs
    for (const lx of [-0.28, 0.28]) {
      for (const lz of [-0.28, 0.28]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.42, 12), woodMat);
        leg.position.set(lx, 0.21, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
  } else {
    // --- GENERIC ELEGANT ARCHITECTURAL CUBE/MODULE ---
    const widthM = Math.max(0.4, (item.width / 100) * (roomW / 3.8));
    const lengthM = Math.max(0.4, (item.height / 100) * (roomL / 2.8));
    const heightM = 0.85;
    footprintW = widthM;
    footprintL = lengthM;

    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(widthM, heightM, lengthM), primaryMat);
    mainBlock.position.set(0, heightM / 2, 0);
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    group.add(mainBlock);

    // Subtle edge highlight
    const topAccent = new THREE.Mesh(
      new THREE.BoxGeometry(widthM * 1.02, 0.04, lengthM * 1.02),
      woodMat
    );
    topAccent.position.set(0, heightM + 0.02, 0);
    topAccent.castShadow = true;
    group.add(topAccent);
  }

  // Add realistic ground contact shadow decal
  const contactShadow = createContactShadowMesh(footprintW, footprintL);
  group.add(contactShadow);

  // Mark all child meshes with furnitureId for raycasting
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child !== contactShadow) {
      child.userData.furnitureId = item.id;
    }
  });

  // Position within Room Coordinates (-halfW to +halfW, -halfL to +halfL)
  const halfW = roomW / 2;
  const halfL = roomL / 2;
  const posX = -halfW + (item.x / 100) * roomW;
  const posZ = -halfL + (item.y / 100) * roomL;

  group.position.set(posX, 0, posZ);

  // Optional 3D Rotation
  if (item.rotation) {
    group.rotation.y = (item.rotation * Math.PI) / 180;
  }

  return group;
}
