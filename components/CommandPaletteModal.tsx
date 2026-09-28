'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  RenovationProject, 
  RenovationPipelineStep 
} from '@/types/renovation';
import {
  Search,
  X,
  Layers,
  Ruler,
  Box,
  DollarSign,
  Calendar,
  Hammer,
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet,
  FileJson,
  Bot,
  HardHat,
  Sun,
  Moon,
  FolderKanban,
  Keyboard,
  ArrowRight,
  Bluetooth,
  Sparkles,
  Mic,
} from 'lucide-react';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: RenovationProject;
  activePipelineStep: RenovationPipelineStep;
  theme: 'dark' | 'light';
  isWakeLockActive?: boolean;
  onSelectPipelineStep: (step: RenovationPipelineStep) => void;
  onSelectRoom: (roomId: string) => void;
  onOpenAddExpense: () => void;
  onOpenAddRoomModal: () => void;
  onOpenReportModal: () => void;
  onOpenBackupModal: () => void;
  onOpenAIModal: () => void;
  onOpenProjectSwitcher?: () => void;
  onOpenKeyboardShortcuts: () => void;
  onToggleWakeLock?: () => void;
  onToggleTheme?: () => void;
  onOpenLaserMeter?: () => void;
  onOpenPhotoMarkup?: () => void;
  onOpenVoiceAssistant?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'Pomieszczenia' | 'Etapy prac' | 'Szybkie akcje';
  icon: React.ReactNode;
  shortcutBadge?: string;
  onSelect: () => void;
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
  isWakeLockActive = false,
  onSelectPipelineStep,
  onSelectRoom,
  onOpenAddExpense,
  onOpenAddRoomModal,
  onOpenReportModal,
  onOpenBackupModal,
  onOpenAIModal,
  onOpenProjectSwitcher,
  onOpenKeyboardShortcuts,
  onToggleWakeLock,
  onToggleTheme,
  onOpenLaserMeter,
  onOpenPhotoMarkup,
  onOpenVoiceAssistant,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 1. Pokoje
    for (const room of project.rooms) {
      const isCurrent = room.id === project.selectedRoomId;
      list.push({
        id: `room-${room.id}`,
        title: room.name,
        description: `${room.area.toFixed(1)} m² • obwód: ${room.perimeter.toFixed(1)} m ${isCurrent ? '• (Aktywny)' : ''}`,
        category: 'Pomieszczenia',
        icon: <Layers className="w-4 h-4 text-teal-400" />,
        onSelect: () => {
          onSelectRoom(room.id);
          onClose();
        },
      });
    }

    // 2. Etapy prac
    const stages: Array<{
      step: RenovationPipelineStep;
      title: string;
      desc: string;
      icon: React.ReactNode;
      shortcut: string;
    }> = [
      {
        step: 'measure',
        title: '1. Pomiary & Rzut 2D',
        desc: 'Kalibracja skali, Canny edge detection, edycja ścian i otworów',
        icon: <Ruler className="w-4 h-4 text-sky-400" />,
        shortcut: '1',
      },
      {
        step: 'design',
        title: '2. Wizualizacja 3D & Materiały',
        desc: 'Model 3D, kalkulator G-K, skosy poddasza, eksport GLB/USDZ AR',
        icon: <Box className="w-4 h-4 text-indigo-400" />,
        shortcut: '2',
      },
      {
        step: 'cost',
        title: '3. Kosztorys & Wydatki',
        desc: 'Rejestr paragonów OCR, robocizna, budżet i wskaźniki EVM',
        icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
        shortcut: '3',
      },
      {
        step: 'plan',
        title: '4. Harmonogram Gantt & Ekipy',
        desc: 'Oś czasu prac, zarządzanie wykonawcami i płatnościami',
        icon: <Calendar className="w-4 h-4 text-amber-400" />,
        shortcut: '4',
      },
      {
        step: 'progress',
        title: '5. Dziennik Prac & Czas Schnięcia',
        desc: 'Fotorelacja postępów, fazy technologiczne i kalkulator schnięcia',
        icon: <Hammer className="w-4 h-4 text-orange-400" />,
        shortcut: '5',
      },
      {
        step: 'qa',
        title: '6. Odbiory Techniczne & Checklista',
        desc: 'Protokoły odbioru, normy budowlane, weryfikacja usterek',
        icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
        shortcut: '6',
      },
    ];

    for (const stage of stages) {
      list.push({
        id: `stage-${stage.step}`,
        title: stage.title,
        description: stage.desc,
        category: 'Etapy prac',
        icon: stage.icon,
        shortcutBadge: stage.shortcut,
        onSelect: () => {
          onSelectPipelineStep(stage.step);
          onClose();
        },
      });
    }

    // 3. Szybkie akcje
    list.push({
      id: 'action-add-expense',
      title: 'Nowy wydatek / Skanuj paragon',
      description: 'Zarejestruj fakturę, paragon z OCR lub koszt materiału',
      category: 'Szybkie akcje',
      icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
      shortcutBadge: 'N',
      onSelect: () => {
        onClose();
        onOpenAddExpense();
      },
    });

    list.push({
      id: 'action-add-room',
      title: 'Dodaj nowe pomieszczenie',
      description: 'Zdefiniuj nowy pokój, łazienkę lub kuchnię',
      category: 'Szybkie akcje',
      icon: <Layers className="w-4 h-4 text-teal-400" />,
      onSelect: () => {
        onClose();
        onOpenAddRoomModal();
      },
    });

    list.push({
      id: 'action-report',
      title: 'Generuj raport techniczny i kosztorys',
      description: 'Eksportuj protokół do druku, PDF lub arkusza kalkulacyjnego',
      category: 'Szybkie akcje',
      icon: <FileSpreadsheet className="w-4 h-4 text-teal-300" />,
      onSelect: () => {
        onClose();
        onOpenReportModal();
      },
    });

    list.push({
      id: 'action-backup',
      title: 'Kopia zapasowa projektu (JSON / ZIP)',
      description: 'Eksportuj lub przywróć stan projektu wraz z fotorelacją',
      category: 'Szybkie akcje',
      icon: <FileJson className="w-4 h-4 text-teal-400" />,
      onSelect: () => {
        onClose();
        onOpenBackupModal();
      },
    });

    list.push({
      id: 'action-ai',
      title: 'Konsultant AI (Kaczak Expert)',
      description: 'Zapytaj o normy PN-EN, dobór chemii budowlanej lub czasy schnięcia',
      category: 'Szybkie akcje',
      icon: <Bot className="w-4 h-4 text-purple-400" />,
      onSelect: () => {
        onClose();
        onOpenAIModal();
      },
    });

    if (onOpenPhotoMarkup) {
      list.push({
        id: 'action-photo-markup',
        title: 'Foto-Wymiarowanie ściany (Photo Markup)',
        description: 'Nanieś strzałki wymiarowe, puszki elektryczne i instalacje na zdjęcie',
        category: 'Szybkie akcje',
        icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        onSelect: () => {
          onClose();
          onOpenPhotoMarkup();
        },
      });
    }

    if (onOpenLaserMeter) {
      list.push({
        id: 'action-laser-meter',
        title: 'Dalmierz Laserowy Bluetooth (BLE)',
        description: 'Połącz bezprzewodowo dalmierz Bosch GLM, Leica DISTO lub chiński BLE',
        category: 'Szybkie akcje',
        icon: <Bluetooth className="w-4 h-4 text-teal-400" />,
        onSelect: () => {
          onClose();
          onOpenLaserMeter();
        },
      });
    }

    if (onOpenVoiceAssistant) {
      list.push({
        id: 'action-voice-assistant',
        title: 'Asystent Głosowy „Wolne Ręce” (PL Voice AI)',
        description: 'Wprowadzaj wymiary, wydatki i notatki głosem bez dotykania telefonu',
        category: 'Szybkie akcje',
        icon: <Mic className="w-4 h-4 text-rose-400" />,
        shortcutBadge: 'V',
        onSelect: () => {
          onClose();
          onOpenVoiceAssistant();
        },
      });
    }

    if (onToggleWakeLock) {
      list.push({
        id: 'action-wakelock',
        title: isWakeLockActive ? 'Wyłącz Tryb Budowa' : 'Włącz Tryb Budowa (Blokada ekranu)',
        description: isWakeLockActive 
          ? 'Ekran może obecnie wygaszać się standardowo' 
          : 'Zapobiega wygaszaniu ekranu telefonu podczas pomiarów na drabinie',
        category: 'Szybkie akcje',
        icon: <HardHat className="w-4 h-4 text-amber-400" />,
        shortcutBadge: 'B',
        onSelect: () => {
          onClose();
          onToggleWakeLock();
        },
      });
    }

    if (onToggleTheme) {
      list.push({
        id: 'action-theme',
        title: theme === 'dark' ? 'Przełącz na Tryb Jasny' : 'Przełącz na Tryb Ciemny',
        description: 'Dostosuj kontrast do oświetlenia na budowie lub w biurze',
        category: 'Szybkie akcje',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        onSelect: () => {
          onClose();
          onToggleTheme();
        },
      });
    }

    if (onOpenProjectSwitcher) {
      list.push({
        id: 'action-project-switcher',
        title: 'Przełącz projekt / Zarządzanie lokalami',
        description: 'Przełącz się między remontowanymi mieszkaniami lub utwórz nowe',
        category: 'Szybkie akcje',
        icon: <FolderKanban className="w-4 h-4 text-teal-400" />,
        onSelect: () => {
          onClose();
          onOpenProjectSwitcher();
        },
      });
    }

    list.push({
      id: 'action-shortcuts',
      title: 'Pokaż skróty klawiszowe',
      description: 'Wyświetl pełną listę skrótów klawiatury',
      category: 'Szybkie akcje',
      icon: <Keyboard className="w-4 h-4 text-slate-400" />,
      shortcutBadge: '?',
      onSelect: () => {
        onClose();
        onOpenKeyboardShortcuts();
      },
    });

    return list;
  }, [
    project,
    theme,
    isWakeLockActive,
    onSelectPipelineStep,
    onSelectRoom,
    onClose,
    onOpenAddExpense,
    onOpenAddRoomModal,
    onOpenReportModal,
    onOpenBackupModal,
    onOpenAIModal,
    onToggleWakeLock,
    onToggleTheme,
    onOpenProjectSwitcher,
    onOpenKeyboardShortcuts,
  ]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const cleanQuery = normalizeSearch(query);

    return items.filter((item) => {
      const matchTitle = normalizeSearch(item.title).includes(cleanQuery);
      const matchDesc = item.description ? normalizeSearch(item.description).includes(cleanQuery) : false;
      const matchCategory = normalizeSearch(item.category).includes(cleanQuery);
      return matchTitle || matchDesc || matchCategory;
    });
  }, [items, query]);

  // Reset selectedIndex if out of bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredItems, selectedIndex, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-800/80 px-4 py-3.5 bg-slate-950/60">
          <Search className="w-5 h-5 text-teal-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj pokoju, etapu lub wpisz akcję..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-hidden"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Wyczyść zapytanie"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">Brak wyników dla: &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">
                Spróbuj wyszukać nazwę pokoju (np. Salon), modułu (np. Kosztorys) lub wydatek.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-active={isSelected}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-500/15 text-white border border-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:inline">
                          • {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcutBadge && (
                      <kbd
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                          isSelected
                            ? 'border-teal-500/40 bg-teal-950/80 text-teal-200'
                            : 'border-slate-700 bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {item.shortcutBadge}
                      </kbd>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-opacity ${
                        isSelected ? 'opacity-100 text-teal-400' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] border border-slate-700 text-slate-300">↑</kbd>
              <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] border border-slate-700 text-slate-300">↓</kbd>
              Nawiguj
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] border border-slate-700 text-slate-300">↵</kbd>
              Wybierz
            </span>
          </div>
          <span className="text-[10px] text-teal-400/90 font-medium">
            Ctrl + K
          </span>
        </div>
      </div>
    </div>
  );
};
