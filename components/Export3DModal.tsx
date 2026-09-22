'use client';

import React, { useState } from 'react';
import * as THREE from 'three';
import { Room } from '@/types/renovation';
import {
  X,
  Download,
  Smartphone,
  Eye,
  Box,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
} from 'lucide-react';
import {
  exportToGLB,
  exportToUSDZ,
  triggerFileDownload,
  launchAppleARQuickLook,
  detectDevicePlatform,
  ExportResult,
} from '@/lib/exporters/model-3d-exporter';

interface Export3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  sceneObject: THREE.Object3D | null;
}

export const Export3DModal: React.FC<Export3DModalProps> = ({
  isOpen,
  onClose,
  room,
  sceneObject,
}) => {
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingUsdz, setIsExportingUsdz] = useState(false);
  const [isLaunchingAR, setIsLaunchingAR] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const { isIOS, isAndroid, isMobile } = detectDevicePlatform();

  const handleExportGLB = async () => {
    if (!sceneObject) {
      setErrorMessage('Scena 3D nie jest jeszcze gotowa do eksportu.');
      return;
    }
    setErrorMessage(null);
    setIsExportingGlb(true);

    try {
      const result = await exportToGLB(sceneObject, `pokoj_${room.name}`);
      triggerFileDownload(result.blob, result.filename);
      setLastExport(result);
    } catch (err) {
      console.error('Błąd eksportu GLB:', err);
      setErrorMessage('Nie udało się wyeksportować modelu do formatu GLB.');
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleExportUSDZ = async () => {
    if (!sceneObject) {
      setErrorMessage('Scena 3D nie jest jeszcze gotowa do eksportu.');
      return;
    }
    setErrorMessage(null);
    setIsExportingUsdz(true);

    try {
      const result = await exportToUSDZ(sceneObject, `pokoj_ar_${room.name}`);
      triggerFileDownload(result.blob, result.filename);
      setLastExport(result);
    } catch (err) {
      console.error('Błąd eksportu USDZ:', err);
      setErrorMessage('Nie udało się wyeksportować modelu do formatu USDZ.');
    } finally {
      setIsExportingUsdz(false);
    }
  };

  const handleLaunchAR = async () => {
    if (!sceneObject) {
      setErrorMessage('Scena 3D nie jest jeszcze gotowa do podglądu AR.');
      return;
    }
    setErrorMessage(null);
    setIsLaunchingAR(true);

    try {
      if (isIOS) {
        // Natywne Apple AR Quick Look
        const result = await exportToUSDZ(sceneObject, `ar_${room.name}`);
        launchAppleARQuickLook(result.blob, result.filename);
      } else {
        // Na Android lub Desktopie - wygeneruj i pobierz model GLB
        const result = await exportToGLB(sceneObject, `pokoj_${room.name}`);
        triggerFileDownload(result.blob, result.filename);
        setLastExport(result);
      }
    } catch (err) {
      console.error('Błąd uruchamiania AR:', err);
      setErrorMessage('Wystąpił problem podczas inicjalizacji widoku AR.');
    } finally {
      setIsLaunchingAR(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="export-3d-modal"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Eksport Modelu 3D & Wirtualny Spacer AR
              </h3>
              <p className="text-xs text-slate-400">
                Pobierz wygenerowany model geometryczny lub zobacz go w rzeczywistej skali 1:1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Info Tag Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
          <div className="px-2.5 py-1 rounded-lg bg-teal-950/40 border border-teal-500/30 text-teal-300 font-medium">
            Pokój: <strong>{room.name}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono text-[11px]">
            {room.width.toFixed(2)} × {room.length.toFixed(2)} m (wys. {room.height.toFixed(2)} m)
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px]">
            Meble: <strong>{room.furniture?.length || 0} szt.</strong>
          </div>
          {room.atticRoof?.isAttic && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
              Poddasze: kąt {room.atticRoof.roofPitchDeg}° • kolankowa {room.atticRoof.kneeWallHeightM} m
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: GLB Export */}
          <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  Format GLB (glTF 2.0)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950/60 border border-teal-500/30 text-teal-300 font-mono">
                  Standard 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pobierz binarny model 3D ze zintegrowanymi teksturami, oświetleniem i meblami.
                Idealny do Blendera, 3ds Max, CAD, SketchUp, Unity i silników gier.
              </p>
            </div>

            <button
              onClick={handleExportGLB}
              disabled={isExportingGlb || isExportingUsdz || isLaunchingAR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:brightness-110 active:scale-98 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              data-testid="export-glb-btn"
            >
              {isExportingGlb ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pakowanie pliku GLB...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pobierz model .GLB</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: USDZ Export (Apple AR) */}
          <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Format USDZ (Apple)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-500/30 text-sky-300 font-mono">
                  Apple ARKit
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Natywny format AR dla urządzeń iPhone, iPad i Mac.
                Działa w Apple AR Quick Look, Keynote, iMessage i aplikacji Pliki.
              </p>
            </div>

            <button
              onClick={handleExportUSDZ}
              disabled={isExportingGlb || isExportingUsdz || isLaunchingAR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 active:scale-98 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              data-testid="export-usdz-btn"
            >
              {isExportingUsdz ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generowanie USDZ...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pobierz model .USDZ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Highlight Section: Live Augmented Reality (AR) Preview */}
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Zobacz w Rzeczywistości Rozszerzonej (Skala 1:1)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {isIOS ? 'Wykryto Apple iOS' : isAndroid ? 'Wykryto Android' : 'Komputer PC / Mac'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isIOS
              ? 'Kliknij poniższy przycisk, aby natychmiast otworzyć aparat iPhone’a w trybie Apple AR Quick Look i postawić wyremontowany pokój na posadzce w skali 1:1.'
              : isAndroid
              ? 'Pobierz plik GLB i otwórz go za pomocą Google ARCore / Scene Viewer, aby obejrzeć aranżację w swoim pokoju.'
              : 'Aby obejrzeć model w AR na telefonie, otwórz tę aplikację na smartfonie z systemem iOS lub Android, albo prześlij wyeksportowany plik USDZ/GLB na telefon.'}
          </p>

          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleLaunchAR}
              disabled={isExportingGlb || isExportingUsdz || isLaunchingAR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-98 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              data-testid="launch-ar-btn"
            >
              {isLaunchingAR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inicjalizacja widoku AR...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isIOS ? 'Uruchom Apple AR Quick Look' : 'Uruchom Podgląd AR'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Feedback Footer */}
        {lastExport && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Pomyślnie wygenerowano: <strong>{lastExport.filename}</strong> ({formatBytes(lastExport.sizeBytes)})
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">Pobieranie rozpoczęte</span>
          </div>
        )}
      </div>
    </div>
  );
};
