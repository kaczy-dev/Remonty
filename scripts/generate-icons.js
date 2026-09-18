const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawPixel) {
  // CRC table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Header
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Scanlines with filter byte 0
  const rowLen = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowLen);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function drawKaczakPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Deep Slate gradient
  let r = Math.floor(15 + ny * 20);
  let g = Math.floor(23 + ny * 25);
  let b = Math.floor(42 + ny * 35);
  let a = 255;

  // Roof accent (thin diagonal lines forming a peaked roof above the duck)
  const roofLeft = Math.abs(ny - (0.36 - (nx - 0.23) * 0.55)) < 0.012 && nx >= 0.23 && nx <= 0.5;
  const roofRight = Math.abs(ny - (0.18 + (nx - 0.5) * 0.55)) < 0.012 && nx > 0.5 && nx <= 0.78;
  if ((roofLeft || roofRight) && ny < 0.4) {
    r = 100; g = 116; b = 139; // Slate roof line
  }

  // Duck body (amber ellipse, lower half)
  const bodyDx = (nx - 0.5) / 0.24;
  const bodyDy = (ny - 0.66) / 0.2;
  const inBody = bodyDx * bodyDx + bodyDy * bodyDy <= 1;

  // Duck head (amber circle, upper-right of body)
  const headDx = (nx - 0.62) / 0.15;
  const headDy = (ny - 0.44) / 0.15;
  const inHead = headDx * headDx + headDy * headDy <= 1;

  if (inBody || inHead) {
    r = 245; g = 158; b = 11; // Amber
  }

  // Hard hat (cyan-teal arc above head)
  const hatDx = (nx - 0.62) / 0.16;
  const hatDy = (ny - 0.3) / 0.13;
  if (hatDx * hatDx + hatDy * hatDy <= 1 && ny < 0.34) {
    r = 20; g = 184; b = 166; // Teal
  }

  // Beak (small orange notch to the right of the head)
  if (nx > 0.72 && nx < 0.84 && ny > 0.44 && ny < 0.52) {
    r = 234; g = 88; b = 12; // Orange
  }

  // Eye
  if (Math.abs(nx - 0.68) < 0.015 && Math.abs(ny - 0.42) < 0.015) {
    r = 15; g = 23; b = 42;
  }

  // Rounded corners mask
  const cornerR = 0.22;
  const qx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerR));
  const qy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerR));
  if (Math.sqrt(qx * qx + qy * qy) > cornerR) {
    a = 0; // transparent corner
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '../public');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, drawKaczakPixel));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, drawKaczakPixel));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, drawKaczakPixel));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, drawKaczakPixel));

console.log('Successfully generated PWA and iOS PNG icons!');
