'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useMounted } from '@/hooks/useMounted';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const mounted = useMounted();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!mounted || isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Zainstaluj RenovAI (PWA)</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-guide-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-400" />
          <span>Zainstaluj na iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  Instalacja na iPhone / iPad
                </h3>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>Kliknij ikonę <strong>Udostępnij</strong> (Share) na dolnym pasku Safari.</li>
                <li>Przewiń w dół i wybierz <strong>Do ekranu początkowego</strong>.</li>
                <li>Potwierdź dodanie, aby korzystać z RenovAI w trybie pełnoekranowym offline!</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition"
              >
                Rozumiem
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ isOnline?: boolean }> = ({ isOnline }) => {
  const mounted = useMounted();
  const hookOnline = useOnlineStatus();
  const online = isOnline !== undefined ? isOnline : hookOnline;

  if (!mounted || online) return null;

  return (
    <div 
      id="offline-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-amber-200 shadow-2xl animate-fade-in"
    >
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <span>Tryb Offline: Wszystkie rzuty, kosztorysy i checklisty działają lokalnie bez sieci.</span>
    </div>
  );
};
