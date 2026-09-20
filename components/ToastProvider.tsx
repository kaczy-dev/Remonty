'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (title: string, options?: { description?: string; type?: ToastType; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, options?: { description?: string; type?: ToastType; duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newToast: ToastMessage = {
        id,
        title,
        description: options?.description,
        type: options?.type || 'success',
        duration: options?.duration || 3500,
      };

      // Construction site haptic feedback vibration
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        try {
          if (options?.type === 'error' || options?.type === 'warning') {
            navigator.vibrate([30, 50, 30]);
          } else {
            navigator.vibrate(18);
          }
        } catch {
          // ignore if vibration is not permitted by browser
        }
      }

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Portal Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl flex items-start justify-between gap-3 text-xs backdrop-blur-md ${
                toast.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/50 text-rose-100'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500/50 text-amber-100'
                  : toast.type === 'info'
                  ? 'bg-slate-900/95 border-teal-500/40 text-slate-100'
                  : 'bg-slate-900/95 border-teal-500/50 text-slate-100'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : toast.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : toast.type === 'info' ? (
                    <Info className="w-4 h-4 text-teal-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white leading-tight">{toast.title}</div>
                  {toast.description && (
                    <div className="text-slate-300 text-[11px] mt-0.5 leading-snug">
                      {toast.description}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 shrink-0 -mr-1 -mt-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
