'use client';

import React, { useState } from 'react';
import { Room, QAChecklistItem } from '@/types/renovation';
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
  Sparkles
} from 'lucide-react';

interface ViewProgressQAProps {
  room: Room;
  qaItems: QAChecklistItem[];
  onUpdateQAStatus: (qaId: string, status: QAChecklistItem['status']) => void;
  onAddQACheck: (item: QAChecklistItem) => void;
}

export const ViewProgressQA: React.FC<ViewProgressQAProps> = ({
  room,
  qaItems,
  onUpdateQAStatus,
  onAddQACheck,
}) => {
  const [activeTab, setActiveTab] = useState<'before_after' | 'qa' | 'diy'>('before_after');
  const [sliderPosition, setSliderPosition] = useState(52); // percentage 0 - 100

  // Filter QA items for current room or global
  const currentQA = qaItems.filter((q) => !q.roomId || q.roomId === room.id);
  const passedCount = currentQA.filter((q) => q.status === 'passed').length;
  const failedCount = currentQA.filter((q) => q.status === 'failed').length;

  const beforePhoto = room.beforePhotoUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80';
  const afterPhoto = room.afterPhotoUrl || 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80';

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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-teal-400" />
                Interaktywny Suwak Metamorfozy ({room.name})
              </h3>
              <p className="text-xs text-slate-400">
                Przesuwaj suwak w lewo lub w prawo, aby bezpośrednio porównać stan przed remontem z efektem finalnym.
              </p>
            </div>
            <span className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-xs font-mono text-teal-300">
              Pozycja: {sliderPosition}%
            </span>
          </div>

          {/* Slider Canvas Stage */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 select-none shadow-2xl bg-black">
            
            {/* After Image (Base) */}
            <img 
              src={afterPhoto} 
              alt="Stan po remoncie" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute bottom-4 right-4 rounded-lg bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-teal-300 border border-teal-500/40 z-10">
              PO REMONCIE (PROJEKT FINALNY)
            </div>

            {/* Before Image (Clipped Overlay) */}
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none transition-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img 
                src={beforePhoto} 
                alt="Stan przed remontem" 
                className="absolute inset-0 w-full h-full object-cover max-w-none"
                style={{ width: '100%', height: '100%', minWidth: '100vw' }}
              />
              <div className="absolute bottom-4 left-4 rounded-lg bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/40 z-10">
                PRZED REMONTEM (STAN SUROWY)
              </div>
            </div>

            {/* Split Divider Line & Handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="h-9 w-9 rounded-full bg-slate-950 border-2 border-teal-400 flex items-center justify-center text-teal-300 shadow-xl pointer-events-auto cursor-ew-resize active:scale-110 transition-transform">
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
            />
          </div>

          <p className="text-center text-xs text-slate-400 italic">
            Wskazówka: Złap za uchwyt na środku zdjęcia i przesuwaj w poziomie.
          </p>
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
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300">
              {currentQA.length} punktów kontrolnych
            </span>
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

    </div>
  );
};
