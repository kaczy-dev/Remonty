'use client';

import React from 'react';
import {
  Ruler,
  Palette,
  Wallet,
  CalendarDays,
  TrendingUp,
  CheckSquare,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { RenovationPipelineStep } from '@/types/renovation';

interface MobileBottomNavProps {
  activeStep: RenovationPipelineStep;
  onSelectStep: (step: RenovationPipelineStep) => void;
  onOpenQuickExpense: () => void;
  onOpenReportModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeStep,
  onSelectStep,
  onOpenQuickExpense,
  onOpenReportModal,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
      {/* 1. Skanowanie / Pomiary */}
      <button
        onClick={() => onSelectStep('measure')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeStep === 'measure'
            ? 'text-teal-400 font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Ruler className="w-4 h-4" />
        <span className="text-[10px]">Pomiary</span>
      </button>

      {/* 2. Kosztorys / Wydatki */}
      <button
        onClick={() => onSelectStep('cost')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeStep === 'cost'
            ? 'text-teal-400 font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-[10px]">Koszty</span>
      </button>

      {/* 3. Central Quick Add Action (Prominent Button) */}
      <button
        onClick={onOpenQuickExpense}
        className="flex flex-col items-center justify-center -mt-4 h-12 w-12 rounded-full bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition"
        title="Szybkie dodanie paragonu lub wydatku"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {/* 4. Harmonogram Gantta */}
      <button
        onClick={() => onSelectStep('plan')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeStep === 'plan'
            ? 'text-teal-400 font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        <span className="text-[10px]">Gantt</span>
      </button>

      {/* 5. Raport PDF / Druk */}
      <button
        onClick={onOpenReportModal}
        className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-slate-400 hover:text-teal-300 transition"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span className="text-[10px]">Raport</span>
      </button>
    </nav>
  );
};
