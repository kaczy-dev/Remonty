'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  parseVoiceCommand,
  speakPolish,
  playVoiceSoundCue,
  type VoiceCommandResult,
} from '@/lib/voice/speech-parser';

export interface UseVoiceAssistantOptions {
  onCommand?: (command: VoiceCommandResult) => void;
  voiceFeedbackDefault?: boolean;
  continuousDefault?: boolean;
}

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  lastCommand: VoiceCommandResult | null;
  history: VoiceCommandResult[];
  voiceFeedbackEnabled: boolean;
  continuousMode: boolean;
  isSpeaking: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  setVoiceFeedbackEnabled: (enabled: boolean) => void;
  setContinuousMode: (continuous: boolean) => void;
  processTextInput: (text: string) => VoiceCommandResult;
  clearHistory: () => void;
}

// Typy Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export function useVoiceAssistant({
  onCommand,
  voiceFeedbackDefault = true,
  continuousDefault = false,
}: UseVoiceAssistantOptions = {}): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [history, setHistory] = useState<VoiceCommandResult[]>([]);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(voiceFeedbackDefault);
  const [continuousMode, setContinuousMode] = useState(continuousDefault);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const voiceFeedbackRef = useRef(voiceFeedbackEnabled);
  const continuousRef = useRef(continuousMode);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    voiceFeedbackRef.current = voiceFeedbackEnabled;
  }, [voiceFeedbackEnabled]);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  const handleCommandExecution = useCallback((cmd: VoiceCommandResult) => {
    setLastCommand(cmd);
    setHistory((prev) => [cmd, ...prev.slice(0, 19)]); // Max 20 wpisów historii

    if (cmd.type !== 'UNKNOWN') {
      playVoiceSoundCue('success');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 30, 40]);
        } catch {
          // ignore
        }
      }
    } else {
      playVoiceSoundCue('error');
    }

    if (voiceFeedbackRef.current && cmd.spokenFeedback) {
      setIsSpeaking(true);
      speakPolish(cmd.spokenFeedback, () => {
        setIsSpeaking(false);
      });
    }

    if (onCommandRef.current) {
      onCommandRef.current(cmd);
    }
  }, []);

  const processTextInput = useCallback(
    (text: string): VoiceCommandResult => {
      const cmd = parseVoiceCommand(text);
      setTranscript(text);
      setInterimTranscript('');
      handleCommandExecution(cmd);
      return cmd;
    },
    [handleCommandExecution]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Przeglądarka nie obsługuje rozpoznawania mowy Web Speech API.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    shouldListenRef.current = true;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'pl-PL';
      recognition.continuous = continuousRef.current;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        playVoiceSoundCue('listening');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(30);
          } catch {
            // ignore
          }
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript;
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (interimStr) {
          setInterimTranscript(interimStr);
        }

        if (finalStr.trim()) {
          setTranscript(finalStr);
          setInterimTranscript('');
          const cmd = parseVoiceCommand(finalStr);
          handleCommandExecution(cmd);

          if (!continuousRef.current) {
            stopListening();
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          // Normal timeout on construction site when user didn't speak
          return;
        }
        if (event.error === 'not-allowed') {
          setError('Brak uprawnień do mikrofonu. Zezwól na dostęp do mikrofonu.');
        } else {
          setError(`Błąd rozpoznawania mowy: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (shouldListenRef.current && continuousRef.current) {
          // Auto-restart in continuous hands-free mode
          try {
            recognition.start();
            return;
          } catch {
            // fallback below
          }
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError(`Nie udało się uruchomić mikrofonu: ${err?.message || err}`);
      setIsListening(false);
    }
  }, [handleCommandExecution, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastCommand(null);
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
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
  };
}
