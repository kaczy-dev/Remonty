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
