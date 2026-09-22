'use client';

import React, { useRef, useEffect } from 'react';

interface MagnifierLoupeProps {
  sourceElement?: HTMLVideoElement | HTMLCanvasElement | null;
  getSourceElement?: () => HTMLVideoElement | HTMLCanvasElement | null;
  point: { x: number; y: number } | null; // percentage coordinates 0..100
  containerRect: DOMRect | null;
  zoom?: number;
  size?: number; // diameter in pixels (e.g. 130)
  label?: string;
  visible: boolean;
}

export const MagnifierLoupe: React.FC<MagnifierLoupeProps> = ({
  sourceElement,
  getSourceElement,
  point,
  containerRect,
  zoom = 3,
  size = 130,
  label,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = sourceElement || getSourceElement?.() || null;
    if (!visible || !point || !el || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine source dimensions
    let srcWidth = 0;
    let srcHeight = 0;

    if (el instanceof HTMLVideoElement) {
      srcWidth = el.videoWidth || el.clientWidth || 1280;
      srcHeight = el.videoHeight || el.clientHeight || 720;
    } else if (el instanceof HTMLCanvasElement) {
      srcWidth = el.width;
      srcHeight = el.height;
    }

    if (srcWidth === 0 || srcHeight === 0) return;

    // Calculate source center in physical pixels
    const centerX = (point.x / 100) * srcWidth;
    const centerY = (point.y / 100) * srcHeight;

    // Viewport size in source pixels (size / zoom)
    const viewW = size / zoom;
    const viewH = size / zoom;

    const srcX = Math.max(0, Math.min(srcWidth - viewW, centerX - viewW / 2));
    const srcY = Math.max(0, Math.min(srcHeight - viewH, centerY - viewH / 2));

    ctx.clearRect(0, 0, size, size);

    // Render magnified source slice
    try {
      ctx.imageSmoothingEnabled = false; // Sharp pixel rendering for precise alignment
      ctx.drawImage(sourceElement, srcX, srcY, viewW, viewH, 0, 0, size, size);
    } catch {
      // Fallback if cross-origin or video not ready
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);
    }

    // High-contrast Reticle (Crosshair)
    const mid = size / 2;

    // Outer dark ring for contrast
    ctx.beginPath();
    ctx.arc(mid, mid, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner bright cyan ring
    ctx.beginPath();
    ctx.arc(mid, mid, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crosshair ticks with dark outline
    const drawTick = (x1: number, y1: number, x2: number, y2: number) => {
      // Dark halo
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Cyan core
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawTick(mid - 24, mid, mid - 5, mid); // Left
    drawTick(mid + 5, mid, mid + 24, mid); // Right
    drawTick(mid, mid - 24, mid, mid - 5); // Top
    drawTick(mid, mid + 5, mid, mid + 24); // Bottom

    // Center sub-pixel dot
    ctx.beginPath();
    ctx.arc(mid, mid, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e'; // Rose red center dot
    ctx.fill();
  }, [visible, point, sourceElement, getSourceElement, zoom, size]);

  if (!visible || !point || !containerRect) return null;

  // Compute pixel position inside container
  const touchPxX = (point.x / 100) * containerRect.width;
  const touchPxY = (point.y / 100) * containerRect.height;

  // Float 75px above finger; if too close to top, float below finger
  let loupeTop = touchPxY - size - 20;
  if (loupeTop < 10) {
    loupeTop = touchPxY + 45;
  }

  // Keep within left/right bounds of container
  const halfSize = size / 2;
  const loupeLeft = Math.max(10, Math.min(containerRect.width - size - 10, touchPxX - halfSize));

  return (
    <div
      style={{
        left: `${loupeLeft}px`,
        top: `${loupeTop}px`,
        width: `${size}px`,
        height: `${size}px`,
      }}
      className="absolute z-40 pointer-events-none rounded-full border-3 border-teal-400 bg-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.5)] overflow-hidden animate-in zoom-in-75 duration-100"
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full rounded-full" />

      {/* Loupe Overlay Badge */}
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center pointer-events-none">
        <span className="bg-slate-950/85 backdrop-blur-xs text-[9px] font-mono font-bold text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40 shadow-sm">
          {label ? `${label} (${zoom}×)` : `${zoom}× LUPA`}
        </span>
      </div>
    </div>
  );
};
