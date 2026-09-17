'use client';

import React, { useState, useRef, useMemo, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Room, RoomDesignPreset } from '@/types/renovation';
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
  createStuccoTexture 
} from '@/lib/procedural-textures';
import { 
  Palette, 
  Layers, 
  Sparkles, 
  Check, 
  Sliders, 
  Box, 
  Sun, 
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';

export interface MaterialOption {
  id: string;
  name: string;
  category: 'floor' | 'wall' | 'tiles';
  targetType: 'floor' | 'wall' | 'both';
  textureType: string;
  defaultColor: string;
  roughness: number;
  description: string;
  estimatedCost: number; // PLN / m2
}

export const MATERIAL_LIBRARY: MaterialOption[] = [
  // --- FLOORS ---
  {
    id: 'mat-oak-herringbone',
    name: 'Deska dębowa - jodełka klasyczna',
    category: 'floor',
    targetType: 'floor',
    textureType: 'herringbone',
    defaultColor: '#b48256',
    roughness: 0.32,
    description: 'Naturalny dąb europejski w tradycyjnym układzie jodełkowym, wykończenie olejowoskiem.',
    estimatedCost: 220,
  },
  {
    id: 'mat-oak-plank-bleached',
    name: 'Deska lita dąb bielony skandynawski',
    category: 'floor',
    targetType: 'floor',
    textureType: 'plank',
    defaultColor: '#d6c7b2',
    roughness: 0.35,
    description: 'Szeroka deska z mikrofazą, rozjaśniająca optycznie przestrzeń, lakier matowy.',
    estimatedCost: 195,
  },
  {
    id: 'mat-carrara-marble',
    name: 'Marmur Carrara biały wielkoformatowy',
    category: 'tiles',
    targetType: 'both',
    textureType: 'marble',
    defaultColor: '#f8fafc',
    roughness: 0.12,
    description: 'Włoski marmur bianco carrara z delikatnym popielatym użyleniem, polerowany spiek.',
    estimatedCost: 260,
  },
  {
    id: 'mat-nero-marble',
    name: 'Marmur Nero Marquina złote żyły',
    category: 'tiles',
    targetType: 'both',
    textureType: 'marble',
    defaultColor: '#1e293b',
    roughness: 0.15,
    description: 'Głęboki grafit i czerń przełamana złotymi oraz białymi pasmami mineralnymi.',
    estimatedCost: 280,
  },
  {
    id: 'mat-terrazzo-modern',
    name: 'Terrazzo / Lastryko matowe Venetian',
    category: 'floor',
    targetType: 'both',
    textureType: 'terrazzo',
    defaultColor: '#cbd5e1',
    roughness: 0.38,
    description: 'Szary kompozyt z zatopionym kruszywem bazaltowym i terakotowym, odporny na ścieranie.',
    estimatedCost: 175,
  },
  {
    id: 'mat-microcement-grey',
    name: 'Mikrocement podłogowy loft szary',
    category: 'floor',
    targetType: 'both',
    textureType: 'microcement',
    defaultColor: '#64748b',
    roughness: 0.45,
    description: 'Bezspoinowa powłoka poliuretanowo-cementowa o delikatnej satynowej fakturze paczkowej.',
    estimatedCost: 190,
  },
  {
    id: 'mat-stone-gres',
    name: 'Gres wielkoformatowy 120x60 kamień grafit',
    category: 'floor',
    targetType: 'both',
    textureType: 'tiles',
    defaultColor: '#334155',
    roughness: 0.28,
    description: 'Gres rektyfikowany o fakturze łupka kamiennego, klasa antypoślizgowości R10.',
    estimatedCost: 145,
  },

  // --- WALLS & PAINTS ---
  {
    id: 'mat-paint-white',
    name: 'Biel alpejska ceramiczna mat (RAL 9003)',
    category: 'wall',
    targetType: 'wall',
    textureType: 'matte',
    defaultColor: '#f8fafc',
    roughness: 0.88,
    description: 'Hydrofobowa farba ceramiczna odporna na plamy i szorowanie na mokro (klasa 1).',
    estimatedCost: 35,
  },
  {
    id: 'mat-paint-cashmere',
    name: 'Kaszmirowy piasek ciepły (Ciepły Beż)',
    category: 'wall',
    targetType: 'wall',
    textureType: 'matte',
    defaultColor: '#d8cbba',
    roughness: 0.85,
    description: 'Kojący, ciepły odcień naturalnej wełny i piasku. Idealny do salonów i sypialni.',
    estimatedCost: 38,
  },
  {
    id: 'mat-paint-sage',
    name: 'Szałwiowa zieleń nordycka (NCS S 3010-G10Y)',
    category: 'wall',
    targetType: 'wall',
    textureType: 'matte',
    defaultColor: '#5f7464',
    roughness: 0.82,
    description: 'Organiczny odcień inspirowany naturą. Świetny akcent na ścianę telewizyjną lub wezgłowie.',
    estimatedCost: 40,
  },
  {
    id: 'mat-paint-anthracite',
    name: 'Grafitowy antracyt głęboki aksamit',
    category: 'wall',
    targetType: 'wall',
    textureType: 'matte',
    defaultColor: '#1e293b',
    roughness: 0.85,
    description: 'Elegancka, pochłaniająca światło ściana akcentowa budująca kontrast w aranżacji.',
    estimatedCost: 42,
  },
  {
    id: 'mat-wall-slats',
    name: 'Lamele ścienne dębowe akustyczne',
    category: 'wall',
    targetType: 'wall',
    textureType: 'slats',
    defaultColor: '#b48256',
    roughness: 0.35,
    description: 'Pionowe listwy z forniru dębowego na grubym czarnym filcu redukującym pogłos pomieszczenia.',
    estimatedCost: 210,
  },
  {
    id: 'mat-brick-natural',
    name: 'Cegła rozbiórkowa naturalna lico',
    category: 'wall',
    targetType: 'wall',
    textureType: 'brick',
    defaultColor: '#9a3412',
    roughness: 0.95,
    description: 'Oryginalne płytki z XIX-wiecznej cegły ceramicznej z fugą gruboziarnistą w stylu loft.',
    estimatedCost: 160,
  },
  {
    id: 'mat-concrete-panels',
    name: 'Płyty betonu architektonicznego 120x60',
    category: 'wall',
    targetType: 'wall',
    textureType: 'concrete_panels',
    defaultColor: '#64748b',
    roughness: 0.65,
    description: 'Prefabrykowane płyty z betonu GRC z widocznymi otworami montażowymi po kotwach.',
    estimatedCost: 185,
  },
  {
    id: 'mat-subway-tiles',
    name: 'Kafelki metro białe fazowane z połyskiem',
    category: 'tiles',
    targetType: 'both',
    textureType: 'subway_tiles',
    defaultColor: '#ffffff',
    roughness: 0.1,
    description: 'Klasyczne cegiełki paryskiego metra z fazowaną krawędzią odbijającą refleksy światła.',
    estimatedCost: 110,
  },
  {
    id: 'mat-stucco-fine',
    name: 'Tynk strukturalny / Stiuk wapienny',
    category: 'wall',
    targetType: 'wall',
    textureType: 'stucco',
    defaultColor: '#f1f5f9',
    roughness: 0.75,
    description: 'Ekologiczny tynk mineralny z drobnoziarnistą fakturą woskowaną.',
    estimatedCost: 130,
  },
];

// React Three Fiber 3D Material Sample Sphere/Tile
interface MaterialSampleMeshProps {
  color: string;
  textureType: string;
  roughness: number;
  geometryType: 'sphere' | 'tile';
}

function MaterialSampleMesh({ color, textureType, roughness, geometryType }: MaterialSampleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate appropriate canvas texture based on textureType
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    switch (textureType) {
      case 'herringbone':
        return createWoodTexture('herringbone', color);
      case 'plank':
        return createWoodTexture('plank', color);
      case 'marble':
        return createMarbleTexture(color);
      case 'terrazzo':
        return createTerrazzoTexture(color);
      case 'microcement':
        return createMicrocementTexture(color);
      case 'tiles':
        return createTileTexture(color);
      case 'slats':
        return createWoodSlatsTexture(color);
      case 'brick':
        return createBrickTexture(color);
      case 'concrete_panels':
        return createConcretePanelsTexture(color);
      case 'subway_tiles':
        return createSubwayTileTexture(color);
      case 'stucco':
        return createStuccoTexture(color);
      default:
        return null;
    }
  }, [textureType, color]);

  // Gentle auto-rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      if (geometryType === 'tile') {
        meshRef.current.rotation.x = 0.25;
      } else {
        meshRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      }
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[0, 0, 0]}>
      {geometryType === 'sphere' ? (
        <sphereGeometry args={[1.35, 64, 64]} />
      ) : (
        <boxGeometry args={[2.1, 2.1, 0.2]} />
      )}
      <meshStandardMaterial
        color={texture ? undefined : color}
        map={texture || undefined}
        roughness={roughness}
        metalness={roughness < 0.2 ? 0.2 : 0.03}
      />
    </mesh>
  );
}

