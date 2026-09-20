'use client';

import React, { useState, useRef } from 'react';
import { Room, RoomFurniture, RoomOutlet } from '@/types/renovation';
import {
  Camera,
  Ruler,
  Plus,
  Sliders,
  UploadCloud,
  Grid,
  Box,
  X,
  Armchair,
} from 'lucide-react';
import { Room3DViewer } from '@/components/Room3DViewer';
import { CameraMeasurementScanner } from '@/components/CameraMeasurementScanner';
import { savePhotoBlob, usePhotoSrc, LOCAL_PHOTO_PREFIX } from '@/lib/db';

interface ViewRoomScanMeasureProps {
  room: Room;
  onUpdateRoomDimensions: (roomId: string, width: number, length: number, height: number) => void;
  onAddFurniture: (roomId: string, furniture: RoomFurniture) => void;
  onUpdateFurniture?: (roomId: string, furniture: RoomFurniture[]) => void;
  onDeleteFurniture?: (roomId: string, furnitureId: string) => void;
  onAddOutlet: (roomId: string, outlet: RoomOutlet) => void;
  onUpdateRoomDesign?: (roomId: string, design: Room['design']) => void;
  onUpdateRoomPhoto?: (roomId: string, photoUrl: string) => void;
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
  onUpdateRoomPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'3d' | 'blueprint' | 'camera_grid'>('3d');

  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const userPhotoUrlRef = useRef<string | null>(null);
  userPhotoUrlRef.current = userPhotoUrl;

  React.useEffect(() => {
    return () => {
      if (userPhotoUrlRef.current) {
        URL.revokeObjectURL(userPhotoUrlRef.current);
      }
    };
  }, []);

  const [showFurnitureModal, setShowFurnitureModal] = useState<boolean>(false);
  const [newFurnType, setNewFurnType] = useState<string>('sofa');
  const [newFurnName, setNewFurnName] = useState<string>('Sofa 3-osobowa');
  const [newFurnColor, setNewFurnColor] = useState<string>('#384252');
  const persistedPhotoSrc = usePhotoSrc(room.photoUrl);
  const activePhoto = userPhotoUrl || persistedPhotoSrc;

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

          {/* Clean Photo Upload Action */}
          <label className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-teal-500 transition cursor-pointer shadow-xs">
            <UploadCloud className="w-3.5 h-3.5 text-teal-400" />
            <span>Zmień zdjęcie pokoju</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (userPhotoUrl) {
                  URL.revokeObjectURL(userPhotoUrl);
                }
                const newObjUrl = URL.createObjectURL(file);
                setUserPhotoUrl(newObjUrl);
                const photoId = `${room.id}-${Date.now()}`;
                savePhotoBlob(photoId, file)
                  .then(() => onUpdateRoomPhoto?.(room.id, `${LOCAL_PHOTO_PREFIX}${photoId}`))
                  .catch((err) => console.error('Failed to save room photo', err));
              }}
            />
          </label>
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

    </div>
  );
};
