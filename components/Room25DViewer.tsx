'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Room, RoomFurniture, RoomOpening, RoomOutlet } from '@/types/renovation';
import { 
  Box, 
  Layers, 
  Ruler, 
  RotateCw, 
  Plus, 
  Trash2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Move, 
  AlertTriangle, 
  CheckCircle, 
  Maximize2,
  Info,
  Grid,
  Footprints,
  Compass,
  Sliders,
  ChevronDown,
  Crosshair,
  X
} from 'lucide-react';

interface Room25DViewerProps {
  room: Room;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onConsultAI?: (prompt: string) => void;
  className?: string;
}

// Preset furniture catalog for quickly adding items to plan space
const FURNITURE_PRESETS: { name: string; iconType: string; widthPct: number; heightPct: number; color: string; defaultWcm: number; defaultHcm: number }[] = [
  { name: 'Narożnik wypoczynkowy', iconType: 'sofa', widthPct: 35, heightPct: 42, color: '#3b82f6', defaultWcm: 260, defaultHcm: 180 },
  { name: 'Sofa 3-osobowa', iconType: 'sofa', widthPct: 30, heightPct: 20, color: '#6366f1', defaultWcm: 220, defaultHcm: 95 },
  { name: 'Stół z 4 krzesłami', iconType: 'table', widthPct: 25, heightPct: 25, color: '#eab308', defaultWcm: 140, defaultHcm: 90 },
  { name: 'Łóżko dwuosobowe (160x200)', iconType: 'bed', widthPct: 32, heightPct: 40, color: '#8b5cf6', defaultWcm: 180, defaultHcm: 210 },
  { name: 'Szafa przesuwna / garderoba', iconType: 'wardrobe', widthPct: 35, heightPct: 15, color: '#64748b', defaultWcm: 200, defaultHcm: 65 },
  { name: 'Biurko do pracy zdalnej', iconType: 'desk', widthPct: 22, heightPct: 16, color: '#06b6d4', defaultWcm: 140, defaultHcm: 70 },
  { name: 'Szafka RTV i TV', iconType: 'tv', widthPct: 26, heightPct: 12, color: '#475569', defaultWcm: 180, defaultHcm: 45 },
  { name: 'Wyspa kuchenna / Blat', iconType: 'kitchen', widthPct: 28, heightPct: 28, color: '#14b8a6', defaultWcm: 160, defaultHcm: 90 },
  { name: 'Kabina Walk-In', iconType: 'shower', widthPct: 30, heightPct: 32, color: '#0ea5e9', defaultWcm: 120, defaultHcm: 90 },
  { name: 'Szafka z umywalką', iconType: 'sink', widthPct: 22, heightPct: 16, color: '#0284c7', defaultWcm: 80, defaultHcm: 50 },
  { name: 'Miska WC z zabudową', iconType: 'toilet', widthPct: 18, heightPct: 16, color: '#059669', defaultWcm: 40, defaultHcm: 55 },
];