interface MaterialEditorR3FProps {
  room: Room;
  onUpdateRoomDesign: (roomId: string, design: Room['design']) => void;
}

export const MaterialEditorR3F: React.FC<MaterialEditorR3FProps> = ({
  room,
  onUpdateRoomDesign,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'floor' | 'wall' | 'tiles'>('all');
  const [activeMaterial, setActiveMaterial] = useState<MaterialOption>(MATERIAL_LIBRARY[0]);
  const [customColor, setCustomColor] = useState<string>(activeMaterial.defaultColor);
  const [customRoughness, setCustomRoughness] = useState<number>(activeMaterial.roughness);
  const [previewGeo, setPreviewGeo] = useState<'sphere' | 'tile'>('sphere');
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [appliedFeedback, setAppliedFeedback] = useState<'floor' | 'wall' | null>(null);

  // When material item is clicked
  const handleSelectMaterial = (mat: MaterialOption) => {
    setActiveMaterial(mat);
    setCustomColor(mat.defaultColor);
    setCustomRoughness(mat.roughness);
  };

  // Apply to floor
  const handleApplyToFloor = () => {
    const updated: RoomDesignPreset = {
      ...room.design,
      floorType: activeMaterial.name,
      floorColor: customColor,
      floorTexture: activeMaterial.textureType as any,
      floorRoughness: customRoughness,
    };
    onUpdateRoomDesign(room.id, updated);
    setAppliedFeedback('floor');
    setTimeout(() => setAppliedFeedback(null), 2400);
  };

  // Apply to walls
  const handleApplyToWalls = () => {
    const updated: RoomDesignPreset = {
      ...room.design,
      wallType: activeMaterial.name,
      wallColor: customColor,
      wallTexture: activeMaterial.textureType as any,
      wallRoughness: customRoughness,
    };
    onUpdateRoomDesign(room.id, updated);
    setAppliedFeedback('wall');
    setTimeout(() => setAppliedFeedback(null), 2400);
  };

  const filteredMaterials = MATERIAL_LIBRARY.filter((m) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  const isAppliedToFloor = room.design.floorType === activeMaterial.name;
  const isAppliedToWall = room.design.wallType === activeMaterial.name;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-6 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Palette className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Interaktywny Edytor Materiałów (React Three Fiber)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Wybierz teksturę z biblioteki i nałóż ją na ściany lub podłogę. Zmiany natychmiast odzwierciedlają się w podglądzie 3D pokoju.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'floor', label: 'Podłogi' },
            { id: 'wall', label: 'Farby & Ściany' },
            { id: 'tiles', label: 'Kafelki & Spieki' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive 3D Sample Inspector with R3F */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                Próbnik Fizyczny 3D (PBR)
              </span>
              <span className="rounded bg-teal-950 px-1.5 py-0.5 text-[9px] font-mono text-teal-300 border border-teal-800">
                WebGL
              </span>
            </div>

            {/* Geometry Toggle */}
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setPreviewGeo('sphere')}
                title="Kula próbki materiału"
                className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                  previewGeo === 'sphere' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kula
              </button>
              <button
                onClick={() => setPreviewGeo('tile')}
                title="Płytka próbki materiału"
                className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                  previewGeo === 'tile' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Płytka
              </button>
            </div>
          </div>

          {/* 3D Canvas via React Three Fiber */}
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-radial from-slate-900 to-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
            {hasMounted ? (
              <Canvas
                shadows
                camera={{ position: [0, 0, 3.8], fov: 45 }}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              >
                <ambientLight intensity={0.8} />
                <directionalLight position={[4, 5, 4]} intensity={2.0} castShadow />
                <directionalLight position={[-4, 2, -2]} intensity={0.6} color="#93c5fd" />
                <pointLight position={[0, -2, 2]} intensity={0.5} color="#fef08a" />
                <MaterialSampleMesh
                  color={customColor}
                  textureType={activeMaterial.textureType}
                  roughness={customRoughness}
                  geometryType={previewGeo}
                />
              </Canvas>
            ) : (
              <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span>Ładowanie silnika 3D...</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 pointer-events-none rounded bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono text-slate-400 border border-slate-800">
              Obracaj próbkę • Odbicia światła na żywo
            </div>
          </div>

          {/* Active Material Parameters Tuning */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">{activeMaterial.name}</h4>
                <p className="text-[11px] text-slate-400">{activeMaterial.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-teal-300">
                  ~{activeMaterial.estimatedCost} zł / m²
                </span>
              </div>
            </div>

            {/* Color & Tint Adjuster */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Odcień / Barwa:</span>
                <span className="font-mono text-teal-400">{customColor}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-slate-700 bg-slate-900"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['#f8fafc', '#d8cbba', '#b48256', '#5f7464', '#1e293b', '#64748b', '#9a3412'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCustomColor(c)}
                      className="h-6 w-6 rounded-md border border-slate-700 hover:scale-110 transition shadow-xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Roughness / Glossiness Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Wykończenie (Połysk / Mat):</span>
                <span className="font-mono text-teal-400">
                  {customRoughness < 0.2 ? 'Wysoki Połysk' : customRoughness < 0.5 ? 'Satyna / Półmat' : 'Głęboki Mat'} ({customRoughness.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={customRoughness}
                onChange={(e) => setCustomRoughness(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Polerowany (Lustrzany)</span>
                <span>Satyna</span>
                <span>Mat ceramiczny</span>
              </div>
            </div>

            {/* Apply Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                id="apply-material-floor-btn"
                onClick={handleApplyToFloor}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition shadow-sm ${
                  isAppliedToFloor
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-teal-600 text-white hover:bg-teal-500'
                }`}
              >
                {isAppliedToFloor ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <Layers className="w-3.5 h-3.5" />}
                <span>{isAppliedToFloor ? 'Na podłodze ✓' : 'Nałóż na Podłogę'}</span>
              </button>

              <button
                id="apply-material-walls-btn"
                onClick={handleApplyToWalls}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition shadow-sm ${
                  isAppliedToWall
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {isAppliedToWall ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <Palette className="w-3.5 h-3.5" />}
                <span>{isAppliedToWall ? 'Na ścianach ✓' : 'Nałóż na Ściany'}</span>
              </button>
            </div>

            {appliedFeedback && (
              <div className="rounded-lg bg-teal-500/20 border border-teal-500/40 py-1.5 px-3 text-center text-xs font-semibold text-teal-300 animate-in fade-in duration-200">
                {appliedFeedback === 'floor' ? 'Zaktualizowano posadzkę w podglądzie 3D!' : 'Zaktualizowano ściany w podglądzie 3D!'}
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Material Swatches Grid */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Katalog Dostępnych Materiałów ({filteredMaterials.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Kliknij próbkę, aby sprawdzić właściwości PBR
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1 no-scrollbar">
            {filteredMaterials.map((mat) => {
              const isSelected = activeMaterial.id === mat.id;
              const isOnFloor = room.design.floorType === mat.name;
              const isOnWall = room.design.wallType === mat.name;

              return (
                <div
                  key={mat.id}
                  onClick={() => handleSelectMaterial(mat)}
                  className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-400 bg-teal-950/30 ring-2 ring-teal-400/40 shadow-lg'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Material Color / Thumbnail Swatch */}
                    <div 
                      className="h-12 w-12 shrink-0 rounded-lg border border-slate-700/80 shadow-md relative overflow-hidden"
                      style={{ backgroundColor: mat.defaultColor }}
                    >
                      {/* Subtle pattern simulation preview */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/25 to-transparent pointer-events-none" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-100 truncate group-hover:text-teal-300 transition">
                          {mat.name}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {mat.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80 text-[10px]">
                        <span className="font-mono text-teal-300 font-semibold">
                          ok. {mat.estimatedCost} zł / m²
                        </span>
                        <div className="flex items-center gap-1">
                          {isOnFloor && (
                            <span className="rounded bg-teal-950 border border-teal-800 px-1 py-0.2 text-[9px] text-teal-300 font-medium">
                              Podłoga
                            </span>
                          )}
                          {isOnWall && (
                            <span className="rounded bg-cyan-950 border border-cyan-800 px-1 py-0.2 text-[9px] text-cyan-300 font-medium">
                              Ściana
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">Aktualne wykończenie {room.name}:</span>
              <span>Podłoga: <strong className="text-teal-300">{room.design.floorType}</strong></span>
              <span>•</span>
              <span>Ściany: <strong className="text-cyan-300">{room.design.wallType}</strong></span>
            </div>
            <span className="font-mono text-slate-500 text-[10px] hidden sm:inline">
              Fizyczne shadery PBR
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
