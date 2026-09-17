'use client';

import React, { useState } from 'react';
import { Room, RoomWorkStage, StageStatus, StageCategory } from '@/types/renovation';
import { 
  calculateRoomProgress, 
  calculateProjectProgress, 
  getRoomWorkStages,
  RoomProgressInfo 
} from '@/lib/progress-helper';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Hammer, 
  Plus, 
  Layers, 
  Grid, 
  Sparkles, 
  Check, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Building,
  Wrench,
  Paintbrush,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewRenovationProgressProps {
  rooms: Room[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onUpdateRoomStages: (roomId: string, stages: RoomWorkStage[]) => void;
  onToggleRoomCompleted: (roomId: string, completed: boolean) => void;
  onConsultAI?: (prompt: string) => void;
  onNavigateToStep?: (step: string) => void;
}

export const ViewRenovationProgress: React.FC<ViewRenovationProgressProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoomStages,
  onToggleRoomCompleted,
  onConsultAI,
  onNavigateToStep,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [filterStatus, setFilterStatus] = useState<'all' | 'done' | 'in_progress' | 'pending'>('all');
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({
    [selectedRoomId]: true,
  });

  // Adding custom stage state
  const [addingStageRoomId, setAddingStageRoomId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<StageCategory>('finishing');

  // Project progress summary
  const projectSummary = calculateProjectProgress(rooms);

  // Toggle single stage completion
  const handleToggleStage = (roomId: string, stageId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const stages = getRoomWorkStages(targetRoom);
    const updatedStages = stages.map((st) => {
      if (st.id !== stageId) return st;
      const willBeCompleted = !st.completed;
      return {
        ...st,
        completed: willBeCompleted,
        status: (willBeCompleted ? 'done' : 'in_progress') as StageStatus,
        completedAt: willBeCompleted ? new Date().toISOString().slice(0, 10) : undefined,
      };
    });

    onUpdateRoomStages(roomId, updatedStages);
  };

  // Change stage status (done, in_progress, planned)
  const handleChangeStageStatus = (roomId: string, stageId: string, newStatus: StageStatus) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const stages = getRoomWorkStages(targetRoom);
    const updatedStages = stages.map((st) => {
      if (st.id !== stageId) return st;
      const isDone = newStatus === 'done';
      return {
        ...st,
        status: newStatus,
        completed: isDone,
        completedAt: isDone ? (st.completedAt || new Date().toISOString().slice(0, 10)) : undefined,
      };
    });

    onUpdateRoomStages(roomId, updatedStages);
  };

  // Mark all stages in a room as completed
  const handleMarkAllRoomStagesDone = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const stages = getRoomWorkStages(targetRoom);
    const updatedStages = stages.map((st) => ({
      ...st,
      completed: true,
      status: 'done' as StageStatus,
      completedAt: st.completedAt || new Date().toISOString().slice(0, 10),
    }));

    onUpdateRoomStages(roomId, updatedStages);
    onToggleRoomCompleted(roomId, true);
  };

  // Reset all stages in a room to in progress / planned
  const handleResetRoomStages = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const stages = getRoomWorkStages(targetRoom);
    const updatedStages = stages.map((st, idx) => ({
      ...st,
      completed: false,
      status: (idx === 0 ? 'in_progress' : 'planned') as StageStatus,
      completedAt: undefined,
    }));

    onUpdateRoomStages(roomId, updatedStages);
    onToggleRoomCompleted(roomId, false);
  };

  // Add new custom stage
  const handleAddNewStage = (roomId: string) => {
    if (!newStageName.trim()) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const currentStages = getRoomWorkStages(targetRoom);
    const newStage: RoomWorkStage = {
      id: `${roomId}-custom-${Date.now()}`,
      name: newStageName.trim(),
      category: newStageCategory,
      completed: false,
      status: 'planned',
      order: currentStages.length + 1,
      notes: 'Własny etap dodany przez użytkownika',
    };

    onUpdateRoomStages(roomId, [...currentStages, newStage]);
    setNewStageName('');
    setAddingStageRoomId(null);
  };

  // Delete a stage
  const handleDeleteStage = (roomId: string, stageId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const stages = getRoomWorkStages(targetRoom);
    const updated = stages.filter((s) => s.id !== stageId);
    onUpdateRoomStages(roomId, updated);
  };

  // Toggle room accordion expansion
  const toggleRoomExpand = (roomId: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  // Filtering rooms
  const filteredRooms = rooms.filter((room) => {
    const prog = calculateRoomProgress(room);
    if (filterStatus === 'done') return prog.percent === 100;
    if (filterStatus === 'in_progress') return prog.percent > 0 && prog.percent < 100;
    if (filterStatus === 'pending') return prog.percent === 0;
    return true;
  });

  // Standard category labels
  const CATEGORY_NAMES: Record<string, string> = {
    demolition: 'Burzenie & Demontaże',
    installation: 'Instalacje (Wod-kan & Elektryka)',
    masonry: 'Tynkowanie & Gładzie',
    insulation: 'Hydroizolacja & Wylewki',
    finishing: 'Kafelkowanie & Malowanie',
    flooring: 'Montaż Posadzki',
    carpentry: 'Biały montaż & Stolarka',
    cleanup: 'Sprzątanie i Odbiory',
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE PROJECT DASHBOARD: TOTAL PROGRESS METRICS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left: Overall Project State */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <TrendingUp className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Wizualizacja Postępu Remontu
              </span>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                {projectSummary.overallStatusText}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-3">
                <span>{projectSummary.percent}%</span>
                <span className="text-sm sm:text-base font-medium text-slate-400">
                  całkowitego zaawansowania projektu
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Zrealizowano <strong className="text-white">{projectSummary.completedStages} z {projectSummary.totalStages}</strong> etapów prac budowlano-wykończeniowych ({projectSummary.completedArea} m² z {projectSummary.totalArea} m² powierzchni mieszkania).
              </p>
            </div>

            {/* Main Project Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Stan początkowy (0%)</span>
                <span className="text-teal-300 font-bold">{projectSummary.percent}% Ukończono</span>
                <span>Odbiór kluczy (100%)</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${projectSummary.percent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 shadow-lg shadow-teal-500/20 relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right: KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 min-w-[280px]">
            
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Ukończone Pokoje</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {projectSummary.completedRooms} <span className="text-xs text-slate-500 font-normal">/ {projectSummary.totalRooms}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">100% gotowości</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Pokoje w toku</div>
              <div className="text-lg font-bold font-mono text-teal-300 mt-0.5">
                {projectSummary.inProgressRooms} <span className="text-xs text-slate-500 font-normal">/ {projectSummary.totalRooms}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Trwają prace montażowe</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Etapy Prac</div>
              <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                {projectSummary.completedStages} <span className="text-xs text-slate-500 font-normal">/ {projectSummary.totalStages}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Pozostało: {projectSummary.totalStages - projectSummary.completedStages}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Powierzchnia</div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                {projectSummary.completedArea} <span className="text-xs text-slate-500 font-normal">m²</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">z {projectSummary.totalArea} m² netto</div>
            </div>

          </div>

        </div>

        {/* AI Quick Consult CTA */}
        {onConsultAI && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                Asystent AI analizuje harmonogram: gotowość technologiczna pozwala na jednoczesne rozpoczęcie gładzi w salonie i kafelkowania w łazience.
              </span>
            </div>
            <button
              onClick={() => onConsultAI(`Przeanalizuj bieżący stan zaawansowania prac (${projectSummary.percent}% ukończone, ${projectSummary.completedStages}/${projectSummary.totalStages} etapów). Jak optymalnie zaplanować następny tydzień, aby uniknąć przestojów technologicznych i kolizji ekipy?`)}
              className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/60 px-3 py-1.5 font-semibold text-teal-300 hover:bg-teal-900/60 transition shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Audyt Kolejności Prac z AI</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTROLS: VIEW SWITCHER (CARDS VS MATRIX) & STATUS FILTERS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        
        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="view-mode-cards-btn"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Karty Pomieszczeń</span>
            </button>
            <button
              id="view-mode-matrix-btn"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'matrix'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Macierz Postępu (Wszystkie Pokoje)</span>
            </button>
          </div>
        </div>

        {/* Filter by room status */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden md:inline">
            Filtruj pokoje:
          </span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wszystkie ({rooms.length})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterStatus === 'in_progress'
                ? 'bg-teal-950 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            W toku ({rooms.filter((r) => calculateRoomProgress(r).percent > 0 && calculateRoomProgress(r).percent < 100).length})
          </button>
          <button
            onClick={() => setFilterStatus('done')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterStatus === 'done'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ukończone ({rooms.filter((r) => calculateRoomProgress(r).percent === 100).length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterStatus === 'pending'
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Do rozpoczęcia ({rooms.filter((r) => calculateRoomProgress(r).percent === 0).length})
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MODE A: ROOM CARDS VIEW (WITH EXPANDABLE STAGES & CHECKLIST) */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const progress = calculateRoomProgress(room);
            const stages = getRoomWorkStages(room);
            const isExpanded = !!expandedRooms[room.id];
            const isCurrentSelected = room.id === selectedRoomId;

            return (
              <div
                key={room.id}
                id={`room-progress-card-${room.id}`}
                className={`rounded-2xl border transition-all ${
                  isCurrentSelected
                    ? 'border-teal-500/50 bg-slate-900 shadow-lg shadow-teal-950/20 ring-1 ring-teal-500/20'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Room Card Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Left: Info & Thumbnail */}
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 relative">
                        {room.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={room.photoUrl}
                            alt={room.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-teal-400">
                            <Building className="w-5 h-5" />
                          </div>
                        )}
                        {progress.percent === 100 && (
                          <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-[1px] flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white hover:text-teal-300 transition cursor-pointer" onClick={() => onSelectRoom(room.id)}>
                            {room.name}
                          </h3>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${progress.badgeBg} ${progress.badgeText} ${progress.badgeBorder}`}>
                            {progress.statusText}
                          </span>
                          {isCurrentSelected && (
                            <span className="rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-300 px-1.5 py-0.2 text-[10px] font-medium">
                              Aktywny w projekcie
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                          <span>{room.area.toFixed(1)} m² posadzki</span>
                          <span>•</span>
                          <span>{room.wallArea.toFixed(1)} m² ścian</span>
                          <span>•</span>
                          <span>{progress.completedCount} z {progress.totalCount} etapów</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress Meter & Actions */}
                    <div className="flex items-center gap-4 sm:justify-end">
                      
                      {/* Mini Bar & Percent */}
                      <div className="w-36 sm:w-44 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[11px] text-slate-400">Stan prac</span>
                          <span className={`font-mono font-bold ${progress.colorClass}`}>
                            {progress.percent}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${progress.progressBarGradient} transition-all duration-500`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {progress.percent < 100 ? (
                          <button
                            id={`mark-room-done-btn-${room.id}`}
                            onClick={() => handleMarkAllRoomStagesDone(room.id)}
                            title="Oznacz wszystkie etapy tego pokoju jako zakończone"
                            className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Oznacz jako gotowy</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResetRoomStages(room.id)}
                            title="Cofnij status ukończenia pokoju"
                            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Cofnij</span>
                          </button>
                        )}

                        <button
                          id={`toggle-expand-room-btn-${room.id}`}
                          onClick={() => toggleRoomExpand(room.id)}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white transition"
                          title={isExpanded ? 'Zwiń etapy prac' : 'Rozwiń etapy prac'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                  </div>
                </div>

                {/* Expanded Stages Checklist */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800 bg-slate-950/50 p-4 sm:p-5 overflow-hidden space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-teal-400" />
                          Poszczególne etapy wykonawcze ({stages.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAddingStageRoomId(addingStageRoomId === room.id ? null : room.id)}
                            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition"
                          >
                            <Plus className="w-3 h-3 text-teal-400" />
                            <span>Dodaj własny etap</span>
                          </button>
                        </div>
                      </div>

                      {/* Add new stage inline form */}
                      {addingStageRoomId === room.id && (
                        <div className="rounded-xl border border-teal-500/40 bg-slate-900 p-3.5 space-y-3 animate-fadeIn">
                          <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nowy etap prac dla: {room.name}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Nazwa etapu (np. Montaż oświetlenia szynowego)"
                              value={newStageName}
                              onChange={(e) => setNewStageName(e.target.value)}
                              className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                            />
                            <select
                              value={newStageCategory}
                              onChange={(e) => setNewStageCategory(e.target.value as StageCategory)}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
                            >
                              <option value="demolition">Burzenie / Demontaż</option>
                              <option value="installation">Instalacje</option>
                              <option value="masonry">Tynkowanie / Gładzie</option>
                              <option value="insulation">Hydroizolacja</option>
                              <option value="finishing">Kafelkowanie / Malowanie</option>
                              <option value="flooring">Podłogi</option>
                              <option value="carpentry">Biały montaż / Stolarka</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setAddingStageRoomId(null)}
                              className="rounded-lg border border-slate-800 px-3 py-1 text-slate-400 hover:text-white"
                            >
                              Anuluj
                            </button>
                            <button
                              onClick={() => handleAddNewStage(room.id)}
                              className="rounded-lg bg-teal-600 px-3 py-1 font-semibold text-white hover:bg-teal-500 transition"
                            >
                              Zapisz etap
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stages list */}
                      <div className="space-y-2">
                        {stages.map((stage, idx) => {
                          const isDone = stage.completed || stage.status === 'done';
                          const isInProgress = !isDone && stage.status === 'in_progress';

                          return (
                            <div
                              key={stage.id}
                              id={`stage-item-${stage.id}`}
                              className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                isDone
                                  ? 'border-emerald-500/20 bg-emerald-950/10'
                                  : isInProgress
                                  ? 'border-teal-500/30 bg-teal-950/15'
                                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70'
                              }`}
                            >
                              {/* Stage Checkbox & Title */}
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  id={`checkbox-stage-${stage.id}`}
                                  onClick={() => handleToggleStage(room.id, stage.id)}
                                  className={`h-5 w-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                                    isDone
                                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                      : 'border-slate-700 bg-slate-950 hover:border-teal-400'
                                  }`}
                                  title={isDone ? 'Kliknij, aby cofnąć ukończenie' : 'Kliknij, aby oznaczyć jako ukończony'}
                                >
                                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-mono text-slate-500">
                                      #{idx + 1}
                                    </span>
                                    <h4 className={`text-xs font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                      {stage.name}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {CATEGORY_NAMES[stage.category] || stage.category}
                                    </span>
                                    {stage.completedAt && (
                                      <span className="text-[10px] text-emerald-400 font-mono">
                                        ✓ Ukończono: {stage.completedAt}
                                      </span>
                                    )}
                                  </div>
                                  {stage.notes && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                      {stage.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Stage Status Selector */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <select
                                  value={stage.status}
                                  onChange={(e) => handleChangeStageStatus(room.id, stage.id, e.target.value as StageStatus)}
                                  className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border bg-slate-950 transition focus:outline-hidden ${
                                    stage.status === 'done'
                                      ? 'border-emerald-500/40 text-emerald-300'
                                      : stage.status === 'in_progress'
                                      ? 'border-teal-500/40 text-teal-300'
                                      : 'border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <option value="planned">Zaplanowany</option>
                                  <option value="in_progress">W trakcie (50%)</option>
                                  <option value="done">Ukończony (100%)</option>
                                </select>

                                {/* Delete stage if custom */}
                                {stage.id.includes('custom') && (
                                  <button
                                    onClick={() => handleDeleteStage(room.id, stage.id)}
                                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                                    title="Usuń ten etap"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODE B: PROGRESS MATRIX VIEW (ALL ROOMS × ALL WORK DISCIPLINES) */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl overflow-x-auto">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Grid className="w-4 h-4 text-teal-400" />
              Zbiorcza Macierz Postępu Prac Budowlanych
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Szybki podgląd i edycja statusów dla poszczególnych branż we wszystkich pomieszczeniach. Kliknij kafelek, aby zmienić stan (Zaplanowane → W toku → Ukończone).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Pomieszczenie</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Burzenie</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Instalacje</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Tynki/Gładzie</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Hydro / Płytki</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Malowanie</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Podłogi</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Biały montaż</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Postęp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rooms.map((room) => {
                  const progress = calculateRoomProgress(room);
                  const stages = getRoomWorkStages(room);

                  // Helper to find stage matching category
                  const getStageForCat = (cat: StageCategory) => stages.find((s) => s.category === cat) || stages[0];

                  const categoriesToCheck: StageCategory[] = [
                    'demolition',
                    'installation',
                    'masonry',
                    'insulation',
                    'finishing',
                    'flooring',
                    'carpentry',
                  ];

                  return (
                    <tr key={room.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-200 cursor-pointer hover:text-teal-300" onClick={() => onSelectRoom(room.id)}>
                          {room.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {room.area.toFixed(1)} m² • {progress.completedCount}/{progress.totalCount} etapów
                        </div>
                      </td>

                      {categoriesToCheck.map((cat, idx) => {
                        // Find matching stage by category or fallback to index
                        const stage = stages.find((s) => s.category === cat) || stages[idx];
                        if (!stage) {
                          return (
                            <td key={cat} className="py-2 px-1 text-center">
                              <span className="text-slate-600">-</span>
                            </td>
                          );
                        }

                        const isDone = stage.completed || stage.status === 'done';
                        const isInProgress = !isDone && stage.status === 'in_progress';

                        return (
                          <td key={cat} className="py-2 px-1 text-center">
                            <button
                              onClick={() => {
                                // Cycle status: planned -> in_progress -> done -> planned
                                const nextStatus: StageStatus = stage.status === 'planned' 
                                  ? 'in_progress' 
                                  : stage.status === 'in_progress' 
                                  ? 'done' 
                                  : 'planned';
                                handleChangeStageStatus(room.id, stage.id, nextStatus);
                              }}
                              title={`${stage.name} - Status: ${stage.status}. Kliknij, aby zmienić.`}
                              className={`h-8 w-8 mx-auto rounded-lg flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                  : isInProgress
                                  ? 'bg-teal-950/80 text-teal-300 border border-teal-500/40 animate-pulse'
                                  : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              {isDone ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isInProgress ? (
                                <Hammer className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-xs" style={{ color: progress.percent === 100 ? '#10b981' : progress.percent >= 50 ? '#14b8a6' : '#f59e0b' }}>
                          {progress.percent}%
                        </div>
                        <div className="h-1.5 w-16 ml-auto rounded-full bg-slate-950 overflow-hidden mt-1 border border-slate-800">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${progress.progressBarGradient}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Legenda symboli:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span>Ukończony (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center text-[10px]">🔨</span>
              <span>W toku (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded bg-slate-950 text-slate-500 border border-slate-800 flex items-center justify-center text-[10px]">⏱</span>
              <span>Zaplanowany (0%)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BOTTOM NAVIGATION & SHORTCUTS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Building className="w-4 h-4 text-teal-400" />
          <span>Wszystkie postępy są automatycznie zapisywane lokalnie (Offline-first & E2EE).</span>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToStep && (
            <>
              <button
                onClick={() => onNavigateToStep('plan')}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-300 hover:text-white transition"
              >
                Harmonogram (PLAN) →
              </button>
              <button
                onClick={() => onNavigateToStep('qa')}
                className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-500 transition"
              >
                Protokoły Odbioru (QA) →
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
