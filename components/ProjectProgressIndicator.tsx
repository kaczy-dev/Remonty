'use client';

import React, { useState } from 'react';
import { Room, RoomWorkStage } from '@/types/renovation';
import { 
  calculateProjectProgress, 
  calculateRoomProgress, 
  getRoomWorkStages 
} from '@/lib/progress-helper';
import { 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Clock, 
  Layers, 
  Maximize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectProgressIndicatorProps {
  rooms: Room[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenProgressPage: () => void;
  onToggleStage?: (roomId: string, stageId: string) => void;
}

export const ProjectProgressIndicator: React.FC<ProjectProgressIndicatorProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onOpenProgressPage,
  onToggleStage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeQuickRoomId, setActiveQuickRoomId] = useState<string | null>(null);

  const projectSummary = calculateProjectProgress(rooms);

  const activeQuickRoom = rooms.find((r) => r.id === (activeQuickRoomId || selectedRoomId)) || rooms[0];
  const activeQuickStages = activeQuickRoom ? getRoomWorkStages(activeQuickRoom) : [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md backdrop-blur-md overflow-hidden">
      
      {/* Main Bar */}
      <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Overall Project Meter */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Postęp Remontu
              </span>
              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold font-mono text-slate-300">
                {projectSummary.percent}%
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({projectSummary.completedStages} z {projectSummary.totalStages} etapów)
              </span>
            </div>
            
            {/* Horizontal Mini Project Bar */}
            <div className="flex items-center gap-2.5 mt-1.5">
              <div className="w-32 sm:w-48 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${projectSummary.percent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 truncate">
                {projectSummary.completedArea} / {projectSummary.totalArea} m²
              </span>
            </div>
          </div>
        </div>

        {/* Center: Quick Room Progress Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {rooms.map((room) => {
            const prog = calculateRoomProgress(room);
            const isSelected = room.id === selectedRoomId;

            return (
              <button
                key={room.id}
                id={`quick-room-pill-${room.id}`}
                onClick={() => {
                  onSelectRoom(room.id);
                  setActiveQuickRoomId(room.id);
                }}
                className={`group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition border shrink-0 ${
                  isSelected
                    ? 'border-teal-500/50 bg-teal-950/40 text-teal-200 shadow-xs'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                {/* Status Dot / Check */}
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  prog.percent === 100
                    ? 'bg-emerald-500 text-slate-950'
                    : prog.percent >= 50
                    ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40'
                    : prog.percent > 0
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {prog.percent === 100 ? '✓' : `${prog.percent}%`}
                </span>

                <span className="font-medium max-w-[100px] truncate">{room.name}</span>

                {/* Progress bar line under button */}
                <span className="w-8 h-1 rounded-full bg-slate-800 overflow-hidden hidden lg:inline-block">
                  <span
                    className={`block h-full bg-gradient-to-r ${prog.progressBarGradient}`}
                    style={{ width: `${prog.percent}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            id="quick-checklist-drawer-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            title="Szybkie oznaczanie etapów dla bieżącego pokoju"
          >
            <span>Etapy pokoju</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            id="open-full-progress-page-btn"
            onClick={onOpenProgressPage}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-500 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dedykowany widok</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Expandable Quick-Checklist Drawer for Selected Room */}
      <AnimatePresence>
        {isExpanded && activeQuickRoom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 bg-slate-950/70 p-4 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-300">
                  Szybkie oznaczanie etapów dla: {activeQuickRoom.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({calculateRoomProgress(activeQuickRoom).percent}% ukończono)
                </span>
              </div>
              <button
                onClick={onOpenProgressPage}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                <span>Otwórz pełną macierz i zarządzanie wszystkimi pokojami</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {activeQuickStages.map((stage, idx) => {
                const isDone = stage.completed || stage.status === 'done';

                return (
                  <button
                    key={stage.id}
                    onClick={() => onToggleStage && onToggleStage(activeQuickRoom.id, stage.id)}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-left border transition ${
                      isDone
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-950'
                    }`}>
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className={`truncate text-xs ${isDone ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                      {stage.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
