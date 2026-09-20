'use client';

import React, { useState, useMemo } from 'react';
import { RenovationStage, RenovationProject } from '@/types/renovation';
import { calculateGanttTimeline } from '@/lib/gantt-helper';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Flame,
  Info,
} from 'lucide-react';

interface GanttChartProps {
  project: RenovationProject;
  selectedStageId?: string;
  onSelectStage?: (stageId: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; bar: string; text: string }> = {
  demolition: { bg: 'bg-rose-950/40', border: 'border-rose-500/30', bar: 'bg-rose-500', text: 'text-rose-300' },
  installation: { bg: 'bg-sky-950/40', border: 'border-sky-500/30', bar: 'bg-sky-500', text: 'text-sky-300' },
  masonry: { bg: 'bg-amber-950/40', border: 'border-amber-500/30', bar: 'bg-amber-500', text: 'text-amber-300' },
  insulation: { bg: 'bg-indigo-950/40', border: 'border-indigo-500/30', bar: 'bg-indigo-500', text: 'text-indigo-300' },
  finishing: { bg: 'bg-teal-950/40', border: 'border-teal-500/30', bar: 'bg-teal-500', text: 'text-teal-300' },
  flooring: { bg: 'bg-emerald-950/40', border: 'border-emerald-500/30', bar: 'bg-emerald-500', text: 'text-emerald-300' },
  carpentry: { bg: 'bg-amber-900/40', border: 'border-amber-600/30', bar: 'bg-amber-600', text: 'text-amber-200' },
  cleanup: { bg: 'bg-slate-800/40', border: 'border-slate-600/30', bar: 'bg-slate-500', text: 'text-slate-300' },
};

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  selectedStageId,
  onSelectStage,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(false);

  const timeline = useMemo(() => {
    return calculateGanttTimeline(
      project.stages,
      project.startDate,
      project.targetEndDate
    );
  }, [project.stages, project.startDate, project.targetEndDate]);

  const filteredBars = useMemo(() => {
    return timeline.bars.filter((bar) => {
      if (filterCategory !== 'all' && bar.category !== filterCategory) return false;
      if (showOnlyActive && bar.status === 'done') return false;
      return true;
    });
  }, [timeline.bars, filterCategory, showOnlyActive]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
      {/* Gantt Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            Wizualny Harmonogram Gantta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Oś czasu inwestycji ({timeline.projectStart} do {timeline.projectEnd}) • {timeline.totalDays} dni roboczych
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">Wszystkie branże</option>
            <option value="demolition">Demolka / Wyburzenia</option>
            <option value="installation">Instalacje wod-kan & elektr.</option>
            <option value="masonry">Wylewki & Murarka</option>
            <option value="insulation">Hydroizolacja</option>
            <option value="finishing">Gładzie & Glazura</option>
            <option value="flooring">Podłogi & Panele</option>
            <option value="carpentry">Stolarka</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
            />
            <span>Ukryj zakończone</span>
          </label>
        </div>
      </div>

      {/* Main Gantt Canvas with Horizontal Scroll for Small Screens */}
      <div className="overflow-x-auto p-4 sm:p-6 no-scrollbar">
        <div className="min-w-[700px] space-y-4">
          
          {/* Timeline Time Axis Scale */}
          <div className="relative border-b border-slate-800 pb-2 text-[11px] font-mono text-slate-400">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-4 text-xs font-semibold text-slate-300">
                Zadanie / Branża
              </div>
              <div className="col-span-8 relative h-6">
                {timeline.timeAxisMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="absolute -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${marker.offsetPercent}%` }}
                  >
                    <span>{marker.label}</span>
                    <div className="h-1.5 w-px bg-slate-700 mt-1" />
                  </div>
                ))}

                {/* Today Marker Line */}
                {timeline.todayOffsetPercent !== undefined && (
                  <div
                    className="absolute top-0 bottom-0 z-20 flex flex-col items-center pointer-events-none"
                    style={{ left: `${timeline.todayOffsetPercent}%` }}
                    title="Dzisiaj"
                  >
                    <span className="rounded-xs bg-rose-500 px-1 text-[9px] font-bold text-white uppercase -translate-y-2">
                      Dziś
                    </span>
                    <div className="h-8 w-0.5 bg-rose-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gantt Stage Rows */}
          <div className="space-y-2.5">
            {filteredBars.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                Brak etapów pasujących do wybranego filtra.
              </div>
            ) : (
              filteredBars.map((bar, idx) => {
                const isSelected = selectedStageId === bar.id;
                const colors = CATEGORY_COLORS[bar.category] || CATEGORY_COLORS.finishing;

                return (
                  <div
                    key={bar.id}
                    onClick={() => onSelectStage && onSelectStage(bar.id)}
                    className={`grid grid-cols-12 gap-1 items-center rounded-xl p-2.5 transition cursor-pointer border ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/20 shadow-md ring-1 ring-teal-500/40'
                        : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    {/* Left Column: Label, Dates & Status */}
                    <div className="col-span-4 pr-3 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-slate-800 text-[9px] font-mono text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-100 truncate" title={bar.name}>
                          {bar.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span>{bar.startDate.slice(5)} → {bar.endDate.slice(5)}</span>
                        <span>•</span>
                        <span>{bar.durationDays} dni</span>
                        {bar.isDelayed && (
                          <span className="text-rose-400 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Po terminie
                          </span>
                        )}
                        {bar.curingHoursRemaining && bar.curingHoursRemaining > 0 && (
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 animate-spin" /> {bar.curingHoursRemaining}h schnięcie
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Interactive Gantt Timeline Bar */}
                    <div className="col-span-8 relative h-7 bg-slate-900/60 rounded-lg p-0.5 flex items-center overflow-hidden">
                      {/* Grid background markers */}
                      <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-10">
                        <div className="w-px h-full bg-slate-500" />
                        <div className="w-px h-full bg-slate-500" />
                        <div className="w-px h-full bg-slate-500" />
                        <div className="w-px h-full bg-slate-500" />
                      </div>

                      {/* Today vertical line trace */}
                      {timeline.todayOffsetPercent !== undefined && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500/40 z-10 pointer-events-none"
                          style={{ left: `${timeline.todayOffsetPercent}%` }}
                        />
                      )}

                      {/* The Bar */}
                      <div
                        className={`absolute h-6 rounded-md shadow-xs border transition-all flex items-center justify-between px-2 text-[10px] font-bold text-white overflow-hidden ${
                          bar.status === 'done'
                            ? 'bg-emerald-600 border-emerald-400/50'
                            : bar.status === 'waiting_cure'
                            ? 'bg-amber-600 border-amber-400/50 animate-pulse'
                            : bar.isDelayed
                            ? 'bg-rose-700 border-rose-500/60'
                            : `${colors.bar} border-teal-400/40`
                        }`}
                        style={{
                          left: `${bar.leftPercent}%`,
                          width: `${bar.widthPercent}%`,
                          minWidth: '24px',
                        }}
                      >
                        {/* Progress Fill inside the bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-white/20"
                          style={{ width: `${bar.progressPercent}%` }}
                        />

                        <span className="relative z-10 truncate text-[10px] font-medium drop-shadow-xs">
                          {bar.progressPercent}%
                        </span>
                        {bar.status === 'done' && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-200 shrink-0 relative z-10" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legend and Info Note */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Ukończony (100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-teal-500" /> W toku
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 animate-pulse" /> Przerwa na schnięcie
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" /> Opóźniony
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Kliknij etap, aby edytować zadania i parametry
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
