'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Room, RenovationPipelineStep } from '@/types/renovation';

interface FloatingAIAssistantProps {
  currentRoom: Room;
  currentStep: RenovationPipelineStep;
  onOpenFullModal: (prefilledPrompt?: string) => void;
}

// Compute a context-aware opening prompt for the current workflow step
const getContextPrompt = (currentRoom: Room, step: RenovationPipelineStep): string => {
  switch (step) {
    case 'measure':
      return `Zweryfikuj wymiary pomieszczenia "${currentRoom.name}" (${currentRoom.width}m × ${currentRoom.length}m, wys. ${currentRoom.height}m, pow. ${currentRoom.area.toFixed(1)} m², obwód ${(currentRoom.perimeter || 0).toFixed(1)} m). Czy proporcje i kubatura są zgodne z normami budowlanymi i jak optymalnie rozmierzyć posadzkę?`;
    case 'design':
      return `Oceń projekt wykończenia dla "${currentRoom.name}": podłoga (${currentRoom.design.floorType}), ściany (${currentRoom.design.wallType}), barwa światła (${currentRoom.design.lightingTempK}K), naddatek materiałowy (${currentRoom.area.toFixed(1)} m² posadzki, ${currentRoom.wallArea.toFixed(1)} m² ścian). Jakie kolory akcentowe i rodzaj fugi (epoksydowa vs cementowa elastyczna) będą optymalne, i czy zużycie chemii montażowej jest dobrane prawidłowo?`;
    case 'plan':
    case 'progress':
      return `Przeanalizuj harmonogram i technologiczną kolejność prac dla "${currentRoom.name}". Ile czasu należy odczekać między gruntowaniem, hydroizolacją i układaniem posadzki, aby uniknąć błędów wykonawczych?`;
    case 'cost':
      return `Przeanalizuj szacunek kosztów i budżet dla "${currentRoom.name}". Na czym w tym pomieszczeniu można bezpiecznie zaoszczędzić, a w co bezwzględnie warto zainwestować lepsze materiały?`;
    case 'qa':
      return `Jakie normowe kryteria odbioru jakościowego (zgodnie z PN-B-10110 dla tynków i normami odchyłek posadzek) powinienem sprawdzić przy odbiorze prac w pomieszczeniu "${currentRoom.name}"?`;
    default:
      return `Pomóż mi w planowaniu prac i doborze materiałów dla pomieszczenia "${currentRoom.name}".`;
  }
};

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  currentRoom,
  currentStep,
  onOpenFullModal,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <button
        id="floating-ai-consult-btn"
        title="Zapytaj inżyniera AI o ten krok"
        onClick={() => onOpenFullModal(getContextPrompt(currentRoom, currentStep))}
        className="relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-3 text-xs font-bold text-slate-950 shadow-xl shadow-teal-500/25 animate-subtle-pulse hover:animate-none hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center pointer-events-none">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-slate-950"></span>
        </span>

        <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-xl border border-slate-700/80 transition-all duration-150 group-hover:block z-50">
          Zapytaj inżyniera AI o ten krok
        </span>

        <Sparkles className="w-4 h-4 text-slate-950" />
        <span className="inline">Doradca AI</span>
      </button>
    </div>
  );
};
