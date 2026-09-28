'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Ruler,
  DollarSign,
  Square,
  FileText,
  Radio,
  Send,
  Zap,
} from 'lucide-react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import type { VoiceCommandResult } from '@/lib/voice/speech-parser';

export interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCommand?: (command: VoiceCommandResult) => void;
  currentRoomName?: string;
}

export function VoiceAssistantModal({
  isOpen,
  onClose,
  onApplyCommand,
  currentRoomName,
}: VoiceAssistantModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    lastCommand,
    history,
    voiceFeedbackEnabled,
    continuousMode,
    isSpeaking,
    error,
    startListening,
    stopListening,
    toggleListening,
    setVoiceFeedbackEnabled,
    setContinuousMode,
    processTextInput,
    clearHistory,
  } = useVoiceAssistant({
    onCommand: onApplyCommand,
    voiceFeedbackDefault: true,
    continuousDefault: false,
  });

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processTextInput(manualInput);
    setManualInput('');
  };

  const handlePresetClick = (phrase: string) => {
    processTextInput(phrase);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Asystent Głosowy „Wolne Ręce”
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  PL Voice AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentRoomName ? `Aktywne pomieszczenie: ${currentRoomName}` : 'Pomiary, wydatki i notatki bez dotykania telefonu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            aria-label="Zamknij asystenta głosowego"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Giant Microphone Action Button */}
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center bg-slate-950/60 rounded-3xl border border-slate-800/80 relative overflow-hidden">
            {/* Pulsing ripples animation when listening */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="absolute w-36 h-36 rounded-full bg-teal-500/10 animate-ping" />
                <span className="absolute w-48 h-48 rounded-full bg-teal-500/5 animate-pulse" />
              </div>
            )}

            <button
              onClick={toggleListening}
              className={`relative z-10 flex flex-col items-center justify-center h-28 w-28 rounded-full border-4 shadow-xl transition-all duration-300 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white scale-105 shadow-rose-900/50'
                  : 'bg-gradient-to-tr from-teal-600 to-emerald-500 border-teal-300/40 text-white hover:scale-105 shadow-teal-900/40'
              }`}
              aria-label={isListening ? 'Zatrzymaj nasłuchiwanie' : 'Rozpocznij nasłuchiwanie głosu'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-10 h-10 mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Mów</span>
                </>
              )}
            </button>

            {/* Status indicator */}
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-semibold text-slate-300">
                {isListening
                  ? 'Nasłuchuję... Mów wyraźnie po polsku'
                  : isSupported
                  ? 'Naciśnij i podyktuj wymiar lub wydatek'
                  : 'Web Speech API niedostępne (użyj wprowadzania poniżej)'}
              </span>
            </div>

            {/* Live interim / finalized transcript bubble */}
            {(transcript || interimTranscript) && (
              <div className="mt-3 w-full max-w-md px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-sm">
                <span className="text-slate-400 text-xs block mb-1 font-mono">Rozpoznano:</span>
                <p className="text-white font-medium">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-teal-400 italic"> {interimTranscript}...</span>
                  )}
                </p>
              </div>
            )}

            {/* Error badge */}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/60 border border-rose-800/60 px-3 py-1.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Last Recognized Command Result Card */}
          {lastCommand && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                lastCommand.type !== 'UNKNOWN'
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {lastCommand.type !== 'UNKNOWN' ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ostatnia komenda
                    </h4>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {lastCommand.feedbackText}
                    </p>
                  </div>
                </div>
                {isSpeaking && (
                  <span className="flex items-center gap-1 text-[10px] text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded-md border border-teal-500/30">
                    <Volume2 className="w-3 h-3 animate-bounce" />
                    Mówi...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Toggles: TTS & Continuous Listening */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                voiceFeedbackEnabled
                  ? 'bg-slate-800 border-teal-500/40 text-teal-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              {voiceFeedbackEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span>Potwierdzenia głosowe (Wł.)</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span>Potwierdzenia głosowe (Wył.)</span>
                </>
              )}
            </button>

            <button
              onClick={() => setContinuousMode(!continuousMode)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                continuousMode
                  ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <Radio className={`w-4 h-4 ${continuousMode ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Tryb ciągły: {continuousMode ? 'Włączony' : 'Wyłączony'}</span>
            </button>
          </div>

          {/* Quick Presets / Construction Fast-Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Szybkie komendy budowlane (1-kliknięcie)
              </span>
              <button
                onClick={() => setShowCheatSheet(!showCheatSheet)}
                className="text-xs text-teal-400 hover:text-teal-300 transition"
              >
                {showCheatSheet ? 'Ukryj podpowiedzi' : 'Wzorce mowy'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePresetClick('szerokość 3,45')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-teal-400" />
                „szerokość 3,45”
              </button>
              <button
                onClick={() => handlePresetClick('długość 4 i pół metra')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-teal-400" />
                „długość 4 i pół metra”
              </button>
              <button
                onClick={() => handlePresetClick('dodaj wydatek 120 zł klej do płytek')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                „wydatek 120 zł klej”
              </button>
              <button
                onClick={() => handlePresetClick('dodaj okno 120 na 140')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-sky-400" />
                „okno 120 na 140”
              </button>
              <button
                onClick={() => handlePresetClick('laser')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                „laser”
              </button>
            </div>

            {showCheatSheet && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2 text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-400" />
                  Przykładowe zwroty rozpoznawane przez asystenta:
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-400">
                  <li><strong className="text-slate-200">Wymiary:</strong> „szerokość 3 metry 40”, „długość 5,20”, „wysokość 2.65”, „przekątna 1: 5 metrów 18”</li>
                  <li><strong className="text-slate-200">Koszty i materiały:</strong> „dodaj wydatek 150 zł cement 10 worków”, „koszt 80 zł taśma”</li>
                  <li><strong className="text-slate-200">Otwory:</strong> „dodaj okno metr dwadzieścia na metr czterdzieści”, „dodaj drzwi 90 na 200”</li>
                  <li><strong className="text-slate-200">Notatki:</strong> „notatka brak pionu na ścianie”, „usterka pęknięty tynk”</li>
                  <li><strong className="text-slate-200">Akcje:</strong> „laser”, „zrób pomiar”, „następne pomieszczenie”, „zapisz projekt”</li>
                </ul>
              </div>
            )}
          </div>

          {/* Manual Simulator / Text Fallback Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Wpisz komendę (np. szerokość 3.40, wydatek 250 zł klej)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white font-semibold text-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Wyślij
            </button>
          </form>

          {/* History Feed */}
          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Historia poleceń ({history.length})
                </span>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Wyczyść historię
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-500 font-mono text-[10px]">#{history.length - idx}</span>
                      <span className="text-slate-300 truncate">{item.rawTranscript}</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        item.type !== 'UNKNOWN'
                          ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-teal-400" />
            Obsługa komend offline w przeglądarce
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
