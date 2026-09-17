'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RenovationPipelineStep } from '@/types/renovation';
import { 
  Camera, 
  Ruler, 
  Sparkles, 
  Palette, 
  CalendarDays, 
  Boxes, 
  Wallet, 
  ShoppingCart, 
  Hammer, 
  TrendingUp, 
  CheckSquare, 
  SplitSquareVertical 
} from 'lucide-react';

interface StepMeta {
  id: RenovationPipelineStep;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PIPELINE_STEPS: StepMeta[] = [
  { id: 'photo_scan', label: 'PHOTO/SCAN', subLabel: 'Skanowanie', icon: Camera },
  { id: 'measure', label: 'MEASURE', subLabel: 'Pomiary i Rzut', icon: Ruler },
  { id: 'analyze', label: 'ANALYZE', subLabel: 'AI Rzeczoznawca', icon: Sparkles },
  { id: 'design', label: 'DESIGN', subLabel: 'Projekt i Kolory', icon: Palette },
  { id: 'plan', label: 'PLAN', subLabel: 'Harmonogram', icon: CalendarDays },
  { id: 'materials', label: 'MATERIALS', subLabel: 'Kalkulator ilości', icon: Boxes },
  { id: 'cost', label: 'COST', subLabel: 'Wydatki i Kosztorys', icon: Wallet },
  { id: 'shopping', label: 'SHOPPING', subLabel: 'Lista zakupów', icon: ShoppingCart },
  { id: 'execution', label: 'EXECUTION', subLabel: 'Tryb Wykonania', icon: Hammer },
  { id: 'progress', label: 'PROGRESS', subLabel: 'Dziennik budowy', icon: TrendingUp },
  { id: 'qa', label: 'QA CHECK', subLabel: 'Odbiory i Normy', icon: CheckSquare },
  { id: 'before_after', label: 'BEFORE/AFTER', subLabel: 'Porównanie', icon: SplitSquareVertical },
];

interface WorkflowPipelineProps {
  activeStep: RenovationPipelineStep;
  onSelectStep: (step: RenovationPipelineStep) => void;
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  activeStep,
  onSelectStep,
}) => {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === activeStep);
  const progressPercent = Math.round(((currentIndex + 1) / PIPELINE_STEPS.length) * 100);

  return (
    <div className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Cykl Życia Remontu (12 Etapów)
            </span>
            <span className="text-[11px] text-slate-400">
              Krok {currentIndex + 1} z {PIPELINE_STEPS.length}: <strong className="text-slate-200">{PIPELINE_STEPS[currentIndex]?.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-300">
              {progressPercent}% cyklu
            </span>
            <div className="w-24 sm:w-36 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Steps Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isCompleted = idx < currentIndex;

            return (
              <motion.button
                key={step.id}
                id={`pipeline-step-${step.id}`}
                onClick={() => onSelectStep(step.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors relative ${
                  isActive
                    ? 'text-white'
                    : isCompleted
                    ? 'bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-slate-900/40 border border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                {/* Active Step Sliding Highlight via Framer Motion layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="pipeline-active-indicator"
                    className="absolute inset-0 rounded-xl bg-teal-500/15 border border-teal-500/60 shadow-xs pointer-events-none"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <div 
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs relative z-10 transition ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : isCompleted
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col relative z-10">
                  <span className={`text-[11px] font-bold tracking-tight uppercase leading-none ${
                    isActive ? 'text-teal-300' : 'text-slate-300'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {step.subLabel}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