export const Room25DViewer: React.FC<Room25DViewerProps> = ({
  room,
  onUpdateFurniture,
  onConsultAI,
  className = '',
}) => {
  // View settings
  const [viewMode, setViewMode] = useState<'2.5d_iso' | '2d_top'>('2.5d_iso');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showClearance, setShowClearance] = useState(true);
  const [showOutlets, setShowOutlets] = useState(true);
  const [isoAngle, setIsoAngle] = useState<number>(35); // tilt angle in degrees for 2.5D
  const [rotationAngle, setRotationAngle] = useState<number>(0); // 0, 90, 180, 270

  // Selection & dragging
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Direct corner / stem rotation drag state
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingFurnitureId, setRotatingFurnitureId] = useState<string | null>(null);
  const rotateStartRef = useRef<{
    clientX: number;
    clientY: number;
    centerScreenX: number;
    centerScreenY: number;
    startAngleDeg: number;
    initialRotation: number;
  } | null>(null);

  // Ruler measurement tool state
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPointA, setRulerPointA] = useState<{ x: number; y: number; mX: number; mY: number } | null>(null);
  const [rulerPointB, setRulerPointB] = useState<{ x: number; y: number; mX: number; mY: number } | null>(null);
  const [rulerHoverPoint, setRulerHoverPoint] = useState<{ x: number; y: number; mX: number; mY: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null);

  // Fallback defaults for room dimensions
  const roomWidth = room.width || 4.0;
  const roomLength = room.length || 4.5;
  const roomHeight = room.height || 2.6;
  const roomArea = room.area || (roomWidth * roomLength);

  // Scaled viewport math (Enlarged by 1/3 for a spacious, high-fidelity canvas)
  const SVG_WIDTH = 1014;
  const SVG_HEIGHT = 748;
  const PADDING = 110; // margin for dimension indicators

  const maxPlanW = SVG_WIDTH - PADDING * 2;
  const maxPlanH = SVG_HEIGHT - PADDING * 2;

  // Compute uniform scale (pixels per meter)
  const scaleX = maxPlanW / roomWidth;
  const scaleY = maxPlanH / roomLength;
  const scale = Math.min(scaleX, scaleY);

  const planWidthPx = roomWidth * scale;
  const planLengthPx = roomLength * scale;
  const planLeft = (SVG_WIDTH - planWidthPx) / 2;
  const planTop = (SVG_HEIGHT - planLengthPx) / 2;

  // Helper: Convert pointer event to SVG coordinates and scaled real room coordinates (meters)
  const getSvgAndRoomCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!svgRef.current) return null;
    let svgX = 0;
    let svgY = 0;
    try {
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const transformed = pt.matrixTransform(ctm.inverse());
        svgX = transformed.x;
        svgY = transformed.y;
      } else {
        const rect = svgRef.current.getBoundingClientRect();
        svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
        svgY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;
      }
    } catch {
      const rect = svgRef.current.getBoundingClientRect();
      svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      svgY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;
    }

    // Real room coordinates in meters relative to room origin (planLeft, planTop)
    const mX = Number((((svgX - planLeft) / planWidthPx) * roomWidth).toFixed(2));
    const mY = Number((((svgY - planTop) / planLengthPx) * roomLength).toFixed(2));

    return { x: svgX, y: svgY, mX, mY };
  };

  // Keyboard shortcut listener (Escape to cancel ruler or deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rulerPointA) {
          setRulerPointA(null);
          setRulerPointB(null);
          setRulerHoverPoint(null);
        } else if (isRulerActive) {
          setIsRulerActive(false);
        } else {
          setSelectedFurnitureId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rulerPointA, isRulerActive]);

  // Space calculation metrics
  const spaceMetrics = useMemo(() => {
    let occupiedAreaM2 = 0;
    const furniture = room.furniture || [];

    furniture.forEach((f) => {
      // Calculate real width and length in meters from percentages
      const fWidthM = (f.width / 100) * roomWidth;
      const fHeightM = (f.height / 100) * roomLength;
      occupiedAreaM2 += fWidthM * fHeightM;
    });

    const occupiedPercent = roomArea > 0 ? Math.min(100, (occupiedAreaM2 / roomArea) * 100) : 0;
    const freeAreaM2 = Math.max(0, roomArea - occupiedAreaM2);
    const freePercent = Math.max(0, 100 - occupiedPercent);

    // Ergonomic status
    let statusLabel = 'Optymalny bilans (20-35%)';
    let statusColor = 'text-teal-400 bg-teal-950/40 border-teal-800';
    if (occupiedPercent < 15) {
      statusLabel = 'Bardzo przestronnie (<15%)';
      statusColor = 'text-cyan-400 bg-cyan-950/40 border-cyan-800';
    } else if (occupiedPercent > 40) {
      statusLabel = 'Zagęszczone meblami (>40%)';
      statusColor = 'text-amber-400 bg-amber-950/40 border-amber-800';
    }

    return {
      occupiedAreaM2: Number(occupiedAreaM2.toFixed(2)),
      occupiedPercent: Math.round(occupiedPercent),
      freeAreaM2: Number(freeAreaM2.toFixed(2)),
      freePercent: Math.round(freePercent),
      statusLabel,
      statusColor,
      itemCount: furniture.length,
    };
  }, [room.furniture, roomWidth, roomLength, roomArea]);

  // Selected furniture item details
  const selectedFurniture = useMemo(() => {
    return (room.furniture || []).find((f) => f.id === selectedFurnitureId) || null;
  }, [room.furniture, selectedFurnitureId]);

  // Handle Dragging
  const handlePointerDownFurniture = (e: React.PointerEvent, fId: string) => {
    if (isRulerActive) {
      // Allow ruler click to measure on top of furniture
      return;
    }
    e.stopPropagation();
    setSelectedFurnitureId(fId);
    setIsDragging(true);

    const targetFurniture = (room.furniture || []).find((f) => f.id === fId);
    if (!targetFurniture) return;

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: targetFurniture.x,
      startY: targetFurniture.y,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveFurniture = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !selectedFurnitureId) return;

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    // Convert pixel delta to percentage delta
    const deltaXPct = (dx / planWidthPx) * 100;
    const deltaYPct = (dy / planLengthPx) * 100;

    const currentFurniture = (room.furniture || []).find((f) => f.id === selectedFurnitureId);
    if (!currentFurniture) return;

    const newXPct = Math.max(2, Math.min(98 - currentFurniture.width, dragStartRef.current.startX + deltaXPct));
    const newYPct = Math.max(2, Math.min(98 - currentFurniture.height, dragStartRef.current.startY + deltaYPct));

    const updated = (room.furniture || []).map((f) => {
      if (f.id !== selectedFurnitureId) return f;
      return { ...f, x: Math.round(newXPct), y: Math.round(newYPct) };
    });

    if (onUpdateFurniture) {
      onUpdateFurniture(room.id, updated);
    }
  };

  const handlePointerUpFurniture = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  // Direct Rotation via Corner or Stem Handle Drag-and-Drop
  const handlePointerDownRotate = (e: React.PointerEvent, fId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const targetFurniture = (room.furniture || []).find((f) => f.id === fId);
    if (!targetFurniture || !svgRef.current) return;

    setSelectedFurnitureId(fId);
    setIsRotating(true);
    setRotatingFurnitureId(fId);

    // Center of furniture in SVG coordinates
    const fCenterSvgX = planLeft + (targetFurniture.x / 100) * planWidthPx + ((targetFurniture.width / 100) * planWidthPx) / 2;
    const fCenterSvgY = planTop + (targetFurniture.y / 100) * planLengthPx + ((targetFurniture.height / 100) * planLengthPx) / 2;

    let centerScreenX = e.clientX;
    let centerScreenY = e.clientY;

    try {
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const pt = svgRef.current.createSVGPoint();
        pt.x = fCenterSvgX;
        pt.y = fCenterSvgY;
        const screenPt = pt.matrixTransform(ctm);
        centerScreenX = screenPt.x;
        centerScreenY = screenPt.y;
      } else {
        const rect = svgRef.current.getBoundingClientRect();
        centerScreenX = rect.left + (fCenterSvgX / SVG_WIDTH) * rect.width;
        centerScreenY = rect.top + (fCenterSvgY / SVG_HEIGHT) * rect.height;
      }
    } catch {
      const rect = svgRef.current.getBoundingClientRect();
      centerScreenX = rect.left + (fCenterSvgX / SVG_WIDTH) * rect.width;
      centerScreenY = rect.top + (fCenterSvgY / SVG_HEIGHT) * rect.height;
    }

    const dx = e.clientX - centerScreenX;
    const dy = e.clientY - centerScreenY;
    const startAngleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

    rotateStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      centerScreenX,
      centerScreenY,
      startAngleDeg,
      initialRotation: targetFurniture.rotation || 0,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveRotate = (e: React.PointerEvent) => {
    if (!isRotating || !rotateStartRef.current || !rotatingFurnitureId) return;

    const dx = e.clientX - rotateStartRef.current.centerScreenX;
    const dy = e.clientY - rotateStartRef.current.centerScreenY;
    const currentAngleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

    const deltaAngle = currentAngleDeg - rotateStartRef.current.startAngleDeg;
    let rawAngle = (rotateStartRef.current.initialRotation + deltaAngle) % 360;
    if (rawAngle < 0) rawAngle += 360;

    // Snapping to nearest 45 degrees if close (within 4 deg)
    let snappedAngle = rawAngle;
    const snapPoints = [0, 45, 90, 135, 180, 225, 270, 315, 360];
    for (const pt of snapPoints) {
      if (Math.abs(rawAngle - pt) <= 4) {
        snappedAngle = pt === 360 ? 0 : pt;
        break;
      }
    }

    const updated = (room.furniture || []).map((f) => {
      if (f.id !== rotatingFurnitureId) return f;
      return { ...f, rotation: snappedAngle };
    });

    if (onUpdateFurniture) {
      onUpdateFurniture(room.id, updated);
    }
  };

  const handlePointerUpRotate = (e: React.PointerEvent) => {
    if (isRotating) {
      setIsRotating(false);
      setRotatingFurnitureId(null);
      rotateStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  // Ruler Interaction Handlers
  const handleSvgClick = (e: React.MouseEvent) => {
    if (!isRulerActive) return;
    const pt = getSvgAndRoomCoords(e);
    if (!pt) return;

    if (!rulerPointA || (rulerPointA && rulerPointB)) {
      setRulerPointA(pt);
      setRulerPointB(null);
      setRulerHoverPoint(null);
    } else if (rulerPointA && !rulerPointB) {
      setRulerPointB(pt);
      setRulerHoverPoint(null);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (isRotating) {
      handlePointerMoveRotate(e);
      return;
    }
    if (isDragging) {
      handlePointerMoveFurniture(e);
      return;
    }
    if (isRulerActive && rulerPointA && !rulerPointB) {
      const pt = getSvgAndRoomCoords(e);
      if (pt) {
        setRulerHoverPoint(pt);
      }
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (isRotating) handlePointerUpRotate(e);
    if (isDragging) handlePointerUpFurniture(e);
  };

  // Rotate selected furniture
  const handleRotateSelected = () => {
    if (!selectedFurnitureId) return;
    const updated = (room.furniture || []).map((f) => {
      if (f.id !== selectedFurnitureId) return f;
      return { ...f, rotation: ((f.rotation || 0) + 45) % 360 };
    });
    if (onUpdateFurniture) onUpdateFurniture(room.id, updated);
  };

  // Delete selected furniture
  const handleDeleteSelected = () => {
    if (!selectedFurnitureId) return;
    const updated = (room.furniture || []).filter((f) => f.id !== selectedFurnitureId);
    setSelectedFurnitureId(null);
    if (onUpdateFurniture) onUpdateFurniture(room.id, updated);
  };

  // Add preset furniture
  const handleAddPresetFurniture = (preset: typeof FURNITURE_PRESETS[0]) => {
    const existingCount = (room.furniture || []).length;
    const newId = `${room.id}-furn-${existingCount + 1}-${preset.iconType}`;
    const newFurniture: RoomFurniture = {
      id: newId,
      name: preset.name,
      x: 35,
      y: 35,
      width: preset.widthPct,
      height: preset.heightPct,
      rotation: 0,
      iconType: preset.iconType,
      color: preset.color,
    };
    const updated = [...(room.furniture || []), newFurniture];
    if (onUpdateFurniture) onUpdateFurniture(room.id, updated);
    setSelectedFurnitureId(newId);
    setShowAddMenu(false);
  };

  // Floor styling color
  const floorFill = room.design?.floorColor || '#b48256';
  const wallStroke = room.design?.wallColor || '#94a3b8';

  // 2.5D pseudo-isometric transformation style
  const isoTransformStyle: React.CSSProperties = viewMode === '2.5d_iso' 
    ? {
        transform: `perspective(1000px) rotateX(${isoAngle}deg) rotateZ(${rotationAngle}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }
    : {
        transform: `rotate(${rotationAngle}deg)`,
        transition: 'transform 0.3s ease-out',
      };

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col ${className}`}>
      
      {/* Top Header & View Controls Bar */}
      <div className="border-b border-slate-800 bg-slate-950/70 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Wizualizacja 2.5D • Schematyczny Rzut z Góry
              </h3>
              <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                Planowanie Przestrzeni
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {room.name} • {roomWidth.toFixed(2)} m × {roomLength.toFixed(2)} m (wys. {roomHeight.toFixed(2)} m) = <strong className="text-slate-200">{roomArea.toFixed(2)} m²</strong>
            </p>
          </div>
        </div>

        {/* View Mode Switcher (2.5D Isometric vs 2D Technical Plan) */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('2.5d_iso')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === '2.5d_iso'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Rzut 2.5D z głębią, ścianami i cieniami brył"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Rzut 2.5D Aksonometria</span>
            </button>
            <button
              onClick={() => setViewMode('2d_top')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === '2d_top'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Płaski rzut architektoniczny z wymiarowaniem"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Płaski Rzut 2D</span>
            </button>
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            {/* Ruler Measurement Tool Toggle */}
            <button
              id="ruler-tool-toggle-btn"
              onClick={() => {
                const next = !isRulerActive;
                setIsRulerActive(next);
                if (!next) {
                  setRulerPointA(null);
                  setRulerPointB(null);
                  setRulerHoverPoint(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isRulerActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title="Narzędzie linijki / miarka: kliknij 2 punkty na rzucie, aby zmierzyć rzeczywisty dystans w metrach"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Linijka / Miarka</span>
              {isRulerActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg border transition text-xs ${
                showGrid 
                  ? 'bg-slate-800 border-slate-700 text-teal-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Włącz/wyłącz siatkę modułową 0.5 m"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`p-2 rounded-lg border transition text-xs ${
                showDimensions 
                  ? 'bg-slate-800 border-slate-700 text-teal-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Włącz/wyłącz linie wymiarowe w metrach"
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowClearance(!showClearance)}
              className={`p-2 rounded-lg border transition text-xs ${
                showClearance 
                  ? 'bg-slate-800 border-slate-700 text-teal-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Włącz/wyłącz strefy komunikacji i wolnej przestrzeni"
            >
              <Footprints className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
              title="Obróć rzut o 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Stage & Interactive Plan Area (Enlarged by 1/3) */}
      <div 
        ref={containerRef}
        className={`relative flex-1 min-h-[620px] md:min-h-[700px] lg:min-h-[740px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 overflow-hidden select-none ${
          isRulerActive ? 'cursor-crosshair' : isRotating ? 'cursor-grabbing' : ''
        }`}
        onClick={() => {
          if (!isRulerActive && !isRotating) {
            setSelectedFurnitureId(null);
          }
        }}
      >
        {/* Subtle Ambient Lighting Backdrop */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 70%)',
          }}
        />

        {/* 2.5D Isometric Tilt Wrapper */}
        <div 
          className="relative max-w-full max-h-full transition-transform"
          style={isoTransformStyle}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full max-w-[1014px] h-auto drop-shadow-2xl"
            style={{ overflow: 'visible' }}
            onClick={handleSvgClick}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
          >
            <defs>
              {/* Pattern: Metric grid 0.5m */}
              <pattern
                id="grid-50cm"
                width={scale * 0.5}
                height={scale * 0.5}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${scale * 0.5} 0 L 0 0 0 ${scale * 0.5}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                />
              </pattern>

              {/* Pattern: Floor Texture (wood plank or tile grid) */}
              <pattern
                id="floor-planks"
                width={scale * 0.8}
                height={scale * 0.25}
                patternUnits="userSpaceOnUse"
              >
                <rect width={scale * 0.8} height={scale * 0.25} fill={floorFill} fillOpacity="0.85" />
                <path
                  d={`M 0 ${scale * 0.25} L ${scale * 0.8} ${scale * 0.25} M ${scale * 0.4} 0 L ${scale * 0.4} ${scale * 0.25}`}
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.8"
                  strokeOpacity="0.18"
                />
              </pattern>

              {/* Shadow filters for 2.5D extrusion */}
              <filter id="furniture-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
              </filter>
              <filter id="wall-shadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
              </filter>

              {/* Clearance zone hatched pattern */}
              <pattern id="clearance-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#14b8a6" strokeWidth="1.5" strokeOpacity="0.25" />
              </pattern>
            </defs>

            {/* 2.5D Extruded Wall Shadow (Pseudo 3D base) */}
            {viewMode === '2.5d_iso' && (
              <rect
                x={planLeft + 8}
                y={planTop + 14}
                width={planWidthPx}
                height={planLengthPx}
                rx="6"
                fill="#020617"
                fillOpacity="0.7"
                filter="url(#wall-shadow)"
              />
            )}

            {/* Room Base Floor */}
            <rect
              x={planLeft}
              y={planTop}
              width={planWidthPx}
              height={planLengthPx}
              rx="4"
              fill="url(#floor-planks)"
              stroke="#1e293b"
              strokeWidth="2"
            />

            {/* Metric 50cm Grid Overlay */}
            {showGrid && (
              <rect
                x={planLeft}
                y={planTop}
                width={planWidthPx}
                height={planLengthPx}
                fill="url(#grid-50cm)"
                pointerEvents="none"
              />
            )}

            {/* 2.5D Back & Left Wall Extrusion (Pseudo 3D height) */}
            {viewMode === '2.5d_iso' && (
              <g className="walls-3d-extrusion pointer-events-none">
                {/* Top/Back Wall Extrusion */}
                <polygon
                  points={`
                    ${planLeft},${planTop} 
                    ${planLeft + 12},${planTop - 18} 
                    ${planLeft + planWidthPx + 12},${planTop - 18} 
                    ${planLeft + planWidthPx},${planTop}
                  `}
                  fill={wallStroke}
                  fillOpacity="0.4"
                  stroke="#475569"
                  strokeWidth="1"
                />
                {/* Left Wall Extrusion */}
                <polygon
                  points={`
                    ${planLeft},${planTop} 
                    ${planLeft - 14},${planTop + 12} 
                    ${planLeft - 14},${planTop + planLengthPx + 12} 
                    ${planLeft},${planLengthPx + planTop}
                  `}
                  fill={wallStroke}
                  fillOpacity="0.55"
                  stroke="#334155"
                  strokeWidth="1"
                />
              </g>
            )}

            {/* Perimeter Wall Outline with realistic wall thickness (approx 15-20cm) */}
            <rect
              x={planLeft}
              y={planTop}
              width={planWidthPx}
              height={planLengthPx}
              fill="none"
              stroke={wallStroke}
              strokeWidth={viewMode === '2.5d_iso' ? 8 : 10}
              strokeLinejoin="round"
              rx="2"
            />

            {/* Wall Openings (Doors & Windows) */}
            <g className="openings-layer">
              {(room.openings || []).map((op: RoomOpening, idx: number) => {
                // Determine opening position along the top or bottom wall
                const opWidthPx = (op.width || 0.9) * scale;
                const isDoor = op.type === 'door';
                // Place door on bottom wall by default, windows on top
                const opX = planLeft + (planWidthPx * 0.35) + (idx * 60);
                const opY = isDoor ? planTop + planLengthPx : planTop;

                return (
                  <g key={op.id || idx}>
                    {/* Opening Cutout */}
                    <rect
                      x={opX}
                      y={opY - 5}
                      width={opWidthPx}
                      height={10}
                      fill={isDoor ? '#0f172a' : '#38bdf8'}
                      fillOpacity={isDoor ? 1 : 0.6}
                      stroke={isDoor ? '#e2e8f0' : '#bae6fd'}
                      strokeWidth="2"
                    />

                    {/* Door Swing Arc (90 deg arc showing space required to open door) */}
                    {isDoor && (
                      <g>
                        <path
                          d={`M ${opX} ${opY} A ${opWidthPx} ${opWidthPx} 0 0 1 ${opX + opWidthPx} ${opY - opWidthPx}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <line
                          x1={opX}
                          y1={opY}
                          x2={opX + opWidthPx}
                          y2={opY - opWidthPx}
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />
                        <text
                          x={opX + opWidthPx / 2}
                          y={opY + 16}
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {op.name || 'Drzwi'} ({op.width}m)
                        </text>
                      </g>
                    )}

                    {/* Window Sill Annotation */}
                    {!isDoor && (
                      <text
                        x={opX + opWidthPx / 2}
                        y={opY - 10}
                        fontSize="9"
                        fill="#38bdf8"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        {op.name || 'Okno'} ({op.width}m)
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Outlets & Installations (Gniazda, włączniki, hydraulika) */}
            {showOutlets && (
              <g className="outlets-layer">
                {(room.outlets || []).map((out: RoomOutlet) => {
                  const outXPx = planLeft + (out.x / 100) * planWidthPx;
                  const outYPx = planTop + (out.y / 100) * planLengthPx;
                  const isWater = out.type === 'water_in' || out.type === 'water_out';
                  const isSwitch = out.type === 'light_switch';

                  return (
                    <g key={out.id} className="cursor-pointer group">
                      <circle
                        cx={outXPx}
                        cy={outYPx}
                        r="6"
                        fill={isWater ? '#0284c7' : isSwitch ? '#eab308' : '#14b8a6'}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <title>{out.label} ({out.type})</title>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Ergonomic Clearance Halos around furniture (when enabled) */}
            {showClearance && (
              <g className="clearance-layer pointer-events-none">
                {(room.furniture || []).map((f) => {
                  const fXPx = planLeft + (f.x / 100) * planWidthPx;
                  const fYPx = planTop + (f.y / 100) * planLengthPx;
                  const fWPx = (f.width / 100) * planWidthPx;
                  const fHPx = (f.height / 100) * planLengthPx;
                  const halo = scale * 0.55; // 55cm clearance halo

                  return (
                    <rect
                      key={`clearance-${f.id}`}
                      x={fXPx - halo}
                      y={fYPx - halo}
                      width={fWPx + halo * 2}
                      height={fHPx + halo * 2}
                      rx="12"
                      fill="url(#clearance-pattern)"
                      stroke="#14b8a6"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.4"
                    />
                  );
                })}
              </g>
            )}

            {/* Furniture Blocks Layer */}
            <g className="furniture-layer">
              {(room.furniture || []).map((f) => {
                const fXPx = planLeft + (f.x / 100) * planWidthPx;
                const fYPx = planTop + (f.y / 100) * planLengthPx;
                const fWPx = (f.width / 100) * planWidthPx;
                const fHPx = (f.height / 100) * planLengthPx;
                const isSelected = f.id === selectedFurnitureId;
                const blockColor = f.color || '#3b82f6';
                const rotation = f.rotation || 0;

                // Real world dimensions in cm
                const realWcm = Math.round((f.width / 100) * roomWidth * 100);
                const realHcm = Math.round((f.height / 100) * roomLength * 100);

                return (
                  <g
                    key={f.id}
                    transform={`translate(${fXPx}, ${fYPx}) rotate(${rotation}, ${fWPx / 2}, ${fHPx / 2})`}
                    className="cursor-grab active:cursor-grabbing transition-transform"
                    onPointerDown={(e) => handlePointerDownFurniture(e, f.id)}
                    onPointerMove={handlePointerMoveFurniture}
                    onPointerUp={handlePointerUpFurniture}
                  >
                    {/* 2.5D Block Extrusion / 3D Shadow Side */}
                    {viewMode === '2.5d_iso' && (
                      <g className="block-3d-sides pointer-events-none">
                        {/* Side Shadow Extrusion */}
                        <polygon
                          points={`
                            ${fWPx},0 
                            ${fWPx + 6},-8 
                            ${fWPx + 6},${fHPx - 8} 
                            ${fWPx},${fHPx}
                          `}
                          fill="#0f172a"
                          fillOpacity="0.6"
                        />
                        {/* Top Face Extrusion */}
                        <polygon
                          points={`
                            0,0 
                            6,-8 
                            ${fWPx + 6},-8 
                            ${fWPx},0
                          `}
                          fill={blockColor}
                          fillOpacity="0.4"
                        />
                      </g>
                    )}

                    {/* Main Furniture Top Face */}
                    <rect
                      x="0"
                      y="0"
                      width={fWPx}
                      height={fHPx}
                      rx="4"
                      fill={blockColor}
                      fillOpacity={isSelected ? 0.95 : 0.82}
                      stroke={isSelected ? '#38bdf8' : '#0f172a'}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      filter={viewMode === '2.5d_iso' ? 'url(#furniture-drop-shadow)' : undefined}
                    />

                    {/* Inner styling & icon accent */}
                    <rect
                      x="3"
                      y="3"
                      width={Math.max(4, fWPx - 6)}
                      height={Math.max(4, fHPx - 6)}
                      rx="3"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeOpacity="0.2"
                    />

                    {/* Furniture Label & CM Dimensions */}
                    {fWPx > 32 && fHPx > 24 && (
                      <g className="pointer-events-none select-none">
                        <text
                          x={fWPx / 2}
                          y={fHPx / 2 - 2}
                          fontSize={Math.max(9, Math.min(12, fWPx / 7))}
                          fill="#ffffff"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontFamily="sans-serif"
                        >
                          {f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name}
                        </text>
                        <text
                          x={fWPx / 2}
                          y={fHPx / 2 + 10}
                          fontSize={Math.max(8, Math.min(10, fWPx / 9))}
                          fill="#cbd5e1"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontFamily="monospace"
                        >
                          {realWcm} × {realHcm} cm
                        </text>
                      </g>
                    )}

                    {/* Selection Ring & Visual Corner Handles + Top Stem for Direct Drag-and-Drop Rotation */}
                    {isSelected && !isRulerActive && (
                      <g className="selection-handles-layer">
                        {/* Selection Bounding Rect */}
                        <rect
                          x="-4"
                          y="-4"
                          width={fWPx + 8}
                          height={fHPx + 8}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          rx="5"
                        />

                        {/* Top Rotation Stem Line */}
                        <line
                          x1={fWPx / 2}
                          y1="-4"
                          x2={fWPx / 2}
                          y2="-24"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />

                        {/* Top Rotation Handle Knob (Circular Drag-and-Drop Icon) */}
                        <g
                          transform={`translate(${fWPx / 2}, -24)`}
                          className="cursor-grab active:cursor-grabbing group/stem"
                          onPointerDown={(e) => handlePointerDownRotate(e, f.id)}
                        >
                          <circle r="14" fill="transparent" />
                          <circle
                            r="8.5"
                            fill="#0284c7"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-transform group-hover/stem:scale-125 shadow-lg"
                          />
                          <path
                            d="M -3 -1 A 3.5 3.5 0 1 1 3 -1 M 3 -3.5 L 3 -1 L 0.5 -1"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <title>Przeciągnij uchwyt, aby obracać mebel</title>
                        </g>

                        {/* 4 Corner Rotation Handles (Drag directly on furniture corners) */}
                        {[
                          { id: 'tl', x: -4, y: -4 },
                          { id: 'tr', x: fWPx + 4, y: -4 },
                          { id: 'br', x: fWPx + 4, y: fHPx + 4 },
                          { id: 'bl', x: -4, y: fHPx + 4 },
                        ].map((corner) => (
                          <g
                            key={corner.id}
                            transform={`translate(${corner.x}, ${corner.y})`}
                            className="cursor-crosshair group/corner"
                            onPointerDown={(e) => handlePointerDownRotate(e, f.id)}
                          >
                            <circle r="12" fill="transparent" />
                            <circle
                              r="5"
                              fill="#0f172a"
                              stroke="#38bdf8"
                              strokeWidth="2"
                              className="transition-transform group-hover/corner:scale-135 group-active/corner:scale-110 shadow-md"
                            />
                            <circle r="2" fill="#38bdf8" className="pointer-events-none" />
                            <title>Przeciągnij narożnik, aby obrócić mebel</title>
                          </g>
                        ))}

                        {/* Active Rotation Guide HUD Overlay */}
                        {isRotating && rotatingFurnitureId === f.id && (
                          <g className="pointer-events-none select-none">
                            {/* Center Circular Angle Guide */}
                            <circle
                              cx={fWPx / 2}
                              cy={fHPx / 2}
                              r={Math.max(fWPx, fHPx) * 0.75}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                              strokeOpacity="0.6"
                            />
                            {/* Live Angle Badge above handle */}
                            <g transform={`translate(${fWPx / 2}, -44)`}>
                              <rect
                                x="-32"
                                y="-11"
                                width="64"
                                height="22"
                                rx="6"
                                fill="#0284c7"
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                              />
                              <text
                                x="0"
                                y="3"
                                fill="#ffffff"
                                fontSize="11"
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {f.rotation || 0}°
                              </text>
                            </g>
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Ruler Tool Layer (Linijka pomiarowa z dynamiczną odległością w metrach i cm) */}
            {isRulerActive && (
              <g className="ruler-layer">
                {/* Point A (Pierwszy punkt) */}
                {rulerPointA && (
                  <g className="ruler-point-a">
                    {/* Pulsing Target Ring */}
                    <circle
                      cx={rulerPointA.x}
                      cy={rulerPointA.y}
                      r="16"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      className="opacity-75"
                    />
                    <circle
                      cx={rulerPointA.x}
                      cy={rulerPointA.y}
                      r="6"
                      fill="#f59e0b"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    {/* Crosshair ticks */}
                    <line x1={rulerPointA.x - 12} y1={rulerPointA.y} x2={rulerPointA.x + 12} y2={rulerPointA.y} stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1={rulerPointA.x} y1={rulerPointA.y - 12} x2={rulerPointA.x} y2={rulerPointA.y + 12} stroke="#f59e0b" strokeWidth="1.5" />
                    
                    {/* Label Pill */}
                    <g transform={`translate(${rulerPointA.x}, ${rulerPointA.y - 18})`} className="pointer-events-none select-none">
                      <rect x="-44" y="-14" width="88" height="18" rx="5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                      <text x="0" y="-1" fill="#fde68a" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        Punkt A ({rulerPointA.mX.toFixed(2)}m)
                      </text>
                    </g>
                  </g>
                )}

                {/* Measurement Line & Point B (Fixed or Hovering) */}
                {rulerPointA && (rulerPointB || rulerHoverPoint) && (() => {
                  const activeEnd = rulerPointB || rulerHoverPoint;
                  if (!activeEnd) return null;
                  const isFixed = Boolean(rulerPointB);

                  const dxM = activeEnd.mX - rulerPointA.mX;
                  const dyM = activeEnd.mY - rulerPointA.mY;
                  const distM = Math.hypot(dxM, dyM);
                  const distCm = Math.round(distM * 100);

                  const midX = (rulerPointA.x + activeEnd.x) / 2;
                  const midY = (rulerPointA.y + activeEnd.y) / 2;

                  return (
                    <g className="ruler-measurement-visual">
                      {/* Dimension Line */}
                      <line
                        x1={rulerPointA.x}
                        y1={rulerPointA.y}
                        x2={activeEnd.x}
                        y2={activeEnd.y}
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray={isFixed ? undefined : '6 4'}
                        strokeLinecap="round"
                      />

                      {/* End Cap Ticks */}
                      <circle cx={rulerPointA.x} cy={rulerPointA.y} r="3" fill="#ffffff" />
                      <circle cx={activeEnd.x} cy={activeEnd.y} r="3" fill="#ffffff" />

                      {/* Point B Reticle */}
                      <g className="ruler-point-b">
                        <circle
                          cx={activeEnd.x}
                          cy={activeEnd.y}
                          r={isFixed ? 16 : 12}
                          fill="none"
                          stroke={isFixed ? '#10b981' : '#f59e0b'}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={activeEnd.x}
                          cy={activeEnd.y}
                          r="6"
                          fill={isFixed ? '#10b981' : '#f59e0b'}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        <line x1={activeEnd.x - 12} y1={activeEnd.y} x2={activeEnd.x + 12} y2={activeEnd.y} stroke={isFixed ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
                        <line x1={activeEnd.x} y1={activeEnd.y - 12} x2={activeEnd.x} y2={activeEnd.y + 12} stroke={isFixed ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
                        
                        {/* Label Pill */}
                        <g transform={`translate(${activeEnd.x}, ${activeEnd.y + 20})`} className="pointer-events-none select-none">
                          <rect x="-44" y="-12" width="88" height="18" rx="5" fill="#0f172a" stroke={isFixed ? '#10b981' : '#f59e0b'} strokeWidth="1" />
                          <text x="0" y="1" fill={isFixed ? '#a7f3d0' : '#fde68a'} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            {isFixed ? 'Punkt B' : 'Wskaźnik'} ({activeEnd.mX.toFixed(2)}m)
                          </text>
                        </g>
                      </g>

                      {/* Centered Distance Metric Badge */}
                      <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none select-none">
                        <rect
                          x="-78"
                          y="-24"
                          width="156"
                          height="48"
                          rx="10"
                          fill="#0f172a"
                          fillOpacity="0.96"
                          stroke={isFixed ? '#10b981' : '#f59e0b'}
                          strokeWidth="2"
                        />
                        <text
                          x="0"
                          y="-5"
                          fill={isFixed ? '#34d399' : '#fbbf24'}
                          fontSize="13"
                          fontWeight="900"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          📏 {distM.toFixed(2)} m ({distCm} cm)
                        </text>
                        <text
                          x="0"
                          y="13"
                          fill="#94a3b8"
                          fontSize="10"
                          fontWeight="semibold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          ΔX: {Math.abs(dxM).toFixed(2)}m • ΔY: {Math.abs(dyM).toFixed(2)}m
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Architectural Dimension Lines (Koty wymiarowe w metrach) */}
            {showDimensions && (
              <g className="dimension-lines-layer pointer-events-none select-none font-mono text-[11px]">
                {/* Top Width Dimension Line */}
                <line
                  x1={planLeft}
                  y1={planTop - 24}
                  x2={planLeft + planWidthPx}
                  y2={planTop - 24}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <line x1={planLeft} y1={planTop - 32} x2={planLeft} y2={planTop - 16} stroke="#94a3b8" strokeWidth="1.5" />
                <line x1={planLeft + planWidthPx} y1={planTop - 32} x2={planLeft + planWidthPx} y2={planTop - 16} stroke="#94a3b8" strokeWidth="1.5" />
                
                {/* Arrowheads Top */}
                <polygon points={`${planLeft},${planTop - 24} ${planLeft + 6},${planTop - 27} ${planLeft + 6},${planTop - 21}`} fill="#94a3b8" />
                <polygon points={`${planLeft + planWidthPx},${planTop - 24} ${planLeft + planWidthPx - 6},${planTop - 27} ${planLeft + planWidthPx - 6},${planTop - 21}`} fill="#94a3b8" />
                
                {/* Width Label Background & Text */}
                <rect x={planLeft + planWidthPx / 2 - 38} y={planTop - 36} width="76" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x={planLeft + planWidthPx / 2} y={planTop - 22} fill="#38bdf8" fontWeight="bold" textAnchor="middle">
                  {roomWidth.toFixed(2)} m
                </text>

                {/* Left Length Dimension Line */}
                <line
                  x1={planLeft - 24}
                  y1={planTop}
                  x2={planLeft - 24}
                  y2={planTop + planLengthPx}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <line x1={planLeft - 32} y1={planTop} x2={planLeft - 16} y2={planTop} stroke="#94a3b8" strokeWidth="1.5" />
                <line x1={planLeft - 32} y1={planTop + planLengthPx} x2={planLeft - 16} y2={planTop + planLengthPx} stroke="#94a3b8" strokeWidth="1.5" />

                {/* Arrowheads Left */}
                <polygon points={`${planLeft - 24},${planTop} ${planLeft - 27},${planTop + 6} ${planLeft - 21},${planTop + 6}`} fill="#94a3b8" />
                <polygon points={`${planLeft - 24},${planTop + planLengthPx} ${planLeft - 27},${planTop + planLengthPx - 6} ${planLeft - 21},${planTop + planLengthPx - 6}`} fill="#94a3b8" />

                {/* Length Label */}
                <rect x={planLeft - 44} y={planTop + planLengthPx / 2 - 12} width="40" height="24" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x={planLeft - 24} y={planTop + planLengthPx / 2 + 4} fill="#38bdf8" fontWeight="bold" textAnchor="middle">
                  {roomLength.toFixed(2)} m
                </text>
              </g>
            )}

            {/* Room Center Stamp */}
            <g className="pointer-events-none opacity-40">
              <text
                x={planLeft + planWidthPx / 2}
                y={planTop + planLengthPx / 2}
                fill="#ffffff"
                fontSize="18"
                fontWeight="900"
                letterSpacing="2"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="sans-serif"
              >
                {room.name.toUpperCase()}
              </text>
              <text
                x={planLeft + planWidthPx / 2}
                y={planTop + planLengthPx / 2 + 20}
                fill="#94a3b8"
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="monospace"
              >
                {roomArea.toFixed(2)} m² • H={roomHeight.toFixed(2)} m
              </text>
            </g>
          </svg>
        </div>

        {/* Ruler Tool Active HUD Banner */}
        {isRulerActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 px-4 py-2 shadow-2xl z-30">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                {!rulerPointA ? (
                  <span className="text-amber-200">
                    Krok 1: <strong className="text-white">Kliknij punkt początkowy</strong> na rzucie (np. narożnik mebla lub ścianę)
                  </span>
                ) : !rulerPointB ? (
                  <span className="text-amber-200">
                    Krok 2: <strong className="text-white">Kliknij punkt docelowy</strong>, aby zmierzyć odległość (Esc kasuje punkt)
                  </span>
                ) : (
                  <span className="text-emerald-300 font-bold">
                    Pomiar wykonany. Kliknij dowolne miejsce, aby rozpocząć nowy odcinek.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              {rulerPointA && (
                <button
                  onClick={() => {
                    setRulerPointA(null);
                    setRulerPointB(null);
                    setRulerHoverPoint(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition"
                >
                  Wyczyść
                </button>
              )}
              <button
                onClick={() => {
                  setIsRulerActive(false);
                  setRulerPointA(null);
                  setRulerPointB(null);
                  setRulerHoverPoint(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Zamknij linijkę"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Quick Action Overlay on Canvas */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* Compass & North Direction indicator */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-slate-800 shadow-md">
            <span className="font-bold text-teal-400">N ↑</span>
            <span>Rzut z góry</span>
          </div>

          {/* 2.5D Isometric Tilt Slider (when in 2.5D mode) */}
          {viewMode === '2.5d_iso' && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 border border-slate-800 text-[10px] text-slate-300">
              <span>Kąt 2.5D:</span>
              <input
                type="range"
                min="15"
                max="55"
                value={isoAngle}
                onChange={(e) => setIsoAngle(Number(e.target.value))}
                className="w-20 accent-teal-500 cursor-pointer h-1.5"
              />
              <span className="font-mono text-teal-300">{isoAngle}°</span>
            </div>
          )}
        </div>

        {/* Selected Furniture Floating Control Panel */}
        {selectedFurniture && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-teal-500/40 p-2 shadow-2xl z-20">
            <div className="px-3 py-1 border-r border-slate-800">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-teal-400" />
                <span>{selectedFurniture.name}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {Math.round((selectedFurniture.width / 100) * roomWidth * 100)} × {Math.round((selectedFurniture.height / 100) * roomLength * 100)} cm • Obrót: {selectedFurniture.rotation || 0}°
              </div>
            </div>

            <button
              onClick={handleRotateSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              title="Obróć mebel o 45 stopni"
            >
              <RotateCw className="w-3.5 h-3.5 text-teal-400" />
              <span>Obróć 45°</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 transition"
              title="Usuń ten mebel z rzutu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Space Planning KPI & Furniture List Bar */}
      <div className="border-t border-slate-800 bg-slate-950/90 p-4 space-y-4">
        
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Powierzchnia Całkowita</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">{roomArea.toFixed(2)} m²</div>
            <div className="text-[10px] text-slate-500">{roomWidth.toFixed(2)}m × {roomLength.toFixed(2)}m</div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-teal-400">Zabudowa Meblami</div>
            <div className="text-base font-bold font-mono text-teal-300 mt-0.5">
              {spaceMetrics.occupiedAreaM2} m² <span className="text-xs text-slate-400">({spaceMetrics.occupiedPercent}%)</span>
            </div>
            <div className="text-[10px] text-slate-500">{spaceMetrics.itemCount} obiektów w rzucie</div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Wolna Przestrzeń Użytkowa</div>
            <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
              {spaceMetrics.freeAreaM2} m² <span className="text-xs text-slate-400">({spaceMetrics.freePercent}%)</span>
            </div>
            <div className="text-[10px] text-slate-500">Strefy ruchu i komunikacji</div>
          </div>

          <div className={`rounded-xl border p-3 flex flex-col justify-center ${spaceMetrics.statusColor}`}>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Ocena Ergonomii</div>
            <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{spaceMetrics.statusLabel}</span>
            </div>
          </div>

        </div>

        {/* Space Utilization Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Bilans zajętości posadzki:
            </span>
            <span className="font-mono text-slate-400">
              <strong className="text-teal-400">{spaceMetrics.occupiedPercent}% meble</strong> • <strong className="text-cyan-400">{spaceMetrics.freePercent}% ciągi komunikacyjne</strong>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${spaceMetrics.occupiedPercent}%` }}
              title={`Zajętość meblami: ${spaceMetrics.occupiedPercent}%`}
            />
            <div 
              className="bg-slate-700/60 transition-all duration-300"
              style={{ width: `${spaceMetrics.freePercent}%` }}
              title={`Wolna przestrzeń: ${spaceMetrics.freePercent}%`}
            />
          </div>
        </div>

        {/* Furniture Chips & Add Preset Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1">Meble na rzucie:</span>
            {(room.furniture || []).map((f) => {
              const isSelected = f.id === selectedFurnitureId;
              return (
                <button
                  key={f.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFurnitureId(isSelected ? null : f.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: f.color || '#3b82f6' }} 
                  />
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Add Furniture Button with Dropdown Menu */}
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-md shadow-teal-950/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj mebel do rzutu</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {/* AI Ergonomics Consultation */}
            {onConsultAI && (
              <button
                onClick={() => {
                  const prompt = `Przeanalizuj ergonomię i planowanie przestrzeni dla pomieszczenia "${room.name}" (${roomWidth}m x ${roomLength}m, ${roomArea.toFixed(1)}m²). Meble w rzucie: ${(room.furniture || []).map(f => f.name).join(', ')}. Bilans zajętości: ${spaceMetrics.occupiedPercent}% meble, ${spaceMetrics.freePercent}% ciągi piesze. Czy układ spełnia normy ergonomiczne, czy odległości między meblami są optymalne i jak najlepiej ustawić wyposażenie?`;
                  onConsultAI(prompt);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
                title="Skonsultuj ustawienie mebli z inżynierem AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Audyt Ergonomii AI</span>
              </button>
            )}

            {/* Dropdown Menu for Adding Furniture */}
            {showAddMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-30 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Wybierz element wyposażenia:
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {FURNITURE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleAddPresetFurniture(preset)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-teal-300 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: preset.color }}
                        />
                        <span>{preset.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {preset.defaultWcm}×{preset.defaultHcm} cm
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
