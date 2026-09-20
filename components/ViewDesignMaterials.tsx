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
  Info,
  Copy,
  Download,
  Share2,
  DollarSign,
  Store,
  Tag,
  Trash2,
  ArrowRight,
  Wrench,
  CheckSquare,
  ShieldCheck,
  Paintbrush
} from 'lucide-react';
import { Room3DViewer } from '@/components/Room3DViewer';
import {
  calculateTilePackage,
  calculateFlooringPackage,
  calculateWaterproofingPackage,
  calculatePlasterAndPaintPackage,
  calculateLevelingCompoundPackage,
  formatShoppingListForClipboard,
  groupMaterialsByStore,
  TileLayoutPattern,
  getWasteMarginForPattern
} from '@/lib/material-calculator';
import { generateMaterialsCSV } from '@/lib/report-generator';

interface ViewDesignMaterialsProps {
  room: Room;
  materials: MaterialCalculation[];
  onToggleMaterialPurchased: (matId: string) => void;
  onAddMaterial: (material: MaterialCalculation) => void;
  onUpdateRoomDesign: (roomId: string, newDesign: Room['design']) => void;
  onUpdateFurniture?: (roomId: string, furniture: Room['furniture']) => void;
  onConsultAI?: (prompt: string) => void;
  onAddExpenseFromMaterial?: (material: MaterialCalculation) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onUpdateRoomPhoto?: (roomId: string, photoUrl: string) => void;
}

