'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler,
  Box,
  Wallet,
  Menu,
  Plus,
  X,
  Receipt,
  Camera,
  FileSpreadsheet,
  Bot,
  HardHat,
  CalendarDays,
  TrendingUp,
  CheckSquare,
  FileJson,
  FolderKanban,
  Sun,
  Moon,
  ChevronRight,
  Sparkles,
  Check,
  Bluetooth,
} from 'lucide-react';
import { RenovationPipelineStep } from '@/types/renovation';

export interface MobileBottomNavProps {
  activeStep: RenovationPipelineStep;
  onSelectStep: (step: RenovationPipelineStep) => void;
  onOpenQuickExpense: () => void;
  onOpenReportModal: () => void;
  onOpenAIModal?: () => void;
  onToggleWakeLock?: () => void;
  isWakeLockActive?: boolean;
  onOpenBackupModal?: () => void;
  onOpenProjectSwitcher?: () => void;
  onToggleTheme?: () => void;
  theme?: 'dark' | 'light';
  onOpenScanner?: () => void;
  onOpenLaserMeter?: () => void;
  onOpenPhotoMarkup?: () => void;
}

const triggerHaptic = (ms: number = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeStep,
  onSelectStep,
  onOpenQuickExpense,
  onOpenReportModal,
  onOpenAIModal,
  onToggleWakeLock,
  isWakeLockActive = false,
  onOpenBackupModal,
  onOpenProjectSwitcher,
  onToggleTheme,
  theme = 'dark',
  onOpenScanner,
  onOpenLaserMeter,
  onOpenPhotoMarkup,
}) => {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsQuickActionsOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when any bottom sheet is active
  useEffect(() => {
    if (isQuickActionsOpen || isMoreMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuickActionsOpen, isMoreMenuOpen]);

  const handleStepClick = useCallback(
    (step: RenovationPipelineStep) => {
      triggerHaptic(12);
      setIsQuickActionsOpen(false);
      setIsMoreMenuOpen(false);
      onSelectStep(step);
    },
    [onSelectStep]
  );

  const handleToggleQuickActions = useCallback(() => {
    triggerHaptic(12);
    setIsMoreMenuOpen(false);
    setIsQuickActionsOpen((prev) => !prev);
  }, []);

  const handleToggleMoreMenu = useCallback(() => {
    triggerHaptic(12);
    setIsQuickActionsOpen(false);
    setIsMoreMenuOpen((prev) => !prev);
  }, []);

  const isMoreActive = ['plan', 'progress', 'qa'].includes(activeStep);

  const getMoreStepLabel = () => {
    switch (activeStep) {
      case 'plan':
        return 'Harmonogram';
      case 'progress':
        return 'Dziennik';
      case 'qa':
        return 'Odbiory';
      default:
        return 'Więcej';
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. NATIVE BOTTOM NAVIGATION BAR (Thumb Zone)                             */}
      {/* ========================================================================= */}
      <nav
        aria-label="Dolna belka nawigacji"
        data-testid="mobile-bottom-nav"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-xl px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
      >
        {/* Slot 1: Pomiary (measure) */}
        <button
          type="button"
          data-testid="tab-measure"
          onClick={() => handleStepClick('measure')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition duration-150 active:scale-95 touch-manipulation ${
            activeStep === 'measure'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 active:text-teal-300'
          }`}
          title="Pomiary i skanowanie pomieszczenia"
        >
          <div
            className={`flex items-center justify-center w-8 h-7 rounded-lg transition-colors ${
              activeStep === 'measure' ? 'bg-teal-500/15 border border-teal-500/30' : ''
            }`}
          >
            <Ruler className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Pomiary</span>
        </button>

        {/* Slot 2: Projekt 3D (design) */}
        <button
          type="button"
          data-testid="tab-design"
          onClick={() => handleStepClick('design')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition duration-150 active:scale-95 touch-manipulation ${
            activeStep === 'design'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 active:text-teal-300'
          }`}
          title="Wizualizacja 3D i dobór materiałów"
        >
          <div
            className={`flex items-center justify-center w-8 h-7 rounded-lg transition-colors ${
              activeStep === 'design' ? 'bg-teal-500/15 border border-teal-500/30' : ''
            }`}
          >
            <Box className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Projekt 3D</span>
        </button>

        {/* Slot 3: Central Elevated Action Hub (FAB) */}
        <div className="flex flex-1 flex-col items-center justify-center -mt-6 relative">
          <button
            type="button"
            data-testid="tab-fab"
            onClick={handleToggleQuickActions}
            aria-label="Szybkie akcje i narzędzia budowlane"
            aria-expanded={isQuickActionsOpen}
            className={`h-12 w-12 rounded-full bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 text-slate-950 font-bold shadow-[0_8px_20px_rgba(20,184,166,0.45)] ring-4 ring-slate-950 hover:bg-teal-400 active:scale-90 transition-all duration-200 flex items-center justify-center cursor-pointer touch-manipulation ${
              isQuickActionsOpen ? 'ring-teal-400 scale-105' : ''
            }`}
            title="Szybkie akcje (paragon, pomiar AR, AI, raport)"
          >
            <Plus
              className={`w-6 h-6 transition-transform duration-200 ${
                isQuickActionsOpen ? 'rotate-45' : ''
              }`}
            />
          </button>
          <span className="text-[9px] font-semibold text-teal-400/90 mt-1 tracking-tight">Akcje</span>
        </div>

        {/* Slot 4: Kosztorys (cost) */}
        <button
          type="button"
          data-testid="tab-cost"
          onClick={() => handleStepClick('cost')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition duration-150 active:scale-95 touch-manipulation ${
            activeStep === 'cost'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 active:text-teal-300'
          }`}
          title="Kosztorys, budżet i lista wydatków"
        >
          <div
            className={`flex items-center justify-center w-8 h-7 rounded-lg transition-colors ${
              activeStep === 'cost' ? 'bg-teal-500/15 border border-teal-500/30' : ''
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Kosztorys</span>
        </button>

        {/* Slot 5: Więcej (Moduły & Narzędzia) */}
        <button
          type="button"
          data-testid="tab-more"
          onClick={handleToggleMoreMenu}
          aria-expanded={isMoreMenuOpen}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition duration-150 active:scale-95 touch-manipulation relative ${
            isMoreActive || isMoreMenuOpen
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 active:text-teal-300'
          }`}
          title="Pozostałe moduły, harmonogram, odbiory i narzędzia"
        >
          <div
            className={`flex items-center justify-center w-8 h-7 rounded-lg transition-colors relative ${
              isMoreActive || isMoreMenuOpen ? 'bg-teal-500/15 border border-teal-500/30' : ''
            }`}
          >
            <Menu className="w-4 h-4" />
            {isMoreActive && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-400 ring-1 ring-slate-950 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight truncate max-w-[55px]">
            {isMoreActive ? getMoreStepLabel() : 'Więcej'}
          </span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 2. QUICK ACTIONS BOTTOM SHEET                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isQuickActionsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsQuickActionsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Bottom Drawer Card */}
            <motion.div
              data-testid="quick-actions-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="relative w-full max-w-lg rounded-t-3xl border-t border-slate-800 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4"
            >
              {/* Native Grab Handle Pill */}
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-xs">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Szybkie Akcje Remontowe</h3>
                    <p className="text-[11px] text-slate-400">Natychmiastowy dostęp do kluczowych funkcji</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickActionsOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                  title="Zamknij menu akcji"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action List Grid */}
              <div className="space-y-2 pt-1">
                {/* 1. Dodaj wydatek / Skanuj paragon (OCR) */}
                <button
                  type="button"
                  data-testid="action-quick-expense"
                  onClick={() => {
                    triggerHaptic(12);
                    setIsQuickActionsOpen(false);
                    onOpenQuickExpense();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 group-hover:scale-105 transition">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                        Dodaj wydatek / Skanuj paragon
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Aparat OCR, rozpoznawanie pozycji i kwot
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                </button>

                {/* 2. Skaner pomiarów kamerą AR */}
                <button
                  type="button"
                  data-testid="action-ar-scanner"
                  onClick={() => {
                    triggerHaptic(12);
                    setIsQuickActionsOpen(false);
                    if (onOpenScanner) {
                      onOpenScanner();
                    } else {
                      onSelectStep('measure');
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 group-hover:scale-105 transition">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition">
                        Skaner pomiarów kamerą AR
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Siatka perspektywiczna i kalibracja laserowa
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                </button>

                {/* 2b. Foto-Wymiarowanie ściany (MeasureOn Style) */}
                {onOpenPhotoMarkup && (
                  <button
                    type="button"
                    data-testid="action-photo-markup"
                    onClick={() => {
                      triggerHaptic(12);
                      setIsQuickActionsOpen(false);
                      onOpenPhotoMarkup();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:scale-105 transition">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition">
                          Foto-Wymiarowanie ściany
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Strzałki wymiarowe i punkty instalacji na zdjęciu
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
                  </button>
                )}

                {/* 2c. Dalmierz Laserowy BLE */}
                {onOpenLaserMeter && (
                  <button
                    type="button"
                    data-testid="action-laser-meter"
                    onClick={() => {
                      triggerHaptic(12);
                      setIsQuickActionsOpen(false);
                      onOpenLaserMeter();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-teal-500/30 bg-teal-950/20 hover:bg-teal-900/30 active:bg-teal-900/50 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 group-hover:scale-105 transition">
                        <Bluetooth className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-teal-200 group-hover:text-teal-100 transition flex items-center gap-1.5">
                          Dalmierz Laserowy (BLE)
                          <span className="rounded-full bg-teal-500/30 px-1.5 py-0.2 text-[9px] font-mono text-teal-300 border border-teal-500/40">
                            Bluetooth
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Bosch GLM, Leica DISTO, bezprzewodowy odczyt
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-400" />
                  </button>
                )}

                {/* 3. Generuj raport PDF i kosztorys */}
                <button
                  type="button"
                  data-testid="action-report"
                  onClick={() => {
                    triggerHaptic(12);
                    setIsQuickActionsOpen(false);
                    onOpenReportModal();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 group-hover:scale-105 transition">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition">
                        Generuj raport PDF i kosztorys
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Gotowy obmiar, protokół odbioru i eksport CSV
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                </button>

                {/* 4. Zapytaj Konsultanta AI (Kaczak) */}
                {onOpenAIModal && (
                  <button
                    type="button"
                    data-testid="action-ai-consultant"
                    onClick={() => {
                      triggerHaptic(12);
                      setIsQuickActionsOpen(false);
                      onOpenAIModal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-teal-500/30 bg-teal-950/30 hover:bg-teal-900/40 active:bg-teal-900/60 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 group-hover:scale-105 transition">
                        <Bot className="w-5 h-5 text-teal-300" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-teal-200 group-hover:text-teal-100 transition flex items-center gap-1.5">
                          Zapytaj Konsultanta AI (Kaczak)
                          <span className="rounded-full bg-teal-500/30 px-1.5 py-0.2 text-[9px] font-mono text-teal-300 border border-teal-500/40">
                            GPT-4o
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Normy PN-EN, dobór chemii budowlanej i technologie
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-400" />
                  </button>
                )}

                {/* 5. Przełącz Tryb Budowa (Screen Wake Lock) */}
                {onToggleWakeLock && (
                  <button
                    type="button"
                    data-testid="action-wake-lock"
                    onClick={() => {
                      triggerHaptic(12);
                      onToggleWakeLock();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left group cursor-pointer ${
                      isWakeLockActive
                        ? 'border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/50'
                        : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                          isWakeLockActive
                            ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                          Tryb Budowa (Screen Wake Lock)
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                              isWakeLockActive
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isWakeLockActive ? 'Włączony' : 'Wyłączony'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isWakeLockActive
                            ? 'Ekran nie wygasza się podczas pracy z miarką'
                            : 'Włącz, aby ekran nie gasł na budowie'}
                        </div>
                      </div>
                    </div>
                    {isWakeLockActive ? (
                      <Check className="w-4 h-4 text-amber-400" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-600" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. WIĘCEJ (MODUŁY & NARZĘDZIA) DRAWER                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Bottom Drawer Card */}
            <motion.div
              data-testid="more-menu-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="relative w-full max-w-lg rounded-t-3xl border-t border-slate-800 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Native Grab Handle Pill */}
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-xs">
                    <Menu className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Więcej Modułów & Narzędzi</h3>
                    <p className="text-[11px] text-slate-400">Zarządzanie etapami, jakością i projektem</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                  title="Zamknij menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Workflow Stages */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Etapy Realizacji & Jakość
                </div>

                {/* 1. Harmonogram Gantt & Ekipy (plan) */}
                <button
                  type="button"
                  data-testid="more-step-plan"
                  onClick={() => handleStepClick('plan')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left group cursor-pointer ${
                    activeStep === 'plan'
                      ? 'border-teal-500/50 bg-teal-950/40 text-teal-200'
                      : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        activeStep === 'plan'
                          ? 'bg-teal-500/30 text-teal-300 border-teal-500/50'
                          : 'bg-slate-800 text-teal-400 border-slate-700'
                      }`}
                    >
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold group-hover:text-teal-300 transition">
                        Harmonogram Gantt & Ekipy
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Kamienie milowe, kolejność prac i wykonawcy
                      </div>
                    </div>
                  </div>
                  {activeStep === 'plan' ? (
                    <span className="rounded-full bg-teal-500 text-slate-950 text-[10px] font-bold px-2 py-0.5">
                      Aktywny
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                  )}
                </button>

                {/* 2. Dziennik Prac & Czas Schnięcia (progress) */}
                <button
                  type="button"
                  data-testid="more-step-progress"
                  onClick={() => handleStepClick('progress')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left group cursor-pointer ${
                    activeStep === 'progress'
                      ? 'border-teal-500/50 bg-teal-950/40 text-teal-200'
                      : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        activeStep === 'progress'
                          ? 'bg-teal-500/30 text-teal-300 border-teal-500/50'
                          : 'bg-slate-800 text-amber-400 border-slate-700'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold group-hover:text-teal-300 transition">
                        Dziennik Prac & Czas Schnięcia
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Wylewki, hydroizolacje, schnięcie tynków i zdjęcia
                      </div>
                    </div>
                  </div>
                  {activeStep === 'progress' ? (
                    <span className="rounded-full bg-teal-500 text-slate-950 text-[10px] font-bold px-2 py-0.5">
                      Aktywny
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                  )}
                </button>

                {/* 3. Odbiory Techniczne & Checklista (qa) */}
                <button
                  type="button"
                  data-testid="more-step-qa"
                  onClick={() => handleStepClick('qa')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left group cursor-pointer ${
                    activeStep === 'qa'
                      ? 'border-teal-500/50 bg-teal-950/40 text-teal-200'
                      : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        activeStep === 'qa'
                          ? 'bg-teal-500/30 text-teal-300 border-teal-500/50'
                          : 'bg-slate-800 text-emerald-400 border-slate-700'
                      }`}
                    >
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold group-hover:text-teal-300 transition">
                        Odbiory Techniczne & Checklista
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Normy PN-B, tolerancje kątów, usterki i protokoły
                      </div>
                    </div>
                  </div>
                  {activeStep === 'qa' ? (
                    <span className="rounded-full bg-teal-500 text-slate-950 text-[10px] font-bold px-2 py-0.5">
                      Aktywny
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                  )}
                </button>
              </div>

              {/* Section 2: Management & Settings */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Narzędzia & Konfiguracja
                </div>

                {/* 4. Kopia zapasowa / Eksport JSON */}
                {onOpenBackupModal && (
                  <button
                    type="button"
                    data-testid="more-backup"
                    onClick={() => {
                      triggerHaptic(12);
                      setIsMoreMenuOpen(false);
                      onOpenBackupModal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 group-hover:scale-105 transition">
                        <FileJson className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                          Kopia zapasowa / Eksport JSON
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Pobierz plik projektu lub przywróć dane z pliku
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                  </button>
                )}

                {/* 5. Przełącznik mieszkań / projektów */}
                {onOpenProjectSwitcher && (
                  <button
                    type="button"
                    data-testid="more-project-switcher"
                    onClick={() => {
                      triggerHaptic(12);
                      setIsMoreMenuOpen(false);
                      onOpenProjectSwitcher();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 group-hover:scale-105 transition">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                          Przełącznik mieszkań / projektów
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Zarządzaj wieloma inwestycjami i lokalami
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                  </button>
                )}

                {/* 6. Przełącznik motywu (Jasny / Ciemny) */}
                {onToggleTheme && (
                  <button
                    type="button"
                    data-testid="more-theme-toggle"
                    onClick={() => {
                      triggerHaptic(12);
                      onToggleTheme();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-amber-400 border border-slate-700 group-hover:scale-105 transition">
                        {theme === 'dark' ? (
                          <Sun className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Moon className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                          {theme === 'dark' ? 'Tryb Jasny (Light Mode)' : 'Tryb Ciemny (Dark Mode)'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Zmień kolorystykę interfejsu aplikacji
                        </div>
                      </div>
                    </div>
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-300">
                      {theme === 'dark' ? 'Ciemny' : 'Jasny'}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
