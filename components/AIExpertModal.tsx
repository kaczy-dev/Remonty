'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room } from '@/types/renovation';
import { getLocalExpertAdvice } from '@/lib/expert-advisor';
import { Sparkles, X, Send, Bot, User, Loader2, Layers, Ruler, ShieldCheck, Coins, Camera } from 'lucide-react';

interface AIExpertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: Room;
  currentStep: string;
  initialPrompt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
}

interface AttachedImage {
  data: string; // base64 without prefix
  mimeType: string;
  previewUrl: string;
  fileName?: string;
}

export const AIExpertModal: React.FC<AIExpertModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  currentStep,
  initialPrompt,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [prevInitialPrompt, setPrevInitialPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);

  // Sync initialPrompt without synchronous setState in effect
  if (initialPrompt !== prevInitialPrompt) {
    setPrevInitialPrompt(initialPrompt);
    setPrompt(initialPrompt || '');
  }
  const [messages, setMessages] = useState<Array<ChatMessage>>([
    {
      role: 'assistant',
      text: `Dzień dobry! Jestem Twoim prywatnym inżynierem budowlanym i architektem z Renowacje u Kaczaka. Analizuję aktualnie: **${currentRoom.name}** (${currentRoom.area.toFixed(1)} m²) na etapie **${currentStep.toUpperCase()}**.\n\nMożesz zadać mi pytanie tekstowe lub **załączyć zdjęcie ściany, instalacji lub usterki (ikona aparatu 📷)** do natychmiastowej diagnozy wizualnej AI.`,
    },
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64Data] = result.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      setAttachedImage({
        data: base64Data,
        mimeType,
        previewUrl: result,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async (questionToSend?: string) => {
    const textQuery = questionToSend || prompt || (attachedImage ? 'Dokonaj inżynierskiej analizy technicznej załączonego zdjęcia pod kątem jakości, ewentualnych usterek i norm wykonawczych.' : '');
    if ((!textQuery.trim() && !attachedImage) || loading) return;

    const imageToSend = attachedImage;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        text: textQuery,
        imageUrl: imageToSend?.previewUrl,
      },
    ];

    setMessages(newMessages);
    setPrompt('');
    setAttachedImage(null);
    setLoading(true);

    // 100% Local, Privacy-First Engineering Advice Engine (No paid APIs or external network calls)
    setTimeout(() => {
      const response = getLocalExpertAdvice({
        prompt: textQuery,
        currentRoom,
        currentStep,
        hasImage: Boolean(imageToSend),
      });

      setMessages([...newMessages, { role: 'assistant', text: response.advice }]);
      setLoading(false);
    }, 250);
  };

  const quickActions = [
    {
      key: 'materials',
      label: 'Materiały',
      icon: Layers,
      prompt: `Przedstaw zwięzłe, punktowe podsumowanie zapotrzebowania na materiały wykończeniowe dla pomieszczenia "${currentRoom.name}" (${currentRoom.area.toFixed(1)} m² posadzki, ${currentRoom.wallArea.toFixed(1)} m² ścian netto). Uwzględnij typowe zużycie kleju, gruntu, hydroizolacji oraz naddatek na docinki.`,
    },
    {
      key: 'dimensions',
      label: 'Wymiary',
      icon: Ruler,
      prompt: `Dokonaj szybkiej inżynierskiej analizy wymiarów "${currentRoom.name}": szerokość ${currentRoom.width} m, długość ${currentRoom.length} m, wysokość ${currentRoom.height} m (kubatura ${(currentRoom.area * currentRoom.height).toFixed(1)} m³). Wskaż wnioski dot. ergonomii, wentylacji i rozmieszczenia płytek.`,
    },
    {
      key: 'qa',
      label: 'Odbiór QA',
      icon: ShieldCheck,
      prompt: `Wskaż w 4 zwięzłych punktach kluczowe normy PN i parametry odbioru jakościowego dla etapu ${currentStep} w pomieszczeniu "${currentRoom.name}".`,
    },
    {
      key: 'budget',
      label: 'Budżet',
      icon: Coins,
      prompt: `Oceń koszty materiałowo-robociznowe dla pomieszczenia "${currentRoom.name}" (${currentRoom.area.toFixed(1)} m²). Jakie są główne czynniki ryzyka budżetowego i jak je zminimalizować?`,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col h-[650px] max-h-[90vh] overflow-hidden text-slate-100"
          >
            
            {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Inżynier Budowlany AI • Kaczaka Expert
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
                {m.imageUrl && (
                  <div className="mb-2 max-w-xs overflow-hidden rounded-xl border border-teal-400/40 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.imageUrl} alt="Załączone zdjęcie" className="max-h-48 w-full object-cover" />
                  </div>
                )}
                <div className="whitespace-pre-line">{m.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-teal-400 p-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Inżynier analizuje normy, geometrię i załączone materiały...</span>
            </div>
          )}
        </div>

        {/* Context-Aware Quick Action Chips */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-5 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Szybkie akcje dla tego pomieszczenia:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {quickActions.map((qa) => (
              <button
                key={qa.key}
                onClick={() => handleSend(qa.prompt)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-teal-500 hover:text-white transition disabled:opacity-50"
              >
                <qa.icon className="w-3.5 h-3.5 text-teal-400" />
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          {/* Attached Image Preview Strip */}
          {attachedImage && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-slate-900/90 px-3 py-2 mb-2.5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage.previewUrl} alt="Podgląd załącznika" className="h-10 w-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-teal-300 truncate">{attachedImage.fileName || 'Zdjęcie usterki / ściany'}</div>
                  <div className="text-[10px] text-slate-400">Gotowe do analizy wizualnej przez AI</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
                title="Usuń załączone zdjęcie"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <label
              title="Załącz zdjęcie usterki, ściany lub posadzki z aparatu/dysku"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border cursor-pointer transition ${
                attachedImage
                  ? 'border-teal-400 bg-teal-950/60 text-teal-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={loading}
              />
            </label>

            <input
              type="text"
              placeholder={attachedImage ? "Dodaj opcjonalne pytanie do zdjęcia lub kliknij 'Analizuj foto'..." : "Zapytaj o technologię prac, normy lub załącz zdjęcie (📷)..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || (!prompt.trim() && !attachedImage)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition disabled:opacity-50 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{attachedImage ? 'Analizuj foto' : 'Zapytaj'}</span>
            </button>
          </form>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
