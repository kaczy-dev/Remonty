'use client';

import React, { useState, useRef } from 'react';
import { Room, RoomFurniture, RoomOutlet } from '@/types/renovation';
import { 
  Camera, 
  Ruler, 
  Scan, 
  Eye, 
  Layers, 
  Plus, 
  Maximize2, 
  RotateCw, 
  Sliders, 
  CheckCircle2, 
  Info, 
  UploadCloud,
  Grid,
  Box,
  Sparkles,
  X,
  Armchair,
  Columns2,
  ArrowLeftRight,
  Monitor,
  Check
} from 'lucide-react';
import { Room3DViewer } from '@/components/Room3DViewer';
import { CameraMeasurementScanner } from '@/components/CameraMeasurementScanner';

interface ViewRoomScanMeasureProps {
  room: Room;
  onUpdateRoomDimensions: (roomId: string, width: number, length: number, height: number) => void;
  onAddFurniture: (roomId: string, furniture: RoomFurniture) => void;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onDeleteFurniture?: (roomId: string, furnitureId: string) => void;
  onAddOutlet: (roomId: string, outlet: RoomOutlet) => void;
  onUpdateRoomDesign?: (roomId: string, design: Room['design']) => void;
  onNavigateToStep?: (step: string) => void;
}

export const ViewRoomScanMeasure: React.FC<ViewRoomScanMeasureProps> = ({
  room,
  onUpdateRoomDimensions,
  onAddFurniture,
  onUpdateFurniture,
  onDeleteFurniture,
  onAddOutlet,
  onUpdateRoomDesign,
}) => {
  const [activeTab, setActiveTab] = useState<'3d' | 'blueprint' | 'split' | 'before_after' | 'scan' | 'camera_grid'>('3d');
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [beforeAfterSplitPct, setBeforeAfterSplitPct] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  const [showDetectedBoxes, setShowDetectedBoxes] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isScanningSim, setIsScanningSim] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [showFurnitureModal, setShowFurnitureModal] = useState<boolean>(false);
  const [newFurnType, setNewFurnType] = useState<string>('sofa');
  const [newFurnName, setNewFurnName] = useState<string>('Sofa 3-osobowa');
  const [newFurnColor, setNewFurnColor] = useState<string>('#384252');
  const activePhoto = userPhotoUrl || room.photoUrl;

  // Local dimension inputs
  const [width, setWidth] = useState(room.width);
  const [length, setLength] = useState(room.length);
  const [height, setHeight] = useState(room.height);

  const handleApplyDimensions = (newW: number, newL: number, newH: number) => {
    setWidth(newW);
    setLength(newL);
    setHeight(newH);
    onUpdateRoomDimensions(room.id, newW, newL, newH);
  };

  const handleSliderPointerMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, Math.round((offsetX / rect.width) * 100)));
    setBeforeAfterSplitPct(pct);
  };

  const handleSimulateScan = () => {
    setIsScanningSim(true);
    setTimeout(() => {
      setIsScanningSim(false);
      setShowDetectedBoxes(true);
    }, 1200);
  };

  const filteredEntities = room.detectedEntities.filter((ent) => {
    if (filterCategory === 'all') return true;
    return ent.category === filterCategory;
  });

  // Reusable 2D Blueprint SVG Canvas
  const renderBlueprintCanvas = (compact = false) => (
    <div className={`relative w-full ${compact ? 'aspect-[16/10] max-h-[440px]' : 'aspect-[4/3] max-h-[420px]'} rounded-xl border border-slate-700/80 bg-slate-950 p-4 overflow-hidden flex items-center justify-center select-none shadow-inner`}>
      {/* Subtle Blueprint Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`blueprint-grid-${compact ? 'compact' : 'full'}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#blueprint-grid-${compact ? 'compact' : 'full'})`} />
      </svg>

      {/* Floorplan Room Outline */}
      <svg viewBox="0 0 500 400" className="w-full h-full max-h-[380px] drop-shadow-xl">
        <defs>
          <linearGradient id={`floorMatGrad-${compact ? 'c' : 'f'}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Horizontal Top Dimension */}
        <line x1="60" y1="35" x2="440" y2="35" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="60" y1="28" x2="60" y2="42" stroke="#10b981" strokeWidth="2" />
        <line x1="440" y1="28" x2="440" y2="42" stroke="#10b981" strokeWidth="2" />
        <text x="250" y="28" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          SZEROKOŚĆ: {room.width.toFixed(2)} m
        </text>

        {/* Vertical Left Dimension */}
        <line x1="35" y1="60" x2="35" y2="340" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="28" y1="60" x2="42" y2="60" stroke="#10b981" strokeWidth="2" />
        <line x1="28" y1="340" x2="42" y2="340" stroke="#10b981" strokeWidth="2" />
        <text x="22" y="200" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle" transform="rotate(-90 22 200)" fontFamily="monospace">
          DŁUGOŚĆ: {room.length.toFixed(2)} m
        </text>

        {/* Room Floor Rectangle */}
        <rect 
          x="60" 
          y="60" 
          width="380" 
          height="280" 
          fill={`url(#floorMatGrad-${compact ? 'c' : 'f'})`}
          stroke="#475569" 
          strokeWidth="8" 
          rx="2"
        />

        {/* Door Opening and Swing Arc */}
        <g transform="translate(340, 336)">
          <rect x="0" y="0" width="60" height="8" fill="#020617" />
          <line x1="0" y1="4" x2="0" y2="-55" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 0 -55 A 55 55 0 0 1 55 4" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="-10" y="16" fill="#38bdf8" fontSize="9" fontWeight="medium">Drzwi 80cm</text>
        </g>

        {/* Window */}
        {room.openings.some(o => o.type === 'window') && (
          <g transform="translate(180, 56)">
            <rect x="0" y="0" width="100" height="8" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2" />
            <line x1="0" y1="4" x2="100" y2="4" stroke="#ffffff" strokeWidth="1.5" />
            <text x="50" y="-8" fill="#38bdf8" fontSize="9" textAnchor="middle">Okno HS</text>
          </g>
        )}

        {/* Interactive Furniture Items */}
        {room.furniture.map((item) => {
          const isSel = selectedFurnitureId === item.id;
          const itemX = 60 + (item.x * 380) / 100;
          const itemY = 60 + (item.y * 280) / 100;
          const itemW = (item.width * 380) / 100;
          const itemH = (item.height * 280) / 100;

          return (
            <g 
              key={item.id}
              onClick={() => setSelectedFurnitureId(item.id)}
              className="cursor-pointer transition hover:opacity-90"
            >
              <rect 
                x={itemX} 
                y={itemY} 
                width={itemW} 
                height={itemH} 
                rx="4"
                fill={isSel ? '#0d9488' : '#1e293b'} 
                fillOpacity={isSel ? 0.45 : 0.8}
                stroke={isSel ? '#2dd4bf' : '#64748b'} 
                strokeWidth={isSel ? 2.5 : 1.5}
              />
              <text 
                x={itemX + itemW / 2} 
                y={itemY + itemH / 2} 
                fill={isSel ? '#2dd4bf' : '#e2e8f0'} 
                fontSize="9" 
                fontWeight="semibold"
                textAnchor="middle" 
                dominantBaseline="middle"
              >
                {item.name}
              </text>
            </g>
          );
        })}

        {/* Outlets & Sanitary Nodes */}
        {room.outlets.map((out) => {
          const outX = 60 + (out.x * 380) / 100;
          const outY = 60 + (out.y * 280) / 100;
          const isWater = out.type.startsWith('water');

          return (
            <g key={out.id} transform={`translate(${outX}, ${outY})`}>
              <circle 
                r="6" 
                fill={isWater ? '#0284c7' : '#f59e0b'} 
                stroke="#ffffff" 
                strokeWidth="1.5" 
              />
              <text 
                x="10" 
                y="3" 
                fill={isWater ? '#7dd3fc' : '#fde68a'} 
                fontSize="8" 
                fontFamily="sans-serif"
              >
                {out.label}
              </text>
            </g>
          );
        })}

        {/* Center Area Watermark */}
        <text 
          x="250" 
          y="210" 
          fill="#475569" 
          fontSize="16" 
          fontWeight="bold" 
          textAnchor="middle" 
          opacity="0.4"
          fontFamily="monospace"
        >
          {room.area.toFixed(2)} m²
        </text>
      </svg>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Controller: Mode Tabs & Room Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-3d-btn"
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === '3d'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Realistyczne 3D</span>
            </button>
            <button
              id="tab-blueprint-btn"
              onClick={() => setActiveTab('blueprint')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'blueprint'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Rzut 2D</span>
            </button>
            <button
              id="tab-split-btn"
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'split'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split (2D/3D)</span>
            </button>
            <button
              id="tab-before-after-btn"
              onClick={() => setActiveTab('before_after')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'before_after'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Przed / Po</span>
            </button>
            <button
              id="tab-scan-btn"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'scan'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Skaner Foto AI</span>
            </button>
            <button
              id="tab-camera-grid-btn"
              onClick={() => setActiveTab('camera_grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'camera_grid'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Pomiar Kamerą (AR)</span>
            </button>
          </div>

          {/* Fullscreen Showcase Trigger Button */}
          <button
            onClick={() => setIsShowcaseOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/40 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/60 hover:text-white transition shadow-sm"
            title="Otwórz pełnoekranowy tryb prezentacji dla klienta"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Prezentacja Klienta</span>
          </button>
        </div>

        {/* Calculated Room Metrics Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-teal-300">
            <span className="text-slate-400 text-[10px] uppercase block">Posadzka</span>
            <strong className="text-sm font-mono">{room.area.toFixed(2)} m²</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase block">Ściany netto</span>
            <strong className="text-sm font-mono">{room.wallArea.toFixed(1)} m²</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase block">Obwód</span>
            <strong className="text-sm font-mono">{room.perimeter.toFixed(2)} mb</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase block">Wysokość</span>
            <strong className="text-sm font-mono">{room.height.toFixed(2)} m</strong>
          </div>
        </div>
      </div>

      {/* Mode 0: Realistic 3D Interactive Studio View */}
      {activeTab === '3d' && (
        <div className="space-y-6">
          <Room3DViewer 
            room={room} 
            onUpdateRoomDesign={onUpdateRoomDesign}
            onUpdateFurniture={onUpdateFurniture}
            onDeleteFurniture={onDeleteFurniture}
            onOpenShowcase={() => setIsShowcaseOpen(true)}
          />

          {/* Quick Dimensions & Geometry Sync Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Szerokość ściany frontowej:</span>
                <span className="font-mono text-teal-400 font-bold">{width.toFixed(2)} m</span>
              </div>
              <input 
                type="range" 
                min="2.0" 
                max="10.0" 
                step="0.05" 
                value={width}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleApplyDimensions(val, length, height);
                }}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>min 2.0m</span>
                <span>max 10.0m</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Długość ściany bocznej:</span>
                <span className="font-mono text-teal-400 font-bold">{length.toFixed(2)} m</span>
              </div>
              <input 
                type="range" 
                min="2.0" 
                max="12.0" 
                step="0.05" 
                value={length}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleApplyDimensions(width, val, height);
                }}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>min 2.0m</span>
                <span>max 12.0m</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Wysokość kondygnacji:</span>
                <span className="font-mono text-teal-400 font-bold">{height.toFixed(2)} m</span>
              </div>
              <input 
                type="range" 
                min="2.2" 
                max="4.5" 
                step="0.05" 
                value={height}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleApplyDimensions(width, length, val);
                }}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>2.2m (niski strop)</span>
                <span>4.5m (kamienica/loft)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 1: 2D Blueprint Room View */}
      {activeTab === 'blueprint' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 2D Canvas Area */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-teal-400" />
                  Rzut Aksonometryczny 2D - Siatka Milimetrowa
                </h3>
                <p className="text-xs text-slate-400">
                  Interaktywny rzut pomieszczenia w skali. Kliknij element, aby poznać parametry instalacyjne.
                </p>
              </div>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-300">
                Skala 1:25 • Wymiary w metrach
              </span>
            </div>

            {/* SVG Architectural Canvas */}
            {renderBlueprintCanvas(false)}

            {/* Canvas Legend & Quick Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  Elementy wyposażenia
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Podejścia wod-kan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Punkty elektryczne 230V
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedFurnitureId(null)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                >
                  Reset zaznaczenia
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Dimension Controls & Technical Calculation */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Dimension Sliders Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                Wymiary Geometryczne Pomieszczenia
              </h4>
              <p className="text-xs text-slate-400">
                Dostosuj pomiary laserowe. Aplikacja natychmiast przeliczy zapotrzebowanie na płytki, farby i listwy.
              </p>

              {/* Width Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Szerokość (A):</span>
                  <span className="font-mono text-teal-300 font-bold">{width.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.05"
                  value={width}
                  onChange={(e) => handleApplyDimensions(parseFloat(e.target.value), length, height)}
                  className="w-full accent-teal-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
              </div>

              {/* Length Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Długość (B):</span>
                  <span className="font-mono text-teal-300 font-bold">{length.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="12.0"
                  step="0.05"
                  value={length}
                  onChange={(e) => handleApplyDimensions(width, parseFloat(e.target.value), height)}
                  className="w-full accent-teal-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
              </div>

              {/* Height Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Wysokość do sufitu (H):</span>
                  <span className="font-mono text-teal-300 font-bold">{height.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="2.2"
                  max="4.0"
                  step="0.05"
                  value={height}
                  onChange={(e) => handleApplyDimensions(width, length, parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
              </div>

              {/* Mathematical Formula Preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Pole posadzki (A × B):</span>
                  <strong className="text-white font-mono">{room.area.toFixed(2)} m²</strong>
                </div>
                <div className="flex justify-between">
                  <span>Obwód (2A + 2B):</span>
                  <strong className="text-white font-mono">{room.perimeter.toFixed(2)} mb</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pow. ścian brutto (Obwód × H):</span>
                  <strong className="text-white font-mono">{(room.perimeter * room.height).toFixed(2)} m²</strong>
                </div>
                <div className="flex justify-between text-teal-300 border-t border-slate-800 pt-1.5">
                  <span>Pow. ścian netto (- otwory):</span>
                  <strong className="font-mono">{room.wallArea.toFixed(2)} m²</strong>
                </div>
              </div>
            </div>

            {/* Quick Add Outlet / Fixture Widget */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Dodaj Punkt na Rzucie
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddOutlet(room.id, {
                    id: `out-${Date.now()}`,
                    type: 'socket',
                    label: 'Gniazdo 230V',
                    x: 50,
                    y: 90,
                  })}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-200 hover:bg-slate-800 hover:border-teal-500 transition text-center font-medium"
                >
                  + Gniazdo 230V
                </button>
                <button
                  onClick={() => onAddOutlet(room.id, {
                    id: `out-${Date.now()}`,
                    type: 'light_switch',
                    label: 'Włącznik LED',
                    x: 88,
                    y: 88,
                  })}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-200 hover:bg-slate-800 hover:border-teal-500 transition text-center font-medium"
                >
                  + Włącznik LED
                </button>
                <button
                  onClick={() => setShowFurnitureModal(true)}
                  className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-2 text-xs text-teal-200 hover:bg-teal-900/50 hover:border-teal-400 transition text-center font-medium flex items-center justify-center gap-1"
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>+ Mebel 3D</span>
                </button>
                <button
                  onClick={() => onAddOutlet(room.id, {
                    id: `out-${Date.now()}`,
                    type: 'water_in',
                    label: 'Podejście wodne',
                    x: 30,
                    y: 20,
                  })}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-200 hover:bg-slate-800 hover:border-teal-500 transition text-center font-medium"
                >
                  + Punkt Wod-Kan
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Mode Split: Synchronized 2D Blueprint & 3D WebGL Studio */}
      {activeTab === 'split' && (
        <div className="space-y-4">
          {/* Dual Sync Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-teal-950/30 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-teal-300 font-semibold">
              <span className="flex h-2.5 w-2.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Symultaniczna synchronizacja 2D ⇄ 3D: rzut aksonometryczny i silnik WebGL PBR</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span>Wymiary: <strong className="text-white font-mono">{width.toFixed(2)}m × {length.toFixed(2)}m</strong></span>
              <span>•</span>
              <span>Powierzchnia: <strong className="text-teal-300 font-mono">{room.area.toFixed(2)} m²</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left: 2D Blueprint Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Rzut Płaski 2D (Siatka 1:25)
                  </h3>
                </div>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {room.furniture.length} mebli • {room.outlets.length} punktów el.
                </span>
              </div>

              {renderBlueprintCanvas(true)}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" /> Meble</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Gniazda 230V</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Wod-Kan</span>
                </div>
                <button
                  onClick={() => setSelectedFurnitureId(null)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white"
                >
                  Odznacz
                </button>
              </div>
            </div>

            {/* Right: 3D WebGL Studio */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Wizualizacja PBR 3D w Czasie Rzeczywistym
                  </h3>
                </div>
                <button
                  onClick={() => setIsShowcaseOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-teal-500/40 bg-teal-950/60 px-2.5 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-900/60 transition"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Pełny Ekran</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 h-[480px]">
                <Room3DViewer
                  room={room}
                  onUpdateRoomDesign={onUpdateRoomDesign}
                  onUpdateFurniture={onUpdateFurniture}
                  onDeleteFurniture={onDeleteFurniture}
                  onOpenShowcase={() => setIsShowcaseOpen(true)}
                  className="h-[480px]"
                />
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Wskazówka: Kliknij i przeciągnij mebel w 3D, by zmienić jego pozycję. Zmiana natychmiast odzwierciedli się na rzucie 2D.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode Before/After: Interactive Comparison Slider */}
      {activeTab === 'before_after' && (
        <div className="space-y-6">
          
          {/* Top description & Quick Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-teal-400" />
                Interaktywne Porównanie: Przed i Po Remoncie
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Przesuń suwak horyzontalnie, aby zobaczyć metamorfozę z zastanego stanu inwentaryzacyjnego do wyrenderowanego projektu 3D.
              </p>
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setBeforeAfterSplitPct(0)}
                className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                  beforeAfterSplitPct === 0 ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tylko Przed
              </button>
              <button
                onClick={() => setBeforeAfterSplitPct(25)}
                className={`px-2 py-1 rounded-lg transition font-medium text-[11px] ${
                  beforeAfterSplitPct === 25 ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                25%
              </button>
              <button
                onClick={() => setBeforeAfterSplitPct(50)}
                className={`px-2 py-1 rounded-lg transition font-medium text-[11px] ${
                  beforeAfterSplitPct === 50 ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                50% (Split)
              </button>
              <button
                onClick={() => setBeforeAfterSplitPct(75)}
                className={`px-2 py-1 rounded-lg transition font-medium text-[11px] ${
                  beforeAfterSplitPct === 75 ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                75%
              </button>
              <button
                onClick={() => setBeforeAfterSplitPct(100)}
                className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                  beforeAfterSplitPct === 100 ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tylko Po
              </button>
            </div>
          </div>

          {/* Interactive Drag Split Stage */}
          <div
            ref={sliderContainerRef}
            onPointerDown={(e) => {
              setIsDraggingSlider(true);
              handleSliderPointerMove(e.clientX);
            }}
            onPointerMove={(e) => {
              if (isDraggingSlider) {
                handleSliderPointerMove(e.clientX);
              }
            }}
            onPointerUp={() => setIsDraggingSlider(false)}
            className="relative w-full h-[520px] rounded-2xl overflow-hidden select-none border border-slate-800 bg-slate-950 shadow-2xl cursor-ew-resize"
          >
            {/* UNDER LAYER: "PO REMONCIE" (Full width under layer) */}
            <div className="absolute inset-0 w-full h-full">
              <Room3DViewer
                room={room}
                onUpdateRoomDesign={onUpdateRoomDesign}
                onUpdateFurniture={onUpdateFurniture}
                onDeleteFurniture={onDeleteFurniture}
                className="w-full h-full"
              />
              {/* Po Remoncie Badge */}
              <div className="absolute top-4 right-4 pointer-events-none rounded-xl border border-teal-500/40 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-teal-300 shadow-lg flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>PO REMONCIE (PROJEKT 3D PBR)</span>
              </div>
            </div>

            {/* OVER LAYER: "PRZED REMONTEM" (Clipped by width = beforeAfterSplitPct%) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-teal-400 shadow-2xl bg-slate-950"
              style={{ width: `${beforeAfterSplitPct}%` }}
            >
              <div className="relative w-full h-full min-w-[320px]">
                <img
                  src={activePhoto}
                  alt="Przed remontem"
                  className="w-full h-full object-cover filter contrast-105 brightness-90"
                />

                {/* Construction Scan Grid Overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="before-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#before-grid)" />
                </svg>

                {/* Overlaid detected entity boxes on the photo */}
                {room.detectedEntities.map((ent) => (
                  <div
                    key={ent.id}
                    className="absolute border border-dashed border-amber-400/80 bg-amber-500/15 rounded-md pointer-events-none"
                    style={{
                      left: `${ent.boundingBox.x}%`,
                      top: `${ent.boundingBox.y}%`,
                      width: `${ent.boundingBox.width}%`,
                      height: `${ent.boundingBox.height}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950 uppercase tracking-tight">
                      {ent.name} ({Math.round(ent.confidence * 100)}%)
                    </span>
                  </div>
                ))}

                {/* Przed Remoncie Badge */}
                <div className="absolute top-4 left-4 pointer-events-none rounded-xl border border-amber-500/40 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-amber-300 shadow-lg flex items-center gap-2">
                  <Scan className="w-3.5 h-3.5 text-amber-400" />
                  <span>PRZED REMONTEM (STAN ZASTANY)</span>
                </div>

                {/* Technical notes watermark */}
                <div className="absolute bottom-4 left-4 pointer-events-none rounded-lg bg-slate-950/85 backdrop-blur-sm p-2.5 text-[11px] text-slate-300 border border-slate-800 space-y-1 max-w-xs shadow-lg">
                  <div className="font-semibold text-amber-400">Raport inwentaryzacyjny:</div>
                  <div>• Wykryto: surowe podłoże, ubytki tynków</div>
                  <div>• Zmierzone wymiary: {room.width.toFixed(2)}m × {room.length.toFixed(2)}m</div>
                  <div>• Zastane punkty instalacji: {room.outlets.length} szt.</div>
                </div>
              </div>
            </div>

            {/* DRAGGABLE DIVIDER HANDLE */}
            <div
              className="absolute top-0 bottom-0 z-20 flex items-center justify-center -translate-x-1/2 pointer-events-none"
              style={{ left: `${beforeAfterSplitPct}%` }}
            >
              {/* Vertical line glow */}
              <div className="w-1 h-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
              
              {/* Thumb Circle */}
              <div className="absolute flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-teal-500 text-slate-950 shadow-xl pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition">
                <ArrowLeftRight className="w-5 h-5" />
              </div>

              {/* Percentage tooltip */}
              <div className="absolute -bottom-8 rounded-md bg-slate-950/90 border border-teal-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300 shadow">
                {beforeAfterSplitPct}%
              </div>
            </div>

          </div>

          {/* Transformation Matrix / Specification Diff */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              Zestawienie Transformacji Budowlano-Projektowej
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">1. Posadzka i Podłoga</span>
                <div className="text-xs text-rose-300 line-through">Stara wylewka / ubytki</div>
                <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Nowa posadzka: {room.design.floorType}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Powierzchnia: <strong>{room.area.toFixed(2)} m²</strong> + 10% naddatku na docinki.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">2. Ściany i Tynki</span>
                <div className="text-xs text-rose-300 line-through">Spękany tynk, nierówności</div>
                <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Gładź Q4 + farba {room.design.wallColor}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pow. ścian netto: <strong>{room.wallArea.toFixed(1)} m²</strong> (2 warstwy malowania).
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">3. Oświetlenie & PBR</span>
                <div className="text-xs text-rose-300 line-through">Pojedynczy zwis sufitowy</div>
                <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Strefy LED + Bloom ({room.design.lightingTempK}K)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Współczynnik oddawania barw Ra &gt; 90, oświetlenie podszafkowe i sufitowe.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">4. Ergonomia & Meble</span>
                <div className="text-xs text-rose-300 line-through">Pusta, nieustawna przestrzeń</div>
                <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>{room.furniture.length} dopasowanych brył mebli</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Zachowane ciągi komunikacyjne &gt; 80 cm i strefy bezpiecznych odległości.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Mode 2: Computer Vision Photo Scanner */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Photo Viewport with Detected Entity Overlays */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-teal-400" />
                  Wizualny Skaner Przestrzenny Pomieszczenia
                </h3>
                <p className="text-xs text-slate-400">
                  Rozpoznawanie krawędzi ścian, posadzki, pionów instalacyjnych oraz otworów drzwiowych i okiennych.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="simulate-scan-btn"
                  onClick={handleSimulateScan}
                  disabled={isScanningSim}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isScanningSim ? 'animate-spin' : ''}`} />
                  <span>{isScanningSim ? 'Analizowanie geometrii...' : 'Ponów Analizę AI'}</span>
                </button>
                <button
                  onClick={() => setShowDetectedBoxes(!showDetectedBoxes)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    showDetectedBoxes
                      ? 'border-teal-500/50 bg-teal-950/40 text-teal-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showDetectedBoxes ? 'Ukryj ramki' : 'Pokaż ramki'}</span>
                </button>
              </div>
            </div>

            {/* Filter Layer Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1">Filtr warstw:</span>
              {[
                { id: 'all', label: 'Wszystkie wykryte' },
                { id: 'wall', label: 'Ściany' },
                { id: 'floor', label: 'Posadzka' },
                { id: 'installation', label: 'Piony / Instalacje' },
                { id: 'door', label: 'Drzwi i Otwory' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filterCategory === f.id
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Image Stage with Bounding Box Overlays */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black select-none shadow-2xl">
              
              {/* Main Room Photo */}
              <img 
                src={activePhoto} 
                alt={room.name} 
                className={`w-full h-full object-cover transition duration-500 ${
                  isScanningSim ? 'brightness-75 blur-xs' : 'brightness-95'
                }`}
              />

              {/* Scanning Laser Animation */}
              {isScanningSim && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-teal-400/30 to-transparent animate-pulse h-24 w-full top-1/3" />
              )}

              {/* Bounding Box Overlays */}
              {showDetectedBoxes && !isScanningSim && filteredEntities.map((ent) => {
                const isSelected = selectedEntityId === ent.id;
                const { x, y, width, height } = ent.boundingBox;

                return (
                  <div
                    key={ent.id}
                    onClick={() => setSelectedEntityId(ent.id)}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className={`absolute cursor-pointer border-2 transition-all rounded-md ${
                      isSelected
                        ? 'border-teal-300 bg-teal-500/25 ring-4 ring-teal-400/30 shadow-lg'
                        : 'border-cyan-400/80 bg-cyan-500/10 hover:border-teal-300 hover:bg-teal-500/15'
                    }`}
                  >
                    <div className="absolute -top-6 left-0 flex items-center gap-1 rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-teal-200 border border-teal-500/40 backdrop-blur-xs whitespace-nowrap">
                      <span>{ent.name}</span>
                      <span className="text-[9px] font-mono text-teal-400">
                        ({Math.round(ent.confidence * 100)}%)
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Watermark badge */}
              <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2 py-1 text-[10px] font-mono text-slate-400 border border-slate-800">
                CV Model: RenovAI Vision v2.4 • 4 Wykryte Encje
              </div>
            </div>

          </div>

          {/* Right Column: Detected Entities & Diagnostic Breakdown */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Wykryte Elementy i Rekomendacje
              </h4>
              <p className="text-xs text-slate-400">
                Kliknij element, aby zobaczyć stan techniczny i wytyczne wykonawcze.
              </p>

              <div className="space-y-2.5">
                {room.detectedEntities.map((ent) => {
                  const isSelected = selectedEntityId === ent.id;

                  return (
                    <div
                      key={ent.id}
                      onClick={() => setSelectedEntityId(ent.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        isSelected
                          ? 'border-teal-500 bg-teal-950/30 text-white'
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-100">{ent.name}</span>
                        <span className="font-mono text-[10px] text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-500/30">
                          {Math.round(ent.confidence * 100)}% pewności
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {ent.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload Card */}
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-center space-y-2 hover:border-teal-500/60 transition">
              <UploadCloud className="w-8 h-8 text-teal-400 mx-auto" />
              <div className="text-xs font-semibold text-slate-200">
                Wgraj własne zdjęcie pomieszczenia
              </div>
              <p className="text-[11px] text-slate-400">
                Przeciągnij plik JPG/PNG lub kliknij, aby uruchomić aparat w telefonie. Zdjęcia przetwarzane są wyłącznie w pamięci podręcznej.
              </p>
              <label className="inline-block cursor-pointer rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition">
                Wybierz plik ze zdjęciem
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const url = URL.createObjectURL(e.target.files[0]);
                      setUserPhotoUrl(url);
                      handleSimulateScan();
                    }
                  }}
                />
              </label>
            </div>

          </div>

        </div>
      )}

      {/* Mode 3: Real-Time Camera Measurement Grid (getUserMedia) */}
      {activeTab === 'camera_grid' && (
        <div className="space-y-4">
          <CameraMeasurementScanner
            roomWidth={width}
            roomLength={length}
            roomHeight={height}
            onApplyMeasuredDimensions={(w, l, h) => {
              handleApplyDimensions(w, l, h);
            }}
          />
        </div>
      )}

      {/* Modal: Dodaj Mebel 3D do pomieszczenia */}
      {showFurnitureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Armchair className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-slate-100">Dodaj Mebel 3D do Pomieszczenia</h3>
              </div>
              <button
                onClick={() => setShowFurnitureModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Wybór modelu 3D */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Typ modelu 3D / Bryła:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sofa', name: 'Sofa / Kanapa', defaultColor: '#384252' },
                    { id: 'table', name: 'Stół jadalniany', defaultColor: '#854d0e' },
                    { id: 'coffee_table', name: 'Stolik kawowy', defaultColor: '#f1f5f9' },
                    { id: 'tv_cabinet', name: 'Szafka RTV + TV', defaultColor: '#1e293b' },
                    { id: 'bed', name: 'Łóżko sypialniane', defaultColor: '#f8fafc' },
                    { id: 'wardrobe', name: 'Szafa garderobiana', defaultColor: '#78350f' },
                    { id: 'plant', name: 'Monstera w donicy', defaultColor: '#ffffff' },
                    { id: 'chair', name: 'Fotel wypoczynkowy', defaultColor: '#0f766e' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setNewFurnType(m.id);
                        setNewFurnName(m.name);
                        setNewFurnColor(m.defaultColor);
                      }}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        newFurnType === m.id
                          ? 'border-teal-500 bg-teal-950/40 text-teal-200 ring-1 ring-teal-400'
                          : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold block">{m.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">model: {m.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nazwa mebla */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nazwa własna mebla:</label>
                <input
                  type="text"
                  value={newFurnName}
                  onChange={(e) => setNewFurnName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Kolor / Wykończenie */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kolor / Materiał:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newFurnColor}
                    onChange={(e) => setNewFurnColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                  />
                  <span className="font-mono text-slate-300">{newFurnColor}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowFurnitureModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  const dims: Record<string, { w: number; h: number }> = {
                    sofa: { w: 32, h: 22 },
                    table: { w: 26, h: 18 },
                    coffee_table: { w: 16, h: 16 },
                    tv_cabinet: { w: 30, h: 14 },
                    bed: { w: 28, h: 32 },
                    wardrobe: { w: 24, h: 16 },
                    plant: { w: 12, h: 12 },
                    chair: { w: 16, h: 16 },
                  };
                  const currentDim = dims[newFurnType] || { w: 20, h: 20 };

                  onAddFurniture(room.id, {
                    id: `furn-${Date.now()}`,
                    name: newFurnName,
                    x: 45,
                    y: 45,
                    width: currentDim.w,
                    height: currentDim.h,
                    rotation: 0,
                    iconType: newFurnType,
                    model3DUrl: newFurnType,
                    color: newFurnColor,
                  });
                  setShowFurnitureModal(false);
                }}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500"
              >
                Dodaj Mebel do Wizualizacji 3D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ARCHITECTURAL SHOWCASE PRESENTATION MODAL */}
      {isShowcaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-200">
          {/* Top Bar for Client Presentation */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {room.name} — Prezentacja Architektoniczna 3D
                  </h2>
                  <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300 border border-teal-500/30">
                    Live PBR Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Wymiary: {room.width.toFixed(2)}m × {room.length.toFixed(2)}m • Powierzchnia: {room.area.toFixed(2)} m² • Wysokość: {room.height.toFixed(2)} m
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Tryb Prezentacyjny dla Inwestora</span>
              </div>
              <button
                onClick={() => setIsShowcaseOpen(false)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Zamknij Pełny Ekran</span>
              </button>
            </div>
          </div>

          {/* Fullscreen 3D Stage */}
          <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
            <Room3DViewer
              room={room}
              onUpdateRoomDesign={onUpdateRoomDesign}
              onUpdateFurniture={onUpdateFurniture}
              onDeleteFurniture={onDeleteFurniture}
              className="w-full h-full"
            />

            {/* Bottom floating presentation telemetry HUD */}
            <div className="absolute bottom-6 left-6 right-6 pointer-events-none flex flex-wrap items-center justify-between gap-4">
              <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 shadow-2xl text-xs">
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Styl:</span>
                  <strong className="text-teal-300 capitalize">{room.design.style || 'Nowoczesny'}</strong>
                </div>
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Podłoga:</span>
                  <span className="text-white capitalize">{room.design.floorType}</span>
                </div>
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Ściany:</span>
                  <span className="text-white capitalize">{room.design.wallColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Oświetlenie:</span>
                  <span className="font-mono text-amber-300">{room.design.lightingTempK}K</span>
                </div>
              </div>

              <div className="pointer-events-auto rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md px-3.5 py-2 text-[11px] text-slate-400 shadow-xl">
                <span>Wskazówka: Użyj LPM do obrotu, PPM do przesuwania, Rolka do powiększenia</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
