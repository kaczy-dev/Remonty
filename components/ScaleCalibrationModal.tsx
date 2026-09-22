'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  FileText,
  Grid,
  DoorClosed,
  Ruler,
  Check,
  RotateCcw,
  Sliders,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  CALIBRATION_PRESETS,
  CalibrationPresetId,
  Point2D,
  calculateCalibratedScale,
  CalibrationResult,
} from '@/lib/scale-calibration';

export interface AppliedCalibration {
  visibleFrameWidthMeters: number;
  estimatedDistanceMeters: number;
  presetId: CalibrationPresetId;
  presetLabel: string;
  referenceDimensionMeters: number;
}

interface ScaleCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCalibration: (calib: AppliedCalibration) => void;
  currentEstimatedDistance: number;
  currentFovAngle?: number;
}

export const ScaleCalibrationModal: React.FC<ScaleCalibrationModalProps> = ({
  isOpen,
  onClose,
  onApplyCalibration,
  currentEstimatedDistance,
  currentFovAngle = 68,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<CalibrationPresetId>('card_iso_width');
  const [customDimensionCm, setCustomDimensionCm] = useState<number>(100);

  // Calibration points on interactive preview canvas (percentages 0..100)
  const [pointC1, setPointC1] = useState<Point2D>({ x: 35, y: 50 });
  const [pointC2, setPointC2] = useState<Point2D>({ x: 65, y: 50 });
  const [activePoint, setActivePoint] = useState<'C1' | 'C2'>('C1');

  // Selected preset object
  const selectedPreset = useMemo(
    () => CALIBRATION_PRESETS.find((p) => p.id === selectedPresetId) || CALIBRATION_PRESETS[0],
    [selectedPresetId]
  );

  const activeReferenceMeters = useMemo(() => {
    if (selectedPresetId === 'custom') {
      return Math.max(0.01, customDimensionCm / 100);
    }
    return selectedPreset.sizeMeters;
  }, [selectedPresetId, customDimensionCm, selectedPreset]);

  // Live scale calculation
  const calibrationResult: CalibrationResult = useMemo(() => {
    return calculateCalibratedScale(pointC1, pointC2, activeReferenceMeters, 16 / 9, currentFovAngle);
  }, [pointC1, pointC2, activeReferenceMeters, currentFovAngle]);

  if (!isOpen) return null;

  // Nudge adjustment (+/- 0.2%)
  const handleNudge = (dx: number, dy: number) => {
    if (activePoint === 'C1') {
      setPointC1((prev) => ({
        x: Math.max(1, Math.min(99, Math.round((prev.x + dx) * 10) / 10)),
        y: Math.max(1, Math.min(99, Math.round((prev.y + dy) * 10) / 10)),
      }));
    } else {
      setPointC2((prev) => ({
        x: Math.max(1, Math.min(99, Math.round((prev.x + dx) * 10) / 10)),
        y: Math.max(1, Math.min(99, Math.round((prev.y + dy) * 10) / 10)),
      }));
    }
  };

  const handleResetToDefault = () => {
    onApplyCalibration({
      visibleFrameWidthMeters: 2 * 2.6 * Math.tan((currentFovAngle * Math.PI) / 360),
      estimatedDistanceMeters: 2.6,
      presetId: 'custom',
      presetLabel: 'Domyślna optyczna (2.6 m)',
      referenceDimensionMeters: 1.0,
    });
    onClose();
  };

  const handleConfirm = () => {
    if (!calibrationResult.isValid) return;

    onApplyCalibration({
      visibleFrameWidthMeters: calibrationResult.visibleFrameWidthMeters,
      estimatedDistanceMeters: calibrationResult.estimatedDistanceMeters,
      presetId: selectedPresetId,
      presetLabel: selectedPresetId === 'custom' ? `Własny (${customDimensionCm} cm)` : selectedPreset.label,
      referenceDimensionMeters: activeReferenceMeters,
    });
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scale-calib-modal-title"
        className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 id="scale-calib-modal-title" className="text-base font-bold text-slate-100">Kalibracja Optyczna Skali Pomiaru</h3>
              <p className="text-xs text-slate-400">
                Dopasuj rozstaw wskaźników do znanego obiektu, by uzyskać milimetrową dokładność bez zgadywania dystansu.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
            title="Zamknij"
            aria-label="Zamknij okno kalibracji skali"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Step 1: Preset Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>1. Wybierz obiekt referencyjny w kadrze</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId('card_iso_width');
                  setPointC1({ x: 40, y: 50 });
                  setPointC2({ x: 60, y: 50 });
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'card_iso_width'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                  <span>Karta Płatnicza</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Szer. 85.6 mm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId('a4_length');
                  setPointC1({ x: 30, y: 50 });
                  setPointC2({ x: 70, y: 50 });
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'a4_length'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Kartka A4</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Dług. 297 mm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId('tile_60');
                  setPointC1({ x: 25, y: 50 });
                  setPointC2({ x: 75, y: 50 });
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'tile_60'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Grid className="w-3.5 h-3.5 text-teal-400" />
                  <span>Płytka 60×60</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Bok 60.0 cm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId('door_width');
                  setPointC1({ x: 20, y: 50 });
                  setPointC2({ x: 80, y: 50 });
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'door_width'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <DoorClosed className="w-3.5 h-3.5 text-teal-400" />
                  <span>Drzwi Standard</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Szer. 80.0 cm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId('door_height');
                  setPointC1({ x: 50, y: 20 });
                  setPointC2({ x: 50, y: 80 });
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'door_height'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Ruler className="w-3.5 h-3.5 text-teal-400" />
                  <span>Wysokość Drzwi</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Wys. 205 cm</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPresetId('custom')}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedPresetId === 'custom'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  <span>Własny Wymiar</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">{customDimensionCm} cm</span>
              </button>
            </div>

            {/* Custom Dimension Input */}
            {selectedPresetId === 'custom' && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-300 font-medium shrink-0">Wpisz znany wymiar (cm):</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="0.5"
                  value={customDimensionCm}
                  onChange={(e) => setCustomDimensionCm(parseFloat(e.target.value) || 1)}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-teal-300 text-center focus:border-teal-500 outline-none"
                />
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomDimensionCm(50)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                  >
                    50cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDimensionCm(100)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                  >
                    100cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDimensionCm(200)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                  >
                    200cm
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Interactive Target Reticle Placement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Wyceluj wskaźniki C1 i C2 na krańce obiektu
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActivePoint('C1')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                    activePoint === 'C1'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Punkt C1
                </button>
                <button
                  type="button"
                  onClick={() => setActivePoint('C2')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                    activePoint === 'C2'
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Punkt C2
                </button>
              </div>
            </div>

            {/* Interactive Stage Box */}
            <div className="relative w-full aspect-video rounded-xl border-2 border-slate-700 bg-slate-950 overflow-hidden select-none">
              {/* Reference Grid */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #2dd4bf 1px, transparent 1px), linear-gradient(to bottom, #2dd4bf 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                }}
              />

              {/* Connecting line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                <line
                  x1={pointC1.x}
                  y1={pointC1.y}
                  x2={pointC2.x}
                  y2={pointC2.y}
                  stroke="#2dd4bf"
                  strokeWidth="0.75"
                  strokeDasharray="2 1"
                />
                {/* Midpoint measurement badge */}
                <g transform={`translate(${(pointC1.x + pointC2.x) / 2}, ${(pointC1.y + pointC2.y) / 2})`}>
                  <rect
                    x="-18"
                    y="-4"
                    width="36"
                    height="8"
                    rx="3"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="#2dd4bf"
                    strokeWidth="0.4"
                  />
                  <text
                    x="0"
                    y="1.5"
                    fill="#5eead4"
                    fontSize="3"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {activeReferenceMeters >= 1
                      ? `${activeReferenceMeters.toFixed(2)} m`
                      : `${(activeReferenceMeters * 100).toFixed(1)} cm`}
                  </text>
                </g>
              </svg>

              {/* Pin C1 */}
              <div
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform cursor-pointer ${
                  activePoint === 'C1' ? 'scale-125 z-20' : 'scale-100 z-10'
                }`}
                style={{ left: `${pointC1.x}%`, top: `${pointC1.y}%` }}
                onClick={() => setActivePoint('C1')}
              >
                <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center shadow-lg backdrop-blur-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
                  <span className="text-[10px] font-black text-amber-200">C1</span>
                </div>
              </div>

              {/* Pin C2 */}
              <div
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform cursor-pointer ${
                  activePoint === 'C2' ? 'scale-125 z-20' : 'scale-100 z-10'
                }`}
                style={{ left: `${pointC2.x}%`, top: `${pointC2.y}%` }}
                onClick={() => setActivePoint('C2')}
              >
                <div className="w-8 h-8 rounded-full border-2 border-sky-400 bg-sky-500/30 flex items-center justify-center shadow-lg backdrop-blur-xs">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping absolute" />
                  <span className="text-[10px] font-black text-sky-200">C2</span>
                </div>
              </div>

              {/* D-Pad Floating Controls in calibration stage */}
              <div className="absolute bottom-2.5 right-2.5 z-30 flex flex-col items-center bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700/80 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleNudge(0, -0.4)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Mikro-krok w górę"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleNudge(-0.4, 0)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Mikro-krok w lewo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1 text-teal-400">
                    {activePoint}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNudge(0.4, 0)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Mikro-krok w prawo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 0.4)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Mikro-krok w dół"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>Przeciągaj punkty lub użyj D-Pada do precyzyjnego celowania</span>
              </div>
            </div>
          </div>

          {/* Step 3: Real-Time Calibration Feedback */}
          {calibrationResult.isValid ? (
            <div className="rounded-xl bg-teal-950/30 border border-teal-500/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-teal-400" />
                  Obliczona skala optyczna kamery:
                </span>
                <span className="font-mono text-teal-200 font-bold">
                  Szerokość kadru: {calibrationResult.visibleFrameWidthMeters.toFixed(2)} m
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-teal-500/20">
                <div>
                  <span className="text-slate-500 block">Dystans kamery:</span>
                  <strong className="text-teal-300">{calibrationResult.estimatedDistanceMeters.toFixed(2)} m</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Współczynnik 1m:</span>
                  <strong className="text-teal-300">{calibrationResult.pixelRatioPercentagePerMeter.toFixed(1)}% kadru</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Baza wzorca:</span>
                  <strong className="text-teal-300">
                    {activeReferenceMeters >= 1
                      ? `${activeReferenceMeters.toFixed(2)} m`
                      : `${(activeReferenceMeters * 100).toFixed(1)} cm`}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{calibrationResult.errorMessage || 'Ustaw punkty w odległości większej niż zero.'}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3.5 bg-slate-900/90">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Przywróć domyślne ({currentEstimatedDistance.toFixed(1)} m)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              disabled={!calibrationResult.isValid}
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zastosuj Kalibrację</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
