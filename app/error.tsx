'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-slate-900 p-6 space-y-4 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Coś poszło nie tak</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Wystąpił nieoczekiwany błąd aplikacji. Twoje dane pozostają zapisane lokalnie — spróbuj odświeżyć widok.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Spróbuj ponownie</span>
        </button>
      </div>
    </div>
  );
}
