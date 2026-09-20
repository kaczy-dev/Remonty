'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, MaterialCalculation } from '@/types/renovation';
import {
  Palette,
  Boxes,
  ShoppingCart,
  CheckCircle,
  Circle,
  Plus,
  Calculator,
  Sparkles,
  Layers,
  Box,
  Percent,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { Room3DViewer } from '@/components/Room3DViewer';

interface ViewDesignMaterialsProps {
  room: Room;
  materials: MaterialCalculation[];
  onToggleMaterialPurchased: (matId: string) => void;
  onAddMaterial: (material: MaterialCalculation) => void;
  onUpdateRoomDesign: (roomId: string, newDesign: Room['design']) => void;
  onUpdateFurniture?: (roomId: string, furniture: Room['furniture']) => void;
  onConsultAI?: (prompt: string) => void;
}

export const ViewDesignMaterials: React.FC<ViewDesignMaterialsProps> = ({
  room,
  materials,
  onToggleMaterialPurchased,
  onAddMaterial,
  onUpdateRoomDesign,
  onUpdateFurniture,
  onConsultAI,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'shopping'>('design');
  const [previewMode, setPreviewMode] = useState<'3d' | 'flat'>('3d');
  const [showAddModal, setShowAddModal] = useState(false);

  // Waste Calculation Engine State (e.g. +10% waste margin based on room dimensions)
  const [wasteMarginPercent, setWasteMarginPercent] = useState<number>(10);
  const [autoWasteNotice, setAutoWasteNotice] = useState<string | null>(null);

  // New material form state
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<MaterialCalculation['category']>('podłogi');
  const [newMatBaseQuantity, setNewMatBaseQuantity] = useState(10);
  const [newMatWastePercent, setNewMatWastePercent] = useState(10);
  const [newMatUnit, setNewMatUnit] = useState<MaterialCalculation['unit']>('m²');
  const [newMatPrice, setNewMatPrice] = useState(120);

  const roomMaterials = materials.filter((m) => m.roomId === room.id);
  const totalMaterialsCost = roomMaterials.reduce((sum, m) => sum + m.totalPrice, 0);
  const purchasedMaterialsCost = roomMaterials
    .filter((m) => m.purchased)
    .reduce((sum, m) => sum + m.totalPrice, 0);

  // Computed Room-based Dimensions with Waste Margins:
  const floorNet = room.area;
  const floorGross = Number((floorNet * (1 + wasteMarginPercent / 100)).toFixed(2));
  const floorPacks = Math.ceil(floorGross / 2.22); // Standard pack ~2.22 m2

  const baseboardNet = room.perimeter;
  const baseboardGross = Number((baseboardNet * (1 + wasteMarginPercent / 100)).toFixed(1));
  const baseboardPieces = Math.ceil(baseboardGross / 2.4); // 2.40m length

  const wallNet = room.wallArea;
  const wallPaintLiters = Number(((wallNet * 2 / 12) * (1 + wasteMarginPercent / 100)).toFixed(1)); // 2 coats, 12m2/L
  const wallPaintCans = Math.ceil(wallPaintLiters / 2.5); // 2.5L cans

  const adhesiveKg = Number((floorNet * 4.5 * (1 + wasteMarginPercent / 100)).toFixed(1)); // 4.5kg/m2
  const adhesiveBags = Math.ceil(adhesiveKg / 25); // 25kg bags

  const primerLiters = Number(((floorNet + wallNet) * 0.15 * (1 + wasteMarginPercent / 100)).toFixed(1));
  const primerCans = Math.ceil(primerLiters / 5);

  const handleApplyAutoCalculatedMaterials = () => {
    // Generate calculated materials with exact waste explanations
    const floorItem: MaterialCalculation = {
      id: `mat-auto-floor-${Date.now()}`,
      roomId: room.id,
      name: `${room.design.floorType || 'Posadzka / Wykończenie podłogowe'} (Zapas +${wasteMarginPercent}%)`,
      category: 'podłogi',
      formulaExplanation: `Powierzchnia netto ${floorNet.toFixed(2)} m² + ${wasteMarginPercent}% naddatku na ścinki skrajne = ${floorGross} m² (${floorPacks} pełnych paczek po 2.22 m²)`,
      baseQuantity: floorNet,
      wasteMarginPercent: wasteMarginPercent,
      finalQuantity: floorGross,
      unit: 'm²',
      estimatedUnitPrice: 180,
      totalPrice: floorGross * 180,
      purchased: false,
    };

    const baseboardItem: MaterialCalculation = {
      id: `mat-auto-bb-${Date.now()}`,
      roomId: room.id,
      name: `Listwy przypodłogowe MDF 80mm z narożnikami (+${wasteMarginPercent}%)`,
      category: 'stolarka',
      formulaExplanation: `Obwód netto ${baseboardNet.toFixed(1)} mb + ${wasteMarginPercent}% zapasu na zacięcia kątowe 45° = ${baseboardGross} mb (${baseboardPieces} sztuk po 2.40m)`,
      baseQuantity: baseboardNet,
      wasteMarginPercent: wasteMarginPercent,
      finalQuantity: baseboardGross,
      unit: 'mb',
      estimatedUnitPrice: 32,
      totalPrice: baseboardGross * 32,
      purchased: false,
    };

    const paintItem: MaterialCalculation = {
      id: `mat-auto-paint-${Date.now()}`,
      roomId: room.id,
      name: `${room.design.wallType || 'Farba ceramiczna nawierzchniowa'} (+${wasteMarginPercent}%)`,
      category: 'ściany',
      formulaExplanation: `Powierzchnia ścian ${wallNet.toFixed(1)} m² × 2 warstwy kryjące / wydajność 12 m²/l + ${wasteMarginPercent}% zapasu = ${wallPaintLiters} l (${wallPaintCans} puszek 2.5L)`,
      baseQuantity: Number((wallNet * 2 / 12).toFixed(1)),
      wasteMarginPercent: wasteMarginPercent,
      finalQuantity: wallPaintLiters,
      unit: 'l',
      estimatedUnitPrice: 45,
      totalPrice: wallPaintLiters * 45,
      purchased: false,
    };

    const adhesiveItem: MaterialCalculation = {
      id: `mat-auto-adh-${Date.now()}`,
      roomId: room.id,
      name: `Klej montażowy / elastyczny do podłogi (+${wasteMarginPercent}%)`,
      category: 'chemia_budowlana',
      formulaExplanation: `Zużycie 4.5 kg/m² × ${floorNet.toFixed(2)} m² + ${wasteMarginPercent}% naddatku = ${adhesiveKg} kg (${adhesiveBags} worków 25kg)`,
      baseQuantity: Number((floorNet * 4.5).toFixed(1)),
      wasteMarginPercent: wasteMarginPercent,
      finalQuantity: adhesiveBags,
      unit: 'opak.',
      estimatedUnitPrice: 65,
      totalPrice: adhesiveBags * 65,
      purchased: false,
    };

    onAddMaterial(floorItem);
    onAddMaterial(baseboardItem);
    onAddMaterial(paintItem);
    onAddMaterial(adhesiveItem);

    setAutoWasteNotice(`Pomyślnie zsynchronizowano zapotrzebowanie materiałowe z zapasem +${wasteMarginPercent}% dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleCreateCustomMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;

    const finalQty = Number((newMatBaseQuantity * (1 + newMatWastePercent / 100)).toFixed(2));

    const item: MaterialCalculation = {
      id: `mat-${Date.now()}`,
      roomId: room.id,
      name: newMatName,
      category: newMatCategory,
      formulaExplanation: `Ilość bazowa ${newMatBaseQuantity} ${newMatUnit} + ${newMatWastePercent}% zapasu na ścinki/straty = ${finalQty} ${newMatUnit}`,
      baseQuantity: newMatBaseQuantity,
      wasteMarginPercent: newMatWastePercent,
      finalQuantity: finalQty,
      unit: newMatUnit,
      estimatedUnitPrice: newMatPrice,
      totalPrice: finalQty * newMatPrice,
      purchased: false,
    };

    onAddMaterial(item);
    setNewMatName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-design-studio-btn"
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'design'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Studio Wykończeń</span>
            </button>
            <button
              id="tab-materials-calc-btn"
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'materials'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulator Zapotrzebowania</span>
            </button>
            <button
              id="tab-shopping-list-btn"
              onClick={() => setActiveTab('shopping')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'shopping'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Lista Zakupów ({roomMaterials.filter(m => !m.purchased).length})</span>
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300">
            <span className="text-[10px] uppercase text-slate-400 block">Kupione materiały</span>
            <strong className="text-emerald-400 font-mono font-bold">{purchasedMaterialsCost.toFixed(0)} PLN</strong>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-teal-300">
            <span className="text-[10px] uppercase text-slate-400 block">Łączny szacunek</span>
            <strong className="text-white font-mono font-bold">{totalMaterialsCost.toFixed(0)} PLN</strong>
          </div>
        </div>
      </div>

      {/* Mode 1: Design & Materials Swatches Studio */}
      {activeTab === 'design' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Visual Ambiance / Moodboard Preview Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 flex flex-col justify-between max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Wizualizacja Wnętrza na Żywo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Wybieraj materiały i kolory — scena 3D aktualizuje się w czasie rzeczywistym.
                </p>
              </div>

              {/* 3D vs 2D Switcher */}
              <div className="flex flex-wrap rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1">
                <button
                  id="preview-mode-3d-btn"
                  onClick={() => setPreviewMode('3d')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    previewMode === '3d'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Model</span>
                </button>
                <button
                  id="preview-mode-flat-btn"
                  onClick={() => setPreviewMode('flat')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    previewMode === 'flat'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Karta 2D</span>
                </button>
              </div>
            </div>

            {/* 3D WebGL Scene or 2D Composite */}
            {previewMode === '3d' ? (
              <div className="w-full">
                <Room3DViewer
                  room={room}
                  onUpdateRoomDesign={onUpdateRoomDesign}
                  onUpdateFurniture={onUpdateFurniture}
                  className="border-slate-700/80 shadow-inner"
                />
              </div>
            ) : (
              /* Simulated 2D Room Layer Composite */
              <div 
                className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-700/80 p-5 flex flex-col justify-between shadow-2xl transition-all duration-300"
                style={{
                  backgroundColor: room.design.wallColor,
                  filter: `brightness(${room.design.lightingTempK === 2700 ? '0.96' : '1.02'})`,
                }}
              >
                {/* Lighting Glow Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    background: room.design.lightingTempK === 2700 
                      ? 'radial-gradient(circle at 50% 20%, rgba(251, 191, 36, 0.25) 0%, transparent 70%)'
                      : room.design.lightingTempK === 4000
                      ? 'radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)'
                      : 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
                  }}
                />

                {/* Top Tag */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="rounded-lg bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white border border-slate-700">
                    {room.name} • {room.area.toFixed(1)} m²
                  </span>
                  <span className="rounded-lg bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-amber-300 border border-slate-700">
                    {room.design.lightingTempK}K Oświetlenie
                  </span>
                </div>

                {/* Bottom Simulated Floor Strip */}
                <div 
                  className="relative z-10 w-full h-36 rounded-lg border-t-2 border-slate-900/60 p-3 flex flex-col justify-end shadow-xl transition-all duration-300"
                  style={{
                    backgroundColor: room.design.floorColor,
                  }}
                >
                  <div className="rounded bg-slate-950/80 backdrop-blur-xs px-2 py-1 text-[11px] font-medium text-white max-w-max border border-slate-700">
                    Posadzka: {room.design.floorType}
                  </div>
                </div>
              </div>
            )}

          </div>

        </motion.div>
      )}

      {/* Mode 2: Dynamic Material Calculation Formulas & Automated Waste Engine */}
      {activeTab === 'materials' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* Automatic Material Waste / Reserve Engine (Room Dimensions Based) */}
          <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40">
                    <Percent className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Automatyczny Silnik Zapasu i Ścinek ({room.name})
                  </h3>
                  <span className="rounded-md border border-teal-500/30 bg-teal-950/60 px-2 py-0.5 text-[10px] font-mono text-teal-300">
                    ISO / PN-EN
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Wyliczenia w oparciu o geometrię: posadzka <strong className="text-white font-mono">{room.area.toFixed(2)} m²</strong>, ściany <strong className="text-white font-mono">{room.wallArea.toFixed(1)} m²</strong>, obwód <strong className="text-white font-mono">{room.perimeter.toFixed(1)} mb</strong>, wys. <strong className="text-white font-mono">{room.height}m</strong>.
                </p>
              </div>

              {/* Waste Margin Input & Presets */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <label htmlFor="waste-margin-input" className="text-xs text-slate-400 font-medium">
                    Naddatek na odpady:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="waste-margin-input"
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={wasteMarginPercent}
                      onChange={(e) => setWasteMarginPercent(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                      className="w-14 rounded-md border border-teal-500/40 bg-teal-950/80 px-2 py-0.5 text-xs font-mono font-bold text-teal-400 focus:border-teal-400 focus:outline-hidden"
                    />
                    <span className="font-mono text-xs font-bold text-teal-400">%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setWasteMarginPercent(8)}
                    className={`px-2 py-0.5 rounded-md border transition ${
                      wasteMarginPercent === 8
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Układ klasyczny prosty (panele wzdłuż, płytki w cegiełkę)"
                  >
                    Prosty (+8%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWasteMarginPercent(15)}
                    className={`px-2 py-0.5 rounded-md border transition ${
                      wasteMarginPercent === 15
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Jodełka klasyczna / francuska / karo / skosy"
                  >
                    Jodełka (+15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWasteMarginPercent(20)}
                    className={`px-2 py-0.5 rounded-md border transition ${
                      wasteMarginPercent === 20
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Gres wielkoformatowy (spieki, 120x60, 120x120 ze szlifem 45°)"
                  >
                    Wielki format (+20%)
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Floor */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Posadzka / Panele / Gres</span>
                  <span className="text-teal-400">+{wasteMarginPercent}%</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {floorGross} m²
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Netto: {floorNet.toFixed(2)} m² • {floorPacks} paczek (à 2.22m²)
                </div>
              </div>

              {/* Baseboards */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Listwy przypodłogowe</span>
                  <span className="text-teal-400">+{wasteMarginPercent}%</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {baseboardGross} mb
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Netto: {baseboardNet.toFixed(1)} mb • {baseboardPieces} sztuk (dł. 2.40m)
                </div>
              </div>

              {/* Paint */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Farba (2 warstwy)</span>
                  <span className="text-teal-400">+{wasteMarginPercent}%</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {wallPaintLiters} L
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Ściany: {wallNet.toFixed(1)} m² • {wallPaintCans} puszek 2.5L
                </div>
              </div>

              {/* Adhesive */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Klej elastyczny</span>
                  <span className="text-teal-400">+{wasteMarginPercent}%</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {adhesiveKg} kg
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  4.5 kg/m² • {adhesiveBags} worków po 25kg
                </div>
              </div>
            </div>

            {/* Application Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Docinki i straty montażowe zapobiegają przestojom ekipy remontowej i różnicom partii produkcyjnych.</span>
              </div>
              <button
                id="apply-auto-waste-btn"
                onClick={handleApplyAutoCalculatedMaterials}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Zastosuj wyliczenie (+{wasteMarginPercent}%) do kosztorysu</span>
              </button>
            </div>

            {/* Notification message */}
            {autoWasteNotice && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-2.5 text-xs text-emerald-300"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{autoWasteNotice}</span>
              </motion.div>
            )}
          </div>

          {/* Header for individual materials */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-teal-400" />
                Zestawienie Pozycji Materiałowych ({roomMaterials.length})
              </h3>
              <p className="text-xs text-slate-400">
                Pozycje z uwzględnionym naddatkiem technologicznym na ścinki i straty montażowe.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>Dodaj Własny Materiał</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomMaterials.map((mat) => (
              <div 
                key={mat.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md border border-teal-500/30 bg-teal-950/40 px-2 py-0.5 text-[10px] font-semibold text-teal-300 uppercase">
                      {mat.category.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {mat.totalPrice.toFixed(2)} PLN
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mt-2">{mat.name}</h4>
                  {mat.brandProduct && (
                    <div className="text-xs text-slate-400 font-medium">{mat.brandProduct}</div>
                  )}
                </div>

                {/* Formula Box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                    <Calculator className="w-3 h-3 text-teal-400" />
                    Zasada wyliczenia:
                  </div>
                  <div className="text-slate-300 font-mono text-[11px] leading-relaxed">
                    {mat.formulaExplanation}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400">Naddatek na odpady/docinki:</span>
                    <span className="font-bold text-teal-400">+{mat.wasteMarginPercent}%</span>
                  </div>
                </div>

                {/* Bottom Stats & Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400">Do zakupu: </span>
                    <strong className="text-white font-mono">{mat.finalQuantity} {mat.unit}</strong>
                  </div>
                  <button
                    onClick={() => onToggleMaterialPurchased(mat.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      mat.purchased
                        ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {mat.purchased ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5" />}
                    <span>{mat.purchased ? 'W magazynie' : 'Do kupienia'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mode 3: Shopping List & Procurement Checklist */}
      {activeTab === 'shopping' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                Interaktywna Lista Zakupów (Zakupy w markecie budowlanym)
              </h3>
              <p className="text-xs text-slate-400">
                Zaznaczaj pozycje wrzucane do koszyka w sklepie stacjonarnym lub internetowym.
              </p>
            </div>
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300">
              {roomMaterials.filter(m => m.purchased).length} / {roomMaterials.length} kupione
            </span>
          </div>

          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            {roomMaterials.map((mat) => (
              <div 
                key={mat.id}
                onClick={() => onToggleMaterialPurchased(mat.id)}
                className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition ${
                  mat.purchased ? 'bg-emerald-950/10 opacity-70' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1 rounded-md transition ${mat.purchased ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {mat.purchased ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold truncate ${mat.purchased ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      {mat.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Ilość: <strong>{mat.finalQuantity} {mat.unit}</strong> • Cena jedn.: ok. {mat.estimatedUnitPrice} zł
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-white">
                    {mat.totalPrice.toFixed(2)} PLN
                  </div>
                  <span className={`text-[10px] font-semibold block ${mat.purchased ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {mat.purchased ? 'Kupione' : 'Brak na stanie'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Material Modal with framer-motion transitions */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100"
            >
              <h3 className="text-base font-bold text-white mb-1">Dodaj Nowy Materiał</h3>
              <p className="text-xs text-slate-400 mb-4">
                Wprowadź ilość bazową z projektu — system automatycznie doliczy naddatek na odpady i docinki.
              </p>

              <form onSubmit={handleCreateCustomMaterial} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nazwa materiału / produktu:</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Płytki podłogowe lastryko 60x60"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Kategoria:</label>
                    <select
                      value={newMatCategory}
                      onChange={(e) => setNewMatCategory(e.target.value as MaterialCalculation['category'])}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    >
                      <option value="podłogi">Podłogi</option>
                      <option value="płytki">Płytki</option>
                      <option value="chemia_budowlana">Chemia budowlana</option>
                      <option value="ściany">Ściany / Farby</option>
                      <option value="elektryka">Elektryka</option>
                      <option value="hydraulika">Hydraulika</option>
                      <option value="stolarka">Stolarka</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Jednostka:</label>
                    <select
                      value={newMatUnit}
                      onChange={(e) => setNewMatUnit(e.target.value as MaterialCalculation['unit'])}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    >
                      <option value="m²">m²</option>
                      <option value="opak.">opak.</option>
                      <option value="kg">kg</option>
                      <option value="l">l</option>
                      <option value="mb">mb</option>
                      <option value="szt.">szt.</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Ilość netto:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={newMatBaseQuantity}
                      onChange={(e) => setNewMatBaseQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Zapas (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="50"
                      value={newMatWastePercent}
                      onChange={(e) => setNewMatWastePercent(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-teal-300 font-bold focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Cena jedn. (PLN):</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={newMatPrice}
                      onChange={(e) => setNewMatPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Live waste calculation info */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs flex items-center justify-between">
                  <span className="text-slate-400">Łączna ilość z zapasem:</span>
                  <div className="text-right font-mono">
                    <span className="text-teal-400 font-bold">
                      {(newMatBaseQuantity * (1 + newMatWastePercent / 100)).toFixed(2)} {newMatUnit}
                    </span>
                    <span className="text-slate-500 text-[10px] block">
                      Razem: {((newMatBaseQuantity * (1 + newMatWastePercent / 100)) * newMatPrice).toFixed(2)} PLN
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition"
                  >
                    Zapisz Materiał
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
