'use client';

import React from 'react';
import { RenovationProject } from '@/types/renovation';
import {
  Building2,
  Wifi,
  WifiOff,
  Bell,
  PlusCircle,
  Layers,
  FileJson,
  FileSpreadsheet,
  Sun,
  Moon,
  FolderKanban,
  ChevronDown,
  Search,
  HardHat,
  Keyboard,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  project: RenovationProject;
  projectsCount?: number;
  isOnline: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSelectRoom: (roomId: string) => void;
  onOpenAddExpense: () => void;
  onOpenNotifications: () => void;
  onOpenBackupModal: () => void;
  onOpenAddRoomModal: () => void;
  onOpenReportModal: () => void;
  onOpenProjectSwitcher?: () => void;
  unreadNotificationsCount: number;
  onOpenCommandPalette?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  isWakeLockActive?: boolean;
  onToggleWakeLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  projectsCount = 1,
  isOnline,
  theme = 'dark',
  onToggleTheme,
  onSelectRoom,
  onOpenAddExpense,
  onOpenNotifications,
  onOpenBackupModal,
  onOpenAddRoomModal,
  onOpenReportModal,
  onOpenProjectSwitcher,
  unreadNotificationsCount,
  onOpenCommandPalette,
  onOpenKeyboardShortcuts,
  isWakeLockActive = false,
  onToggleWakeLock,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-teal-900/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="Renowacje u Kaczaka" className="h-10 w-10" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">Renowacje u Kaczaka</span>
                <span className="hidden sm:inline-block rounded-md border border-teal-500/30 bg-teal-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300 whitespace-nowrap">
                  PWA • Privacy-First
                </span>
              </div>
              <button
                type="button"
                id="header-project-switcher-btn"
                onClick={onOpenProjectSwitcher}
                className="group flex items-center gap-1.5 text-xs text-slate-300 hover:text-teal-300 transition text-left cursor-pointer max-w-[200px] sm:max-w-[280px]"
                title="Kliknij, aby przełączyć projekt lub dodać nowe mieszkanie"
              >
                <FolderKanban className="w-3.5 h-3.5 shrink-0 text-teal-400 group-hover:scale-110 transition" />
                <span className="truncate font-semibold text-slate-200 group-hover:text-teal-300 transition">
                  {project.title}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-teal-400 shrink-0 transition" />
                {projectsCount > 1 && (
                  <span className="rounded-md bg-teal-950/80 px-1.5 py-0.2 text-[9px] font-mono text-teal-300 border border-teal-800/40 shrink-0">
                    {projectsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Global Command Palette Search Bar */}
          {onOpenCommandPalette && (
            <button
              type="button"
              id="header-command-palette-btn"
              onClick={onOpenCommandPalette}
              title="Wyszukaj pokój, moduł lub akcję (Ctrl + K)"
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 sm:px-3 py-1.5 text-xs text-slate-400 hover:border-teal-500/40 hover:text-slate-200 transition group shadow-xs shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition" />
              <span className="hidden md:inline">Szukaj lub Ctrl+K...</span>
              <span className="md:hidden">Szukaj...</span>
              <kbd className="hidden lg:inline-flex items-center rounded border border-slate-700 bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-teal-300">
                Ctrl K
              </kbd>
            </button>
          )}

          {/* Quick Room Selector Tabs */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 max-w-xs xl:max-w-md overflow-x-auto no-scrollbar shrink">
            {project.rooms.map((room) => {
              const isSelected = room.id === project.selectedRoomId;
              return (
                <button
                  key={room.id}
                  id={`room-tab-${room.id}`}
                  onClick={() => onSelectRoom(room.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-3 h-3 text-teal-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{room.name}</span>
                  <span className="text-[10px] opacity-60 font-mono">({room.area.toFixed(1)}m²)</span>
                </button>
              );
            })}
            <button
              id="add-room-quick-btn"
              onClick={onOpenAddRoomModal}
              title="Dodaj nowe pomieszczenie"
              className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            >
              +
            </button>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Backup Export/Import Badge */}
            <button
              id="backup-badge-btn"
              onClick={onOpenBackupModal}
              title="Pobierz lub przywróć kopię zapasową projektu (plik JSON)."
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/40 px-2.5 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/40 transition"
            >
              <FileJson className="w-3.5 h-3.5 text-teal-400" />
              <span>Kopia</span>
            </button>

            {/* Report & Cost Estimate Generator Badge */}
            <button
              id="report-generator-header-btn"
              onClick={onOpenReportModal}
              title="Generuj pełny raport techniczny, kosztorys i protokół odbioru (PDF / Druk / CSV)"
              className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/60 px-2.5 py-1.5 text-xs font-medium text-teal-200 hover:bg-teal-900/60 hover:text-white transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Raport & Kosztorys</span>
              <span className="sm:hidden">Raport</span>
            </button>

            {/* Network / Offline Pill */}
            <div 
              title={isOnline ? 'Aplikacja online (synchronizacja gotowa)' : 'Aplikacja w trybie offline (pełna praca lokalna)'}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium border ${
                isOnline 
                  ? 'border-slate-800 bg-slate-900 text-slate-300' 
                  : 'border-amber-500/40 bg-amber-950/60 text-amber-300'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <Wifi className="w-3 h-3 text-emerald-400 hidden sm:inline" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Job Site Mode (Screen Wake Lock) Button */}
            {onToggleWakeLock && (
              <button
                id="job-site-mode-btn"
                onClick={onToggleWakeLock}
                title={
                  isWakeLockActive
                    ? 'Tryb Budowa AKTYWNY: ekran nie wygasza się podczas pracy. Kliknij, aby wyłączyć.'
                    : 'Włącz Tryb Budowa: blokada wygaszania ekranu podczas pracy z miarką'
                }
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isWakeLockActive
                    ? 'border-amber-500/80 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 shadow-xs'
                }`}
              >
                <HardHat className={`w-4 h-4 ${isWakeLockActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden xl:inline text-[11px]">
                  {isWakeLockActive ? 'Budowa ON' : 'Tryb Budowa'}
                </span>
              </button>
            )}

            {/* Keyboard Shortcuts (?) Button */}
            {onOpenKeyboardShortcuts && (
              <button
                id="keyboard-shortcuts-btn"
                onClick={onOpenKeyboardShortcuts}
                title="Pokaż skróty klawiszowe (?)"
                className="hidden md:flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition shadow-xs"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Theme Switcher Toggle (Dark Mode / Light Mode) */}
            {onToggleTheme && (
              <button
                id="theme-toggle-btn"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Przełącz na Tryb Jasny (Light Mode)' : 'Przełącz na Tryb Ciemny (Dark Mode)'}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-xs"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline text-[11px]">Jasny</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline text-[11px]">Ciemny</span>
                  </>
                )}
              </button>
            )}

            {/* Notification Bell */}
            <button
              id="notifications-bell-btn"
              onClick={onOpenNotifications}
              title="Powiadomienia i alerty technologiczne"
              className="relative rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 ring-2 ring-slate-950">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Quick Add Expense CTA */}
            <button
              id="quick-add-expense-btn"
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Wydatek</span>
            </button>

          </div>

        </div>

        {/* Mobile Room Selector */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1.5 no-scrollbar border-t border-slate-900">
          {project.rooms.map((room) => {
            const isSelected = room.id === project.selectedRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap font-medium transition ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 bg-slate-900 border border-slate-800'
                }`}
              >
                <span>{room.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{room.area.toFixed(1)}m²</span>
              </button>
            );
          })}
          <button
            onClick={onOpenAddRoomModal}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 bg-slate-900 border border-slate-800"
          >
            + Pokój
          </button>
        </div>

      </div>
    </header>
  );
};