export const ViewDesignMaterials: React.FC<ViewDesignMaterialsProps> = ({
  room,
  materials,
  onToggleMaterialPurchased,
  onAddMaterial,
  onUpdateRoomDesign,
  onUpdateFurniture,
  onConsultAI,
  onAddExpenseFromMaterial,
  onDeleteMaterial,
  onUpdateRoomPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'shopping'>('design');
  const [previewMode, setPreviewMode] = useState<'3d' | 'flat'>('3d');
  const [showAddModal, setShowAddModal] = useState(false);

  // Waste Calculation Engine State (e.g. +10% waste margin based on room dimensions)
  const [wasteMarginPercent, setWasteMarginPercent] = useState<number>(10);
  const [autoWasteNotice, setAutoWasteNotice] = useState<string | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Advanced material calculator presets state
  const [calcPreset, setCalcPreset] = useState<'tiling' | 'flooring' | 'waterproofing' | 'paint' | 'leveling'>('tiling');
  const [tileWidth, setTileWidth] = useState<number>(60);
  const [tileHeight, setTileHeight] = useState<number>(60);
  const [tilePattern, setTilePattern] = useState<TileLayoutPattern>('straight');
  const [includeBathroomWalls, setIncludeBathroomWalls] = useState<boolean>(true);

  const [flooringType, setFlooringType] = useState<'panels' | 'vinyl' | 'wood'>('vinyl');
  const [flooringPattern, setFlooringPattern] = useState<TileLayoutPattern>('straight');

  const [levelingThicknessMm, setLevelingThicknessMm] = useState<number>(10);

  // Store filter in Shopping List
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // New custom material form state
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<MaterialCalculation['category']>('podłogi');
  const [newMatBaseQuantity, setNewMatBaseQuantity] = useState(10);
  const [newMatWastePercent, setNewMatWastePercent] = useState(10);
  const [newMatUnit, setNewMatUnit] = useState<MaterialCalculation['unit']>('m²');
  const [newMatPrice, setNewMatPrice] = useState(120);
  const [newMatStore, setNewMatStore] = useState('Castorama / Leroy Merlin');

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

  // Specialized trade calculators:
  const handleApplyTilePackage = () => {
    const items = calculateTilePackage({
      roomId: room.id,
      roomName: room.name,
      floorArea: room.area,
      wallArea: includeBathroomWalls ? room.wallArea : 0,
      tileWidthCm: tileWidth,
      tileHeightCm: tileHeight,
      layoutPattern: tilePattern,
    });
    items.forEach((item) => onAddMaterial(item));
    setAutoWasteNotice(`Dodano kompletny pakiet glazurniczy (${items.length} pozycji) dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleApplyFlooringPackage = () => {
    const items = calculateFlooringPackage({
      roomId: room.id,
      roomName: room.name,
      floorArea: room.area,
      flooringType,
      layoutPattern: flooringPattern,
    });
    items.forEach((item) => onAddMaterial(item));
    setAutoWasteNotice(`Dodano pakiet podłogowy (${items.length} pozycje) dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleApplyWaterproofingPackage = () => {
    const items = calculateWaterproofingPackage({
      roomId: room.id,
      roomName: room.name,
      wetZoneFloorM2: room.area,
      wetZoneWallM2: Math.min(room.wallArea, 8),
      cornersLengthM: room.perimeter,
    });
    items.forEach((item) => onAddMaterial(item));
    setAutoWasteNotice(`Dodano pakiet hydroizolacji strefy mokrej (${items.length} pozycje) dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleApplyPlasterPaintPackage = () => {
    const items = calculatePlasterAndPaintPackage({
      roomId: room.id,
      roomName: room.name,
      wallArea: room.wallArea,
      ceilingArea: room.area,
    });
    items.forEach((item) => onAddMaterial(item));
    setAutoWasteNotice(`Dodano pakiet gładzi i malowania (${items.length} pozycje) dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleApplyLevelingPackage = () => {
    const items = calculateLevelingCompoundPackage({
      roomId: room.id,
      roomName: room.name,
      floorArea: room.area,
      averageThicknessMm: levelingThicknessMm,
    });
    items.forEach((item) => onAddMaterial(item));
    setAutoWasteNotice(`Dodano wylewkę samopoziomującą dla ${room.name}!`);
    setTimeout(() => setAutoWasteNotice(null), 4000);
  };

  const handleCopyShoppingList = async () => {
    const text = formatShoppingListForClipboard(roomMaterials, storeFilter, room.name);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setClipboardNotice('Skopiowano sformatowaną listę zakupów do schowka! Możesz wysłać ją majstrowi na WhatsApp lub SMS.');
      setTimeout(() => setClipboardNotice(null), 5000);
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateMaterialsCSV(roomMaterials, [room]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zapotrzebowanie_Materialowe_${room.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      storeName: 'Sklep z Podłogami / Castorama',
      packageSize: 2.22,
      packagesCount: floorPacks,
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
      storeName: 'Castorama / Leroy Merlin',
      packageSize: 2.4,
      packagesCount: baseboardPieces,
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
      storeName: 'Castorama / Leroy Merlin',
      packageSize: 2.5,
      packagesCount: wallPaintCans,
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
      storeName: 'Castorama / Leroy Merlin',
      packageSize: 25,
      packagesCount: adhesiveBags,
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
      storeName: newMatStore,
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
                  onUpdateRoomPhoto={(photoUrl) => onUpdateRoomPhoto?.(room.id, photoUrl)}
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

          {/* Trade-Specific Calculation Presets Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-400" />
                <h4 className="text-sm font-bold text-white">Branżowy Generator Pakietów Materiałowych</h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Wybierz branżę i wylicz kompletne zapotrzebowanie z normami zużycia i docinkami:
              </span>
            </div>

            {/* Presets Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setCalcPreset('tiling')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  calcPreset === 'tiling'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Glazurnik & Płytki</span>
              </button>

              <button
                type="button"
                onClick={() => setCalcPreset('flooring')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  calcPreset === 'flooring'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Panele / Podłogi</span>
              </button>

              <button
                type="button"
                onClick={() => setCalcPreset('waterproofing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  calcPreset === 'waterproofing'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hydroizolacja (Mokra)</span>
              </button>

              <button
                type="button"
                onClick={() => setCalcPreset('paint')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  calcPreset === 'paint'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Gładzie & Farby</span>
              </button>

              <button
                type="button"
                onClick={() => setCalcPreset('leveling')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  calcPreset === 'leveling'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Wylewka Samopoziomująca</span>
              </button>
            </div>

            {/* Active Preset Configuration Area */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              {calcPreset === 'tiling' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Format płytek i technika ułożenia ({room.name}):
                    </span>
                    <span className="text-[11px] font-mono text-teal-400">
                      Zapas docinek: +{getWasteMarginForPattern(tilePattern, tileWidth >= 60 && tileHeight >= 60)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Format płytki (cm):</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tileWidth}
                          onChange={(e) => setTileWidth(Math.max(10, parseInt(e.target.value) || 10))}
                          className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white font-mono text-center"
                        />
                        <span className="text-slate-500 font-mono">×</span>
                        <input
                          type="number"
                          value={tileHeight}
                          onChange={(e) => setTileHeight(Math.max(10, parseInt(e.target.value) || 10))}
                          className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white font-mono text-center"
                        />
                        <span className="text-slate-500 font-mono text-[10px]">cm</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Układ spoin:</label>
                      <select
                        value={tilePattern}
                        onChange={(e) => setTilePattern(e.target.value as TileLayoutPattern)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
                      >
                        <option value="straight">Układ prosty / siatka (+8–12%)</option>
                        <option value="brick_half">Cegiełka 1/2 (+10–15%)</option>
                        <option value="brick_third">Cegiełka 1/3 (+10–15%)</option>
                        <option value="herringbone">Jodełka klasyczna (+15–20%)</option>
                        <option value="diagonal_45">Karo / po skosie (+18–20%)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                        <input
                          type="checkbox"
                          checked={includeBathroomWalls}
                          onChange={(e) => setIncludeBathroomWalls(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-teal-600 focus:ring-0"
                        />
                        <span className="text-slate-300 text-[11px]">
                          Płytki także na ścianach ({room.wallArea.toFixed(1)} m²)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">
                      Generuje: Gres/Płytki (pełne paczki) + Klej elastyczny C2TE + Fuga + Klipsy poziomowania.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyTilePackage}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Wylicz i dodaj komplet glazurniczy</span>
                    </button>
                  </div>
                </div>
              )}

              {calcPreset === 'flooring' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Typ podłogi:</label>
                      <select
                        value={flooringType}
                        onChange={(e) => setFlooringType(e.target.value as 'panels' | 'vinyl' | 'wood')}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
                      >
                        <option value="vinyl">Panele winylowe SPC z rdzeniem mineralnym</option>
                        <option value="panels">Panele laminowane AC5 8mm</option>
                        <option value="wood">Deska warstwowa dębowa</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Układ paneli:</label>
                      <select
                        value={flooringPattern}
                        onChange={(e) => setFlooringPattern(e.target.value as TileLayoutPattern)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
                      >
                        <option value="straight">Klasyczny wzdłuż światła (+8%)</option>
                        <option value="brick_half">Z przesunięciem 1/2 (+10%)</option>
                        <option value="herringbone">Jodełka klasyczna (+15%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">
                      Generuje: Podłogę z docinkami + Podkład wyciszający o właściwej gęstości (CS).
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyFlooringPackage}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Wylicz i dodaj pakiet podłogowy</span>
                    </button>
                  </div>
                </div>
              )}

              {calcPreset === 'waterproofing' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-300 text-[11px]">
                    Zabezpieczenie przed zalaniem wg normy ITB: podłoga {room.area.toFixed(1)} m² + strefa prysznica ok. 8 m².
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">
                      Generuje: Folię w płynie (2 warstwy) + Taśmę uszczelniającą narożnikową + Mankiety do rur i odpływu.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyWaterproofingPackage}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Wylicz i dodaj hydroizolację</span>
                    </button>
                  </div>
                </div>
              )}

              {calcPreset === 'paint' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-300 text-[11px]">
                    Przygotowanie i wykończenie ścian ({room.wallArea.toFixed(1)} m²) oraz sufitu ({room.area.toFixed(1)} m²).
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">
                      Generuje: Grunt głębokopenetrujący + Gładź polimerową (2 warstwy) + Farbę lateksową (2 warstwy).
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyPlasterPaintPackage}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>Wylicz i dodaj gładzie oraz farby</span>
                    </button>
                  </div>
                </div>
              )}

              {calcPreset === 'leveling' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-slate-400 block mb-1">
                        Średnia grubość wyrównania posadzki ({room.area.toFixed(1)} m²):
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="3"
                          max="30"
                          value={levelingThicknessMm}
                          onChange={(e) => setLevelingThicknessMm(parseInt(e.target.value) || 3)}
                          className="flex-1"
                        />
                        <span className="font-mono font-bold text-teal-400 text-sm w-12 text-right">
                          {levelingThicknessMm} mm
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">
                      Norma: 1.65 kg/m²/mm. Dla {room.area.toFixed(1)} m² potrzeba {Math.ceil((room.area * 1.65 * levelingThicknessMm * 1.05) / 25)} worków po 25kg.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyLevelingPackage}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Wylicz i dodaj wylewkę</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                title="Pobierz plik CSV do Excela"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Eksportuj CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-500 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj Materiał</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomMaterials.map((mat) => (
              <div 
                key={mat.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md border border-teal-500/30 bg-teal-950/40 px-2 py-0.5 text-[10px] font-semibold text-teal-300 uppercase">
                        {mat.category.replace('_', ' ')}
                      </span>
                      {mat.storeName && (
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 flex items-center gap-1">
                          <Store className="w-3 h-3 text-amber-400" />
                          <span>{mat.storeName}</span>
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm font-bold text-white shrink-0">
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

                {/* Bottom Stats & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400">Do zakupu: </span>
                    <strong className="text-white font-mono">
                      {mat.packagesCount ? `${mat.packagesCount} ${mat.unit}` : `${mat.finalQuantity} ${mat.unit}`}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onAddExpenseFromMaterial && (
                      <button
                        type="button"
                        onClick={() => onAddExpenseFromMaterial(mat)}
                        className="flex items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-950/40 px-2 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-900/50 transition"
                        title="Zapisz tę pozycję bezpośrednio do listy wydatków projektu"
                      >
                        <DollarSign className="w-3 h-3 text-teal-400" />
                        <span>Do wydatków</span>
                      </button>
                    )}

                    <button
                      onClick={() => onToggleMaterialPurchased(mat.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        mat.purchased
                          ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {mat.purchased ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5" />}
                      <span>{mat.purchased ? 'Kupione' : 'Kup'}</span>
                    </button>

                    {onDeleteMaterial && (
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(mat.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Usuń materiał"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mode 3: Shopping List & Procurement Checklist */}
      {activeTab === 'shopping' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                Interaktywna Lista Zakupów Budowlanych
              </h3>
              <p className="text-xs text-slate-400">
                Praktyczna lista na zakupy w marketach budowlanych z podziałem na sklepy i eksportem na WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-500 transition active:scale-95"
                title="Kopiuj czytelną listę do wklejenia na WhatsApp lub SMS"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Kopiuj na WhatsApp / SMS</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                title="Pobierz plik CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Toast feedback after copying */}
          {clipboardNotice && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-3 text-xs text-emerald-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{clipboardNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setClipboardNotice(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Procurement Summary Badges & Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className="text-[10px] text-slate-400 uppercase block">Stan realizacji</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold font-mono text-white">
                  {roomMaterials.filter(m => m.purchased).length} / {roomMaterials.length} pozycji
                </span>
                <span className="text-xs font-mono text-teal-400">
                  {roomMaterials.length > 0 ? Math.round((roomMaterials.filter(m => m.purchased).length / roomMaterials.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${roomMaterials.length > 0 ? (roomMaterials.filter(m => m.purchased).length / roomMaterials.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className="text-[10px] text-slate-400 uppercase block">Wydatkowano na materiały</span>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                {purchasedMaterialsCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Pozycje oznaczone jako kupione
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className="text-[10px] text-slate-400 uppercase block">Szacowany koszt całkowity</span>
              <div className="text-sm font-bold font-mono text-white mt-1">
                {totalMaterialsCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Pozostało do wydania: {(totalMaterialsCost - purchasedMaterialsCost).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </span>
            </div>
          </div>

          {/* Store Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              Filtr sklepu:
            </span>
            {[
              { id: 'all', label: `Wszystkie (${roomMaterials.length})` },
              { id: 'Castorama / Leroy Merlin', label: 'Castorama / Leroy Merlin' },
              { id: 'Salon Płytek i Ceramiki', label: 'Salon Płytek' },
              { id: 'Sklep z Podłogami / Castorama', label: 'Podłogi' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStoreFilter(f.id)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition border ${
                  storeFilter === f.id
                    ? 'border-teal-500 bg-teal-950/60 text-teal-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtered Shopping List */}
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            {roomMaterials
              .filter((m) => storeFilter === 'all' || (m.storeName || 'Castorama / Leroy Merlin') === storeFilter)
              .map((mat) => (
                <div 
                  key={mat.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    mat.purchased ? 'bg-emerald-950/10' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleMaterialPurchased(mat.id)}
                      className={`p-1 rounded-md transition mt-0.5 sm:mt-0 ${mat.purchased ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                      aria-label="Zmień status zakupu"
                    >
                      {mat.purchased ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${mat.purchased ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                          {mat.name}
                        </span>
                        {mat.storeName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                            {mat.storeName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Ilość: <strong className="text-white">{mat.packagesCount ? `${mat.packagesCount} ${mat.unit}` : `${mat.finalQuantity} ${mat.unit}`}</strong>
                        {mat.packageSize && <span className="text-slate-500"> (à {mat.packageSize})</span>}
                        {' '}• Cena jedn.: ok. {mat.estimatedUnitPrice} zł
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {mat.totalPrice.toFixed(2)} PLN
                      </div>
                      <span className={`text-[10px] font-semibold block ${mat.purchased ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {mat.purchased ? 'Kupione' : 'Do kupienia'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onAddExpenseFromMaterial && (
                        <button
                          type="button"
                          onClick={() => onAddExpenseFromMaterial(mat)}
                          className="flex items-center gap-1 rounded-lg border border-teal-500/40 bg-teal-950/60 px-2.5 py-1 text-xs font-semibold text-teal-300 hover:bg-teal-900/70 transition shadow-xs"
                          title="Zapisz do wydatków"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-teal-400" />
                          <span className="hidden sm:inline">Wydatek</span>
                        </button>
                      )}

                      {onDeleteMaterial && (
                        <button
                          type="button"
                          onClick={() => onDeleteMaterial(mat.id)}
                          className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Usuń materiał"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                    <label className="text-xs text-slate-400 block mb-1">Sklep / Market:</label>
                    <select
                      value={newMatStore}
                      onChange={(e) => setNewMatStore(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    >
                      <option value="Castorama / Leroy Merlin">Castorama / Leroy Merlin</option>
                      <option value="Salon Płytek i Ceramiki">Salon Płytek i Ceramiki</option>
                      <option value="Sklep z Podłogami / Castorama">Sklep z Podłogami</option>
                      <option value="Hurtownia Elektryczna">Hurtownia Elektryczna</option>
                      <option value="Hurtownia Hydrauliczna">Hurtownia Hydrauliczna</option>
                      <option value="Internet / Allegro">Internet / Allegro</option>
                      <option value="Inne">Inne</option>
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

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cena jedn. szacunkowa (PLN):</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newMatPrice}
                    onChange={(e) => setNewMatPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  />
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
