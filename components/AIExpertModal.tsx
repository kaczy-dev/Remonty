'use client';

import React, { useState } from 'react';
import { Room } from '@/types/renovation';
import { Sparkles, X, Send, Bot, User, Check, Loader2, Lightbulb } from 'lucide-react';

interface AIExpertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: Room;
  currentStep: string;
}

const SAMPLE_PROMPTS = [
  'Jaki klej C2TE S1 i fugę epoksydową dobrać do gresu 120x60 na ogrzewanie podłogowe?',
  'Ile dokładnie schnie hydroizolacja 2-składnikowa przed klejeniem płytek w kabinie walk-in?',
  'Jakie są najczęstsze usterki wykonawcze przy odbiorze instalacji wodno-kanalizacyjnej?',
  'Na czym mogę bezpiecznie zaoszczędzić w trybie DIY bez ryzyka zalania mieszkania?',
];

export const AIExpertModal: React.FC<AIExpertModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  currentStep,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Dzień dobry! Jestem Twoim prywatnym doradcą budowlanym RenovAI. Analizuję aktualnie: **${currentRoom.name}** (${currentRoom.area.toFixed(1)} m²) na etapie **${currentStep.toUpperCase()}**.\n\nZapytaj mnie o normy techniczne, dobór chemii budowlanej, czasy schnięcia lub weryfikację poprawności prac wykonawcy.`,
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (questionToSend?: string) => {
    const textQuery = questionToSend || prompt;
    if (!textQuery.trim() || loading) return;

    const newMessages = [...messages, { role: 'user' as const, text: textQuery }];
    setMessages(newMessages);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textQuery,
          roomContext: {
            name: currentRoom.name,
            area: currentRoom.area,
            wallArea: currentRoom.wallArea,
            step: currentStep,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Błąd serwera: ${res.status}`);
      }

      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', text: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: 'Uwaga: Tryb offline lub brak klucza API. Pamiętaj o ogólnej zasadzie budowlanej: przed kafelkowaniem wilgotność podłoża nie może przekraczać 2% CM (jastrych cementowy) lub 0.5% CM (anhydryt). W narożach stref mokrych zawsze stosuj taśmę uszczelniającą wtapianą w dwie warstwy hydroizolacji.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col h-[650px] max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Inżynier Budowlany AI • RenovAI Expert
              </h3>
              <p className="text-[11px] text-slate-400">
                Lokalna wiedza inżynieryjna, normy PN-EN, dobór chemii i harmonogramu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'assistant' ? 'items-start' : 'items-start flex-row-reverse'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  m.role === 'assistant'
                    ? 'bg-teal-950 text-teal-400 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                  m.role === 'assistant'
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-teal-600 text-white font-medium shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-teal-400 p-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Inżynier analizuje normy i specyfikację materiałową...</span>
            </div>
          )}
        </div>

        {/* Sample Prompt Chips */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-5 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            <span>Szybkie pytania techniczne:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {SAMPLE_PROMPTS.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sp)}
                className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-teal-500 hover:text-white transition"
              >
                {sp}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Zapytaj o technologię prac, normy lub odbiór usterki..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition disabled:opacity-50 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zapytaj</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
