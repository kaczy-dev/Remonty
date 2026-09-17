'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  GripVertical, 
  Layers, 
  Ruler, 
  ShieldCheck, 
  Coins, 
  X, 
  RotateCcw, 
  Copy, 
  Check, 
  Maximize2, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Room, RenovationPipelineStep, RenovationProject } from '@/types/renovation';

interface FloatingAIAssistantProps {
  currentRoom: Room;
  currentStep: RenovationPipelineStep;
  project: RenovationProject;
  onOpenFullModal: (prefilledPrompt?: string) => void;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_POS_KEY = 'renovai_ai_button_position_v2';
const STORAGE_SIZE_KEY = 'renovai_ai_button_size_v2';

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  currentRoom,
  currentStep,
  project,
  onOpenFullModal,
}) => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [quickResult, setQuickResult] = useState<{ title: string; content: string; query: string } | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef<Position | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; startPosX: number; startPosY: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Initialize position from localStorage or default to bottom-right
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedPos = localStorage.getItem(STORAGE_POS_KEY);
        const savedSize = localStorage.getItem(STORAGE_SIZE_KEY);
        if (savedSize) {
          setIsCompact(savedSize === 'compact');
        }

        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            // Clamp within initial window bounds
            const safeX = Math.max(16, Math.min(window.innerWidth - 220, parsed.x));
            const safeY = Math.max(70, Math.min(window.innerHeight - 80, parsed.y));
            const finalPos = { x: safeX, y: safeY };
            setPosition(finalPos);
            lastPositionRef.current = finalPos;
            return;
          }
        }
      } catch {
        // Fallback if parsing fails
      }

      // Default position: bottom-right (offset by 24px from right, 24px from bottom)
      const defaultX = Math.max(16, window.innerWidth - 220);
      const defaultY = Math.max(70, window.innerHeight - 84);
      const defaultPos = { x: defaultX, y: defaultY };
      setPosition(defaultPos);
      lastPositionRef.current = defaultPos;
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Window resize bounds handler
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const safeX = Math.max(16, Math.min(window.innerWidth - 220, prev.x));
        const safeY = Math.max(70, Math.min(window.innerHeight - 80, prev.y));
        const updated = { x: safeX, y: safeY };
        lastPositionRef.current = updated;
        return updated;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQuickMenu(false);
        setQuickResult(null);
      }
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute context-aware prompt for the current workflow step
  const getContextPrompt = (step: RenovationPipelineStep): string => {
    switch (step) {
      case 'measure':
      case 'photo_scan':
      case 'analyze':
        return `Zweryfikuj wymiary pomieszczenia "${currentRoom.name}" (${currentRoom.width}m × ${currentRoom.length}m, wys. ${currentRoom.height}m, pow. ${currentRoom.area.toFixed(1)} m², obwód ${(currentRoom.perimeter || 0).toFixed(1)} m). Czy proporcje i kubatura są zgodne z normami budowlanymi i jak optymalnie rozmierzyć posadzkę?`;
      case 'design':
        return `Oceń projekt wykończenia dla "${currentRoom.name}": podłoga (${currentRoom.design.floorType}), ściany (${currentRoom.design.wallType}), barwa światła (${currentRoom.design.lightingTempK}K). Jakie kolory akcentowe i rodzaj fugi (epoksydowa vs cementowa elastyczna) będą optymalne?`;
      case 'materials':
      case 'shopping':
        return `Przeanalizuj zestawienie materiałowe dla "${currentRoom.name}" (${currentRoom.area.toFixed(1)} m² posadzki, ${currentRoom.wallArea.toFixed(1)} m² ścian). Czy naddatek na docinki i zużycie chemii montażowej są dobrane prawidłowo?`;
      case 'plan':
      case 'execution':
      case 'progress':
        return `Przeanalizuj harmonogram i technologiczną kolejność prac dla "${currentRoom.name}". Ile czasu należy odczekać między gruntowaniem, hydroizolacją i układaniem posadzki, aby uniknąć błędów wykonawczych?`;
      case 'cost':
        return `Przeanalizuj szacunek kosztów i budżet dla "${currentRoom.name}". Na czym w tym pomieszczeniu można bezpiecznie zaoszczędzić, a w co bezwzględnie warto zainwestować lepsze materiały?`;
      case 'qa':
      case 'before_after':
        return `Jakie normowe kryteria odbioru jakościowego (zgodnie z PN-B-10110 dla tynków i normami odchyłek posadzek) powinienem sprawdzić przy odbiorze prac w pomieszczeniu "${currentRoom.name}"?`;
      default:
        return `Pomóż mi w planowaniu prac i doborze materiałów dla pomieszczenia "${currentRoom.name}".`;
    }
  };

  // Drag & drop event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    hasMovedRef.current = false;
    const currentX = position?.x ?? (window.innerWidth - 220);
    const currentY = position?.y ?? (window.innerHeight - 84);

    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
    };

    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartPos.current) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(12, Math.min(window.innerWidth - (isCompact ? 90 : 210), dragStartPos.current.startPosX + dx));
    const newY = Math.max(65, Math.min(window.innerHeight - 70, dragStartPos.current.startPosY + dy));

    const newPos = { x: newX, y: newY };
    lastPositionRef.current = newPos;
    setPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }

    if (hasMovedRef.current && lastPositionRef.current) {
      try {
        const serialized = JSON.stringify(lastPositionRef.current);
        localStorage.setItem(STORAGE_POS_KEY, serialized);
        localStorage.setItem('renovai_floating_ai_btn_pos', serialized);
      } catch {
        // LocalStorage quota or privacy
      }
    }
  };

  const handleResetPosition = () => {
    const defaultX = Math.max(16, window.innerWidth - 220);
    const defaultY = Math.max(70, window.innerHeight - 84);
    const newPos = { x: defaultX, y: defaultY };
    setPosition(newPos);
    lastPositionRef.current = newPos;
    try {
      const serialized = JSON.stringify(newPos);
      localStorage.setItem(STORAGE_POS_KEY, serialized);
      localStorage.setItem('renovai_floating_ai_btn_pos', serialized);
    } catch {
      // Ignored
    }
    setShowQuickMenu(false);
  };

  const handleToggleSize = () => {
    const nextSize = !isCompact;
    setIsCompact(nextSize);
    try {
      localStorage.setItem(STORAGE_SIZE_KEY, nextSize ? 'compact' : 'full');
    } catch {
      // Ignored
    }
    setShowQuickMenu(false);
  };

  // Main button click handler
  const handleButtonClick = () => {
    // If it was a drag gesture, don't open modal
    if (hasMovedRef.current) return;

    const prompt = getContextPrompt(currentStep);
    onOpenFullModal(prompt);
  };

  // Quick Action Execution
  const executeQuickAction = async (actionType: 'materials' | 'dimensions' | 'qa' | 'budget') => {
    setShowQuickMenu(false);
    setQuickLoading(true);

    let queryTitle = '';
    let promptToSend = '';

    if (actionType === 'materials') {
      queryTitle = `Podsumowanie materiałowe: ${currentRoom.name}`;
      promptToSend = `Przedstaw zwięzłe, punktowe podsumowanie zapotrzebowania na materiały wykończeniowe dla pomieszczenia "${currentRoom.name}" (${currentRoom.area.toFixed(1)} m² posadzki, ${currentRoom.wallArea.toFixed(1)} m² ścian netto). Uwzględnij typowe zużycie kleju, gruntu, hydroizolacji oraz naddatek na docinki.`;
    } else if (actionType === 'dimensions') {
      queryTitle = `Analiza architektoniczna wymiarów: ${currentRoom.name}`;
      promptToSend = `Dokonaj szybkiej inżynierskiej analizy wymiarów "${currentRoom.name}": szerokość ${currentRoom.width} m, długość ${currentRoom.length} m, wysokość ${currentRoom.height} m (kubatura ${(currentRoom.area * currentRoom.height).toFixed(1)} m³). Wskaż wnioski dot. ergonomii, wentylacji i rozmieszczenia płytek.`;
    } else if (actionType === 'qa') {
      queryTitle = `Kryteria odbioru technicznego: ${currentStep.toUpperCase()}`;
      promptToSend = `Wskaż w 4 zwięzłych punktach kluczowe normy PN i parametry odbioru jakościowego dla etapu ${currentStep} w pomieszczeniu "${currentRoom.name}".`;
    } else {
      queryTitle = `Szybka kalkulacja budżetowa: ${currentRoom.name}`;
      promptToSend = `Oceń koszty materiałowo-robociznowe dla pomieszczenia "${currentRoom.name}" (${currentRoom.area.toFixed(1)} m²). Jakie są główne czynniki ryzyka budżetowego i jak je zminimalizować?`;
    }

    setQuickResult({
      title: queryTitle,
      content: 'Trwa generowanie analizy technicznej inżyniera AI...',
      query: promptToSend,
    });

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          roomContext: {
            name: currentRoom.name,
            area: currentRoom.area,
            wallArea: currentRoom.wallArea,
            step: currentStep,
          },
        }),
      });

      if (!res.ok) throw new Error('Błąd połączenia');
      const data = await res.json();
      setQuickResult({
        title: queryTitle,
        content: data.text || 'Brak danych od doradcy.',
        query: promptToSend,
      });
    } catch {
      // Local fallback calculation if offline or no API key
      let fallbackText = '';
      if (actionType === 'materials') {
        const floorPlusWaste = (currentRoom.area * 1.1).toFixed(2);
        const paintLiters = ((currentRoom.wallArea * 2) / 12 * 1.1).toFixed(1);
        fallbackText = `**Obliczenia offline dla ${currentRoom.name}:**\n- Posadzka (+10% docinki): **${floorPlusWaste} m²**\n- Farba nawierzchniowa (2 warstwy + 10%): **${paintLiters} litrów**\n- Grunt głębopenetrujący: ok. **${(currentRoom.wallArea * 0.15).toFixed(1)} kg**\n- Klej elastyczny C2TE S1: ok. **${(currentRoom.area * 4.5).toFixed(0)} kg**`;
      } else if (actionType === 'dimensions') {
        const ratio = (currentRoom.length / currentRoom.width).toFixed(2);
        const vol = (currentRoom.area * currentRoom.height).toFixed(1);
        fallbackText = `**Metryka przestrzenna (${currentRoom.name}):**\n- Powierzchnia netto: **${currentRoom.area.toFixed(2)} m²**\n- Kubatura powietrza: **${vol} m³**\n- Proporcja boków: **1 : ${ratio}** (optymalna ergonomia)\n- Powierzchnia ścian: **${currentRoom.wallArea.toFixed(1)} m²**\n- Obwód pomieszczenia: **${(currentRoom.perimeter || 0).toFixed(1)} mb**`;
      } else {
        fallbackText = `Zalecenie inżyniera dla etapu **${currentStep}**: Zawsze sprawdzaj wilgotność podłoża (norma <2% CM) oraz stosuj dylatacje obwodowe przy ścianach o szerokości min. 10 mm.`;
      }

      setQuickResult({
        title: queryTitle,
        content: fallbackText,
        query: promptToSend,
      });
    } finally {
      setQuickLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!quickResult?.content) return;
    navigator.clipboard.writeText(quickResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // If position hasn't resolved yet during SSR, hide to prevent flash
  if (!position) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
      }}
      className="select-none touch-none"
    >
      {/* Quick Action Context Menu (appears on Right-Click or Menu Button) */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2.5 w-64 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md text-slate-200 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 text-[11px] font-bold text-teal-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Szybkie akcje doradcy AI
              </span>
              <button
                onClick={() => setShowQuickMenu(false)}
                className="text-slate-400 hover:text-white rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="py-1 space-y-0.5 text-xs">
              <button
                onClick={() => executeQuickAction('materials')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/90 hover:text-teal-300 transition group"
              >
                <Layers className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">Generate Materials Summary</div>
                  <div className="text-[10px] text-slate-400 truncate">Zapotrzebowanie i docinki: {currentRoom.name}</div>
                </div>
              </button>

              <button
                onClick={() => executeQuickAction('dimensions')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/90 hover:text-teal-300 transition group"
              >
                <Ruler className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">Analyze Room Dimensions</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentRoom.area.toFixed(1)} m² • kubatura i proporcje</div>
                </div>
              </button>

              <button
                onClick={() => executeQuickAction('qa')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/90 hover:text-teal-300 transition group"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">Verify Quality & QA Standards</div>
                  <div className="text-[10px] text-slate-400 truncate">Kryteria odbioru technicznego ({currentStep})</div>
                </div>
              </button>

              <button
                onClick={() => executeQuickAction('budget')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/90 hover:text-teal-300 transition group"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">Optimize Renovation Budget</div>
                  <div className="text-[10px] text-slate-400 truncate">Weryfikacja wydatków i oszczędności</div>
                </div>
              </button>
            </div>

            {/* Customization & Position Toolbar */}
            <div className="border-t border-slate-800/90 pt-1 px-1 flex items-center justify-between text-[10px] text-slate-400">
              <button
                onClick={handleToggleSize}
                className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-800 hover:text-slate-200 transition"
                title="Zmień rozmiar przycisku"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{isCompact ? 'Rozwiń tekst' : 'Tryb kompaktowy'}</span>
              </button>

              <button
                onClick={handleResetPosition}
                className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-800 hover:text-slate-200 transition"
                title="Zresetuj pozycję przycisku do prawego dolnego rogu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Zresetuj poz.</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Action Floating Result Card */}
      <AnimatePresence>
        {quickResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 rounded-2xl border border-teal-500/40 bg-slate-900 p-4 shadow-2xl backdrop-blur-md text-slate-100 z-50"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">{quickResult.title}</h4>
              </div>
              <button
                onClick={() => setQuickResult(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto pr-1 text-xs text-slate-300 leading-relaxed space-y-1.5 whitespace-pre-line font-sans">
              {quickLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-teal-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[11px] text-slate-400">Analiza parametrów pomieszczenia...</span>
                </div>
              ) : (
                quickResult.content
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex items-center justify-between text-[11px]">
              <button
                onClick={handleCopyResult}
                disabled={quickLoading}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj'}</span>
              </button>

              <button
                onClick={() => {
                  const q = quickResult.query;
                  setQuickResult(null);
                  onOpenFullModal(q);
                }}
                className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-500 transition shadow-sm active:scale-95"
              >
                <span>Pełny czat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Draggable Control Container */}
      <div className="flex items-center gap-1 group">
        {/* Sibling Drag Handle */}
        <div
          title="Przeciągnij, aby zmienić położenie przycisku AI na ekranie"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex h-10 w-5 items-center justify-center rounded-l-xl bg-slate-900/90 border-y border-l border-slate-700/80 text-slate-400 hover:text-teal-400 hover:bg-slate-800 cursor-grab active:cursor-grabbing shadow-lg transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Floating Action Button for AI Engineering Assistant */}
        <button
          id="floating-ai-consult-btn"
          title="Zapytaj inżyniera AI o ten krok (Prawy przycisk myszy: Szybkie akcje)"
          onClick={handleButtonClick}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowQuickMenu((prev) => !prev);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative flex items-center gap-2 rounded-r-2xl bg-gradient-to-r from-teal-500 to-cyan-600 py-3 text-xs font-bold text-slate-950 shadow-xl shadow-teal-500/25 animate-subtle-pulse hover:animate-none hover:scale-105 active:scale-95 transition-transform touch-none select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${
            isCompact ? 'px-3 rounded-l-none' : 'px-4 rounded-l-none'
          }`}
        >
          {/* Pulsing indicator dot (ping animation) in top right corner */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center pointer-events-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-slate-950"></span>
          </span>

          {/* Hover Tooltip */}
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-xl border border-slate-700/80 transition-all duration-150 group-hover:block z-50">
            Zapytaj inżyniera AI o ten krok
            <span className="block text-[10px] text-teal-400 font-mono">Prawy przycisk: Szybkie akcje</span>
          </span>

          <Sparkles className="w-4 h-4 text-slate-950" />
          {!isCompact && (
            <span className="inline">Doradca AI</span>
          )}
        </button>
      </div>
    </div>
  );
};
