import * as THREE from 'three';

/**
 * Creates a realistic procedural wood parquet / herringbone texture
 */
export function createWoodTexture(type: 'herringbone' | 'plank' = 'plank', tintHex: string = '#b48256'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Base background
  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 1024, 1024);

  // Parse tint color to RGB
  const baseColor = new THREE.Color(tintHex);

  if (type === 'herringbone') {
    // Herringbone pattern
    const plankW = 64;
    const plankL = 256;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';

    for (let y = -256; y < 1024 + 256; y += plankW) {
      for (let x = -256; x < 1024 + 256; x += plankL) {
        // Variation in plank tone
        const toneVar = (Math.random() - 0.5) * 0.18;
        const pColor = baseColor.clone().offsetHSL(0, toneVar * 0.5, toneVar);
        ctx.fillStyle = pColor.getStyle();

        // Draw angled block
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(0, 0, plankL, plankW);
        ctx.strokeRect(0, 0, plankL, plankW);

        // Subtle wood grain lines
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        for (let g = 8; g < plankW; g += 12) {
          ctx.beginPath();
          ctx.moveTo(0, g + Math.sin(g) * 2);
          ctx.lineTo(plankL, g + Math.cos(g) * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  } else {
    // Linear modern planks
    const plankH = 96;
    for (let y = 0; y < 1024; y += plankH) {
      // Staggered seam lines
      const offsetX = (y / plankH) % 2 === 0 ? 0 : 380;
      for (let x = -400 + offsetX; x < 1024 + 400; x += 512) {
        const toneVar = (Math.random() - 0.5) * 0.16;
        const pColor = baseColor.clone().offsetHSL(0, toneVar * 0.4, toneVar);
        ctx.fillStyle = pColor.getStyle();
        ctx.fillRect(x, y, 512, plankH);

        // Grout / seam line
        ctx.strokeStyle = 'rgba(30,20,10,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 512, plankH);

        // Fine grain lines along the plank
        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1;
        for (let g = 10; g < plankH; g += 14) {
          ctx.beginPath();
          ctx.moveTo(x, y + g);
          ctx.bezierCurveTo(
            x + 150, y + g + (Math.random() - 0.5) * 6,
            x + 350, y + g + (Math.random() - 0.5) * 6,
            x + 512, y + g
          );
          ctx.stroke();
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates large format stone/gres tile texture with subtle marble/concrete veining
 */
export function createTileTexture(tintHex: string = '#334155'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 1024, 1024);

  const baseColor = new THREE.Color(tintHex);

  // 120x60 format tiles (2x4 grid in canvas)
  const tileW = 512;
  const tileH = 256;

  for (let y = 0; y < 1024; y += tileH) {
    const offsetX = (y / tileH) % 2 === 0 ? 0 : 256;
    for (let x = -256 + offsetX; x < 1024 + 256; x += tileW) {
      const tone = (Math.random() - 0.5) * 0.08;
      const c = baseColor.clone().offsetHSL(0, 0, tone);
      ctx.fillStyle = c.getStyle();
      ctx.fillRect(x, y, tileW, tileH);

      // Subtle marble/mineral streaks
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 50, y + 20);
      ctx.bezierCurveTo(x + 200, y + 100, x + 350, y + 80, x + 480, y + 220);
      ctx.stroke();

      // Delicate tile joint grout
      ctx.strokeStyle = 'rgba(20,20,20,0.45)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, tileW, tileH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates luxurious marble texture (Carrara / Nero Marquina) with rich veining
 */
export function createMarbleTexture(tintHex: string = '#f8fafc', veinHex?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 1024, 1024);

  const isDark = new THREE.Color(tintHex).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
  const defaultVein = isDark ? 'rgba(230, 200, 140, 0.4)' : 'rgba(75, 85, 99, 0.25)';
  const veinStyle = veinHex || defaultVein;

  // Primary large flowing veins
  for (let v = 0; v < 7; v++) {
    ctx.strokeStyle = veinStyle;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    let sx = Math.random() * 200;
    let sy = Math.random() * 1024;
    ctx.moveTo(sx, sy);

    while (sx < 1024) {
      const cx1 = sx + 80 + Math.random() * 100;
      const cy1 = sy + (Math.random() - 0.5) * 160;
      const cx2 = cx1 + 90 + Math.random() * 100;
      const cy2 = cy1 + (Math.random() - 0.5) * 160;
      sx = cx2 + 80;
      sy = cy2 + (Math.random() - 0.5) * 80;
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, sx, sy);
    }
    ctx.stroke();

    // Secondary hairline fracture branches
    ctx.lineWidth = 1;
    for (let b = 0; b < 4; b++) {
      const bx = 100 + Math.random() * 800;
      const by = 100 + Math.random() * 800;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (Math.random() - 0.5) * 120, by + (Math.random() - 0.5) * 120);
      ctx.stroke();
    }
  }

  // Very subtle tile seams (large slab 120x120cm)
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates modern terrazzo / lastryko texture with multi-colored stone aggregates
 */
export function createTerrazzoTexture(tintHex: string = '#cbd5e1'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 1024, 1024);

  const speckleColors = [
    '#334155', '#475569', '#b48256', '#d97706', '#94a3b8', '#0f172a', '#e2e8f0', '#78350f'
  ];

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = 3 + Math.random() * 14;
    const color = speckleColors[Math.floor(Math.random() * speckleColors.length)];

    ctx.fillStyle = color;
    ctx.beginPath();
    // Angular polygon chips
    const vertices = 4 + Math.floor(Math.random() * 3);
    for (let v = 0; v < vertices; v++) {
      const angle = (v / vertices) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const r = size * (0.6 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Faint grout joint for 60x60 tiles
  ctx.strokeStyle = 'rgba(50,50,50,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.strokeRect(512, 0, 512, 512);
  ctx.strokeRect(0, 512, 512, 512);
  ctx.strokeRect(512, 512, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates contemporary acoustic vertical wood slats wall texture
 */
export function createWoodSlatsTexture(woodHex: string = '#b48256', gapHex: string = '#0f172a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark acoustic felt backing
  ctx.fillStyle = gapHex;
  ctx.fillRect(0, 0, 1024, 1024);

  const slatWidth = 32;
  const gapWidth = 16;
  const period = slatWidth + gapWidth;
  const baseColor = new THREE.Color(woodHex);

  for (let x = 0; x < 1024; x += period) {
    const toneVar = (Math.random() - 0.5) * 0.12;
    const sColor = baseColor.clone().offsetHSL(0, 0, toneVar);
    ctx.fillStyle = sColor.getStyle();
    ctx.fillRect(x, 0, slatWidth, 1024);

    // Subtle 3D shadow on slat edges for depth
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + slatWidth - 3, 0, 3, 1024);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, 0, 2, 1024);

    // Vertical wood grain
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let g = 4; g < slatWidth; g += 6) {
      ctx.beginPath();
      ctx.moveTo(x + g, 0);
      ctx.lineTo(x + g + (Math.random() - 0.5) * 2, 1024);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates architectural exposed concrete panels texture with circular formwork tie-rod impressions
 */
export function createConcretePanelsTexture(tintHex: string = '#64748b'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle tonal noise
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(x, y, 5, x, y, r);
    grad.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2x2 Architectural panels with tie holes
  ctx.strokeStyle = 'rgba(20,20,20,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.strokeRect(512, 0, 512, 512);
  ctx.strokeRect(0, 512, 512, 512);
  ctx.strokeRect(512, 512, 512, 512);

  const drawTieHole = (hx: number, hy: number) => {
    ctx.fillStyle = 'rgba(15,23,42,0.6)';
    ctx.beginPath();
    ctx.arc(hx, hy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Four tie holes per panel
  const panels = [
    { x: 0, y: 0 },
    { x: 512, y: 0 },
    { x: 0, y: 512 },
    { x: 512, y: 512 },
  ];
  panels.forEach((p) => {
    drawTieHole(p.x + 40, p.y + 40);
    drawTieHole(p.x + 472, p.y + 40);
    drawTieHole(p.x + 40, p.y + 472);
    drawTieHole(p.x + 472, p.y + 472);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Creates classic subway / metro ceramic tile texture (10x20cm)
 */
export function createSubwayTileTexture(tintHex: string = '#f8fafc'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark or light grout
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 1024, 1024);

  const tileW = 240;
  const tileH = 110;
  const grout = 6;
  const baseColor = new THREE.Color(tintHex);

  for (let y = grout; y < 1024; y += tileH + grout) {
    const row = Math.floor(y / (tileH + grout));
    const offsetX = (row % 2 === 0) ? 0 : (tileW + grout) / 2;
    for (let x = -tileW + offsetX; x < 1024 + tileW; x += tileW + grout) {
      const tone = (Math.random() - 0.5) * 0.05;
      const c = baseColor.clone().offsetHSL(0, 0, tone);
      ctx.fillStyle = c.getStyle();
      ctx.fillRect(x, y, tileW, tileH);

      // Beveled glossy edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y, tileW, 3);
      ctx.fillRect(x, y, 3, tileH);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x, y + tileH - 3, tileW, 3);
      ctx.fillRect(x + tileW - 3, y, 3, tileH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/**
 * Creates textured architectural stucco / plaster
 */
export function createStuccoTexture(tintHex: string = '#f1f5f9'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 512, 512);

  // Fine sand/plaster grain
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const isLight = Math.random() > 0.5;
    ctx.fillStyle = isLight ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Creates realistic microcement / stucco texture
 */
export function createMicrocementTexture(tintHex: string = '#64748b'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 512, 512);

  // Swirls and trowel float strokes
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const radius = 60 + Math.random() * 120;
    const grad = ctx.createRadialGradient(rx, ry, 10, rx, ry, radius);
    const alpha = (Math.random() * 0.07).toFixed(3);
    const isLight = Math.random() > 0.5;
    grad.addColorStop(0, isLight ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/**
 * Creates architectural brick texture with mortar joints
 */
export function createBrickTexture(tintHex: string = '#9a3412'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#8c857b'; // mortar background
  ctx.fillRect(0, 0, 1024, 1024);

  const brickH = 56;
  const brickW = 160;
  const mortar = 8;
  const baseColor = new THREE.Color(tintHex);

  for (let y = mortar; y < 1024; y += brickH + mortar) {
    const row = Math.floor(y / (brickH + mortar));
    const offsetX = (row % 2) * (brickW / 2 + mortar / 2);
    for (let x = -brickW + offsetX; x < 1024 + brickW; x += brickW + mortar) {
      const tone = (Math.random() - 0.5) * 0.22;
      const bColor = baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.05, tone * 0.5, tone);
      ctx.fillStyle = bColor.getStyle();
      ctx.fillRect(x, y, brickW, brickH);

      // Brick porous noise
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let n = 0; n < 15; n++) {
        ctx.fillRect(x + Math.random() * brickW, y + Math.random() * brickH, 4, 3);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

/**
 * Convert lighting temperature Kelvin (2200K - 6500K) to hex color
 */
export function kelvinToHex(kelvin: number): string {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let red = 0;
  let green = 0;
  let blue = 0;

  // Red
  if (temp <= 66) {
    red = 255;
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    red = Math.max(0, Math.min(255, red));
  }

  // Green
  if (temp <= 66) {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    green = Math.max(0, Math.min(255, green));
  } else {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    green = Math.max(0, Math.min(255, green));
  }

  // Blue
  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = temp - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    blue = Math.max(0, Math.min(255, blue));
  }

  const r = Math.round(red).toString(16).padStart(2, '0');
  const g = Math.round(green).toString(16).padStart(2, '0');
  const b = Math.round(blue).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
