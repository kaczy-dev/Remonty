'use client';

import React, { useState } from 'react';
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
  Grid
} from 'lucide-react';

interface ViewRoomScanMeasureProps {
  room: Room;
  onUpdateRoomDimensions: (roomId: string, width: number, length: number, height: number) => void;
  onAddFurniture: (roomId: string, furniture: RoomFurniture) => void;
  onAddOutlet: (roomId: string, outlet: RoomOutlet) => void;
  onNavigateToStep?: (step: string) => void;
}

export const ViewRoomScanMeasure: React.FC<ViewRoomScanMeasureProps> = ({
  room,
  onUpdateRoomDimensions,
  onAddFurniture,
  onAddOutlet,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'blueprint'>('blueprint');
  const [showDetectedBoxes, setShowDetectedBoxes] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isScanningSim, setIsScanningSim] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
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

  return (
    <div className="space-y-6">
      
      {/* Top Controller: Mode Tabs & Room Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-blueprint-btn"
              onClick={() => setActiveTab('blueprint')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'blueprint'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Rzut 2D & Geometria</span>
            </button>
            <button
              id="tab-scan-btn"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'scan'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Skaner Foto AI</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            Wybrane: <strong className="text-white">{room.name}</strong>
          </span>
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
            <div className="relative w-full aspect-[4/3] rounded-xl border border-slate-700/80 bg-slate-950 p-4 overflow-hidden flex items-center justify-center select-none shadow-inner">
              
              {/* Subtle Blueprint Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Floorplan Room Outline */}
              <svg 
                viewBox="0 0 500 400" 
                className="w-full h-full max-h-[380px] drop-shadow-xl"
              >
                <defs>
                  <linearGradient id="floorMatGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Outer Dimension Lines */}
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
                  fill="url(#floorMatGrad)" 
                  stroke="#475569" 
                  strokeWidth="8" 
                  rx="2"
                />

                {/* Door Opening and Swing Arc */}
                <g transform="translate(340, 336)">
                  {/* Door frame gap */}
                  <rect x="0" y="0" width="60" height="8" fill="#020617" />
                  {/* Door leaf */}
                  <line x1="0" y1="4" x2="0" y2="-55" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                  {/* Swing arc */}
                  <path d="M 0 -55 A 55 55 0 0 1 55 4" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x="-10" y="16" fill="#38bdf8" fontSize="9" fontWeight="medium">Drzwi 80cm</text>
                </g>

                {/* Window (if available) */}
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
                        fillOpacity={isSel ? 0.4 : 0.8}
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
                  onClick={() => onAddFurniture(room.id, {
                    id: `furn-${Date.now()}`,
                    name: 'Nowy element',
                    x: 40,
                    y: 40,
                    width: 25,
                    height: 25,
                    rotation: 0,
                    iconType: 'box',
                  })}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-200 hover:bg-slate-800 hover:border-teal-500 transition text-center font-medium"
                >
                  + Mebel / Zabudowa
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

    </div>
  );
};
