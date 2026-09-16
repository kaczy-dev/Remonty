'use client';

import React from 'react';
import { RenovationProject } from '@/types/renovation';
import { 
  Building2, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Bell, 
  PlusCircle, 
  Layers, 
  Lock,
  Compass
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  project: RenovationProject;
  isOnline: boolean;
  onSelectRoom: (roomId: string) => void;
  onOpenAddExpense: () => void;
  onOpenNotifications: () => void;
  onOpenE2EEModal: () => void;
  onOpenAddRoomModal: () => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  isOnline,
  onSelectRoom,
  onOpenAddExpense,
  onOpenNotifications,
  onOpenE2EEModal,
  onOpenAddRoomModal,
  unreadNotificationsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 shadow-md shadow-teal-900/30 text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">RenovAI</span>
                <span className="hidden sm:inline-block rounded-md border border-teal-500/30 bg-teal-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                  PWA • Privacy-First
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="truncate font-medium text-slate-300">{project.title}</span>
                <span className="hidden md:inline text-slate-600">•</span>
                <span className="hidden md:inline text-slate-500 truncate">{project.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Room Selector Tabs */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
            {project.rooms.map((room) => {
              const isSelected = room.id === project.selectedRoomId;
              return (
                <button
                  key={room.id}
                  id={`room-tab-${room.id}`}
                  onClick={() => onSelectRoom(room.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-3 h-3 text-teal-400" />
                  <span>{room.name}</span>
                  <span className="text-[10px] opacity-60 font-mono">({room.area.toFixed(1)}m²)</span>
                </button>
              );
            })}
            <button
              id="add-room-quick-btn"
              onClick={onOpenAddRoomModal}
              title="Dodaj nowe pomieszczenie"
              className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              +
            </button>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* E2EE Vault Security Badge */}
            <button
              id="e2ee-vault-badge-btn"
              onClick={onOpenE2EEModal}
              title="Szyfrowanie End-to-End (AES-GCM). Kliknij, aby zarządzać sejfem i kopią zapasową."
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>E2EE Sejf</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
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
