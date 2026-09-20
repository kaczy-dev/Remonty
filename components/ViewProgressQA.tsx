'use client';

import React, { useState } from 'react';
import { Room, QAChecklistItem, StageCategory } from '@/types/renovation';
import { 
  CheckSquare, 
  SplitSquareVertical, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Hammer, 
  ShieldCheck, 
  FileText, 
  TrendingUp,
  Sparkles,
  Plus,
  X,
  UploadCloud,
  Camera,
  RotateCcw,
  Image as ImageIcon,
  Check,
  Loader2
} from 'lucide-react';
import { usePhotoSrc, LOCAL_PHOTO_PREFIX, savePhotoBlob, deletePhotoBlob } from '@/lib/db';
import { compressImage } from '@/lib/image-compressor';

interface ViewProgressQAProps {
  room: Room;
  qaItems: QAChecklistItem[];
  onUpdateQAStatus: (qaId: string, status: QAChecklistItem['status']) => void;
  onAddQACheck: (item: QAChecklistItem) => void;
  onUpdateRoomPhotos?: (roomId: string, updates: { beforePhotoUrl?: string; afterPhotoUrl?: string }) => void;
}

export const ViewProgressQA: React.FC<ViewProgressQAProps> = ({
  room,
  qaItems,
  onUpdateQAStatus,
  onAddQACheck,
  onUpdateRoomPhotos,
}) => {
  const [activeTab, setActiveTab] = useState<'before_after' | 'qa' | 'diy'>('before_after');
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNorm, setNewNorm] = useState('');
  const [newCategory, setNewCategory] = useState<StageCategory>('finishing');
  const [newSeverity, setNewSeverity] = useState<QAChecklistItem['severity']>('important');
  const [newTolerance, setNewTolerance] = useState('');
  const [newTips, setNewTips] = useState('');

  // Photo upload & compression states
  const [isCompressingBefore, setIsCompressingBefore] = useState(false);
  const [isCompressingAfter, setIsCompressingAfter] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Resolve IndexedDB blobs or remote URLs
  const resolvedBeforePhoto = usePhotoSrc(room.beforePhotoUrl);
  const resolvedAfterPhoto = usePhotoSrc(room.afterPhotoUrl);

  const beforePhoto = resolvedBeforePhoto || room.beforePhotoUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80';
  const afterPhoto = resolvedAfterPhoto || room.afterPhotoUrl || 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80';

  const isCustomBefore = Boolean(room.beforePhotoUrl && room.beforePhotoUrl.startsWith(LOCAL_PHOTO_PREFIX));
  const isCustomAfter = Boolean(room.afterPhotoUrl && room.afterPhotoUrl.startsWith(LOCAL_PHOTO_PREFIX));

  const handleUploadPhoto = async (
    type: 'before' | 'after',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isBefore = type === 'before';
    if (isBefore) setIsCompressingBefore(true);
    else setIsCompressingAfter(true);

    try {
      const origSizeKb = (file.size / 1024).toFixed(0);
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      const compSizeKb = (compressedBlob.size / 1024).toFixed(0);

      // Clean up previous blob from IndexedDB if it was custom
      const currentUrl = isBefore ? room.beforePhotoUrl : room.afterPhotoUrl;
      if (currentUrl?.startsWith(LOCAL_PHOTO_PREFIX)) {
        const oldId = currentUrl.slice(LOCAL_PHOTO_PREFIX.length);
        deletePhotoBlob(oldId).catch((err) => console.warn('Failed to delete old photo blob', err));
      }

      const photoId = `room-${room.id}-${type}-${Date.now()}`;
      await savePhotoBlob(photoId, compressedBlob);

      const newUrl = `${LOCAL_PHOTO_PREFIX}${photoId}`;
      onUpdateRoomPhotos?.(
        room.id,
        isBefore ? { beforePhotoUrl: newUrl } : { afterPhotoUrl: newUrl }
      );

      setStatusMessage(
        `Wgrano i skompresowano zdjęcie ${isBefore ? 'PRZED' : 'PO'}: ${origSizeKb} KB → ${compSizeKb} KB (WebP)`
      );
    } catch (err) {
      console.error('Błąd podczas wgrywania zdjęcia:', err);
      setStatusMessage('Wystąpił błąd podczas kompresji lub zapisu zdjęcia.');
    } finally {
      if (isBefore) setIsCompressingBefore(false);
      else setIsCompressingAfter(false);
      e.target.value = '';
    }
  };

  const handleResetPhoto = async (type: 'before' | 'after') => {
    const isBefore = type === 'before';
    const currentUrl = isBefore ? room.beforePhotoUrl : room.afterPhotoUrl;
    if (currentUrl?.startsWith(LOCAL_PHOTO_PREFIX)) {
      const oldId = currentUrl.slice(LOCAL_PHOTO_PREFIX.length);
      deletePhotoBlob(oldId).catch((err) => console.warn('Failed to delete old photo blob', err));
    }
    onUpdateRoomPhotos?.(
      room.id,
      isBefore ? { beforePhotoUrl: undefined } : { afterPhotoUrl: undefined }
    );
    setStatusMessage(`Przywrócono domyślne zdjęcie poglądowe ${isBefore ? 'PRZED' : 'PO'}`);
  };

  // Filter QA items for current room or global
  const currentQA = qaItems.filter((q) => !q.roomId || q.roomId === room.id);
  const passedCount = currentQA.filter((q) => q.status === 'passed').length;
  const failedCount = currentQA.filter((q) => q.status === 'failed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-before-after-btn"
              onClick={() => setActiveTab('before_after')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'before_after'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Porównanie Przed / Po (Suwak)</span>
            </button>
            <button
              id="tab-qa-checklist-btn"
              onClick={() => setActiveTab('qa')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'qa'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklisty Odbiorowe & Normy ({passedCount}/{currentQA.length})</span>
            </button>
            <button
              id="tab-diy-advisor-btn"
              onClick={() => setActiveTab('diy')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'diy'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Tryb DIY vs Ekipa</span>
            </button>
          </div>
        </div>

        {/* QA Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-emerald-300">
            <span className="text-[10px] text-slate-400 block uppercase">Zgodne z normą</span>
            <strong className="font-mono">{passedCount} punktów</strong>
          </div>
          {failedCount > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-rose-300">
              <span className="text-[10px] text-slate-400 block uppercase">Do poprawki</span>
              <strong className="font-mono">{failedCount} usterki</strong>
            </div>
          )}
        </div>
      </div>

      {/* Mode 1: Interactive Before / After Split Slider */}
      {activeTab === 'before_after' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-teal-400" />
                Interaktywny Suwak Metamorfozy ({room.name})
              </h3>
              <p className="text-xs text-slate-400">
                Przesuwaj suwak w lewo lub w prawo, aby bezpośrednio porównać stan przed remontem z efektem finalnym.
              </p>
            </div>
            <span className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-xs font-mono text-teal-300 shrink-0">
              Pozycja podziału: {sliderPosition}%
            </span>
          </div>

          {/* Status / Compression Feedback */}
          {statusMessage && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-teal-950/40 px-4 py-2.5 text-xs text-teal-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Zamknij powiadomienie"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Photo Management Control Cards (Before & After) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Before Photo Card */}
            <div className="rounded-xl border border-amber-500/30 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Stan Przed Remontem
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                  isCustomBefore 
                    ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' 
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}>
                  {isCustomBefore ? '✓ Twoje zdjęcie' : 'Wzorzec domyślny'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wgraj zdjęcie surowego stanu pokoju (ze smartfona lub aparatu). Zostanie automatycznie zoptymalizowane w WebP.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-xs ${
                  isCompressingBefore 
                    ? 'bg-amber-900/50 text-amber-200 cursor-wait' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}>
                  {isCompressingBefore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isCompressingBefore ? 'Kompresowanie...' : isCustomBefore ? 'Zmień zdjęcie PRZED' : 'Wgraj zdjęcie PRZED'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isCompressingBefore}
                    className="hidden"
                    onChange={(e) => handleUploadPhoto('before', e)}
                  />
                </label>
                {isCustomBefore && (
                  <button
                    type="button"
                    onClick={() => handleResetPhoto('before')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Przywróć zdjęcie domyślne"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* After Photo Card */}
            <div className="rounded-xl border border-teal-500/30 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                    Stan Po Remoncie
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                  isCustomAfter 
                    ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' 
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}>
                  {isCustomAfter ? '✓ Twoje zdjęcie' : 'Wzorzec domyślny'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wgraj zdjęcie po zakończeniu prac lub wizualizację projektu. Kompresja lokalna w przeglądarce chroni pamięć urządzenia.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-xs ${
                  isCompressingAfter 
                    ? 'bg-teal-900/50 text-teal-200 cursor-wait' 
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}>
                  {isCompressingAfter ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-teal-400" />
                  )}
                  <span>{isCompressingAfter ? 'Kompresowanie...' : isCustomAfter ? 'Zmień zdjęcie PO' : 'Wgraj zdjęcie PO'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isCompressingAfter}
                    className="hidden"
                    onChange={(e) => handleUploadPhoto('after', e)}
                  />
                </label>
                {isCustomAfter && (
                  <button
                    type="button"
                    onClick={() => handleResetPhoto('after')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Przywróć zdjęcie domyślne"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Slider Canvas Stage */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 select-none shadow-2xl bg-black">
            
            {/* After Image (Base Layer - Full View) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={afterPhoto} 
              alt="Stan po remoncie" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute bottom-4 right-4 rounded-lg bg-slate-950/85 backdrop-blur-md px-3 py-1 text-xs font-bold text-teal-300 border border-teal-500/40 z-10">
              PO REMONCIE (FINALNY)
            </div>

            {/* Before Image (Overlay with hardware-accelerated clip-path) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={beforePhoto} 
              alt="Stan przed remontem" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
              }}
            />
            <div 
              className="absolute bottom-4 left-4 rounded-lg bg-slate-950/85 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/40 z-10 transition-opacity"
              style={{ opacity: sliderPosition > 10 ? 1 : 0 }}
            >
              PRZED REMONTEM (SUROWY)
            </div>

            {/* Split Divider Line & Draggable Handle */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-20 pointer-events-none flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="h-10 w-10 rounded-full bg-slate-950 border-2 border-teal-400 flex items-center justify-center text-teal-300 shadow-xl pointer-events-auto cursor-ew-resize active:scale-110 hover:border-white transition-transform">
                <span className="text-xs font-bold font-mono">⇔</span>
              </div>
            </div>

            {/* Transparent Range Input Overlay for Dragging */}
            <input 
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              aria-label="Pozycja suwaka przed i po"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 px-1">
            <span className="italic">
              💡 Wskazówka: Złap za uchwyt ⇔ na środku zdjęcia i przesuwaj w poziomie.
            </span>
            <span className="text-[11px] text-slate-500">
              Zdjęcia przechowywane są bezpiecznie w pamięci lokalnej Twojej przeglądarki (IndexedDB).
            </span>
          </div>
        </div>
      )}

      {/* Mode 2: Professional QA Checklists */}
      {activeTab === 'qa' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-teal-400" />
                Protokoły Odbioru Robót wg Polskich Norm (PN-EN / ITB)
              </h3>
              <p className="text-xs text-slate-400">
                Wymagania techniczne, dopuszczalne odchyłki i wytyczne inspekcji dla poszczególnych branż.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300">
                {currentQA.length} punktów kontrolnych
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj punkt</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {currentQA.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className={`p-1 rounded-md shrink-0 mt-0.5 ${
                      item.status === 'passed'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : item.status === 'failed'
                        ? 'text-rose-400 bg-rose-950/60'
                        : 'text-amber-400 bg-amber-950/60'
                    }`}>
                      {item.status === 'passed' ? <CheckCircle className="w-4 h-4" /> : item.status === 'failed' ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Norma: <strong>{item.standardNorm}</strong></span>
                        <span>•</span>
                        <span className="text-teal-400 uppercase">{item.severity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onUpdateQAStatus(item.id, 'passed')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                        item.status === 'passed'
                          ? 'border-emerald-500/50 bg-emerald-950 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Zgodne (OK)
                    </button>
                    <button
                      onClick={() => onUpdateQAStatus(item.id, 'failed')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                        item.status === 'failed'
                          ? 'border-rose-500/50 bg-rose-950 text-rose-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Usterka (NOK)
                    </button>
                    <button
                      onClick={() => onUpdateQAStatus(item.id, 'pending')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                        item.status === 'pending'
                          ? 'border-amber-500/50 bg-amber-950 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      W toku
                    </button>
                  </div>
                </div>

                {/* Technical Tolerance & Tips Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">
                      Dopuszczalna Tolerancja:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed font-mono">
                      {item.toleranceGuide}
                    </p>
                    {item.measuredValue && (
                      <div className="mt-1 text-[10px] text-emerald-400">
                        Wynik pomiaru: <strong>{item.measuredValue}</strong>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                      Wskazówki dla Inwestora:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {item.inspectionTips}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 3: DIY Mode vs Contractor Mode Advisor */}
      {activeTab === 'diy' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Hammer className="w-4 h-4 text-teal-400" />
                Kalkulator Samodzielności: Co robić samemu (DIY), a co zlecić ekipie?
              </h3>
              <p className="text-xs text-slate-400">
                Porównanie opłacalności, ryzyka technologicznego i wymaganych uprawnień państwowych.
              </p>
            </div>
            <span className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
              Szacowana oszczędność DIY: 16 800 zł
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* DIY Recommended */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Rób Samodzielnie (DIY)</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">Wysoki zysk</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Skucie płytek i demontaże:</strong> oszczędność ok. 3 500 zł.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Folia w płynie & hydroizolacja:</strong> oszczędność ok. 1 200 zł.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Malowanie ścian i gruntowanie:</strong> oszczędność ok. 2 400 zł.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Skręcanie mebli i listwy:</strong> oszczędność ok. 1 800 zł.</span>
                </li>
              </ul>
            </div>

            {/* Requires Good Skills */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Wymaga Wprawy / Narzędzi</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">Średnie ryzyko</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Gładzie gipsowe:</strong> wymaga wypożyczenia szlifierki żyrafy.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Wylewka samopoziomująca:</strong> kluczowy czas rozpływu (max 15 min).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Układanie paneli i winyli:</strong> wymaga równej posadzki i dylatacji.</span>
                </li>
              </ul>
            </div>

            {/* Strictly Contractor */}
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Tylko Certyfikowana Ekipa</span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30">Uprawnienia prawne</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Instalacja elektryczna i rozdzielnica:</strong> wymagane uprawnienia SEP E+D oraz protokół pomiarów.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Gres wielkoformatowy 120x60+:</strong> ryzyko pęknięcia płytki za kilkaset zł przy docinaniu 45°.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Próby ciśnieniowe PEX & podtynkowe:</strong> błąd grozi zalaniem sąsiadów.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Dodaj Własny Punkt Kontrolny / Normę Odbiorową */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-teal-500/40 bg-slate-900 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-teal-400" />
                <h4 className="text-sm font-bold text-white">Nowy Punkt Kontrolny Odbioru</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;

                onAddQACheck({
                  id: `qa-${Date.now()}`,
                  roomId: room.id,
                  stageCategory: newCategory,
                  title: newTitle.trim(),
                  standardNorm: newNorm.trim() || 'Wytyczne branżowe ITB',
                  severity: newSeverity,
                  status: 'pending',
                  toleranceGuide: newTolerance.trim() || 'Zgodnie z projektem i instrukcją producenta',
                  inspectionTips: newTips.trim() || 'Sprawdź wizualnie i pomiarowo przed podpisaniem protokołu odbioru.',
                });

                // Reset form
                setNewTitle('');
                setNewNorm('');
                setNewCategory('finishing');
                setNewSeverity('important');
                setNewTolerance('');
                setNewTips('');
                setShowAddModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tytuł kontroli / Element odbioru:
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Płaszczyzna i spadek podłogi pod prysznicem walk-in"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Branża / Kategoria robót:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as StageCategory)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="finishing">Wykończenie / Gładzie</option>
                    <option value="flooring">Posadzki / Gres / Panele</option>
                    <option value="installation">Instalacje Wod-Kan / Prąd</option>
                    <option value="insulation">Hydroizolacja / Ocieplenie</option>
                    <option value="masonry">Wylewki / Mury</option>
                    <option value="carpentry">Zabudowa meblowa / G-K</option>
                    <option value="demolition">Demolka / Wyburzenia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Norma / Wytyczne:
                  </label>
                  <input
                    type="text"
                    placeholder="np. PN-EN 14411 / ITB"
                    value={newNorm}
                    onChange={(e) => setNewNorm(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Waga usterki:
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as QAChecklistItem['severity'])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="critical">Krytyczna (blokująca)</option>
                    <option value="important">Ważna (wymaga poprawki)</option>
                    <option value="recommended">Zalecenie estetyczne</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dopuszczalna tolerancja / Warunek zaliczenia:
                </label>
                <input
                  type="text"
                  placeholder="np. Spadek min. 1.5–2% w kierunku odpływu liniowego"
                  value={newTolerance}
                  onChange={(e) => setNewTolerance(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Wskazówki dla inwestora / metoda badania:
                </label>
                <textarea
                  rows={2}
                  placeholder="np. Wylej szklankę wody lub użyj poziomicy cyfrowej."
                  value={newTips}
                  onChange={(e) => setNewTips(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-xs"
                >
                  Dodaj punkt kontrolny
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
