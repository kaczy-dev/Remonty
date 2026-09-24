'use client';

import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Nawigacja i Wyszukiwanie',
    items: [
      {
        keys: ['Ctrl', 'K'],
        description: 'Otwórz Command Palette (wyszukiwarka pokoi, modułów i akcji)',
      },
      {
        keys: ['1', '–', '6'],
        description: 'Przełącz etap prac (1: Pomiary, 2: 3D, 3: Kosztorys, 4: Harmonogram, 5: Dziennik, 6: Odbiory)',
      },
      {
        keys: ['['],
        description: 'Przełącz na poprzednie pomieszczenie w projekcie',
      },
      {
        keys: [']'],
        description: 'Przełącz na następne pomieszczenie w projekcie',
      },
    ],
  },
  {
    title: 'Szybkie Akcje na Budowie',
    items: [
      {
        keys: ['N'],
        description: 'Dodaj nowy wydatek lub zeskanuj paragon (OCR)',
      },
      {
        keys: ['B'],
        description: 'Włącz / wyłącz Tryb Budowa (blokada wygaszania ekranu)',
      },
      {
        keys: ['?'],
        description: 'Pokaż tę ściągawkę skrótów klawiszowych',
      },
      {
        keys: ['Esc'],
        description: 'Zamknij aktywne okno modalne lub wyszukiwarkę',
      },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-base font-semibold text-white">
                Skróty klawiszowe
              </h2>
              <p className="text-xs text-slate-400">
                Błyskawiczne sterowanie aplikacją bez odrywania rąk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/60 bg-slate-950/50 px-3.5 py-2.5 hover:border-slate-700/60 transition"
                  >
                    <span className="text-xs text-slate-300 font-medium leading-relaxed">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-1.5 text-[11px] font-mono font-semibold text-teal-200 shadow-xs"
                        >
                          {k === 'Ctrl' ? (
                            <span className="flex items-center gap-0.5">
                              <Command className="w-2.5 h-2.5 inline sm:hidden" />
                              <span className="hidden sm:inline">Ctrl</span>
                            </span>
                          ) : (
                            k
                          )}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 bg-slate-950/40 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>
            Wskazówka: Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-teal-300">?</kbd> w dowolnym momencie
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
