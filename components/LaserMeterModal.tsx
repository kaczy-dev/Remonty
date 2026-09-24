import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Radio,
  Wifi,
  WifiOff,
  Zap,
  Volume2,
  Vibrate,
  CheckCircle2,
  AlertTriangle,
  X,
  Target,
  HelpCircle,
} from 'lucide-react';
import { useLaserMeter, LaserMeterStatus } from '@/hooks/useLaserMeter';

interface LaserMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMeasurement?: (distanceMeters: number, field: string) => void;
  currentTargetField?: string | null;
  onSelectTargetField?: (field: string) => void;
}

export const LaserMeterModal: React.FC<LaserMeterModalProps> = ({
  isOpen,
  onClose,
  onApplyMeasurement,
  currentTargetField = 'length',
  onSelectTargetField,
}) => {
  const [selectedField, setSelectedField] = useState<string>(currentTargetField || 'length');
  const [enableSound, setEnableSound] = useState(true);
  const [enableHaptic, setEnableHaptic] = useState(true);

  const {
    status,
    deviceName,
    lastMeasurement,
    errorMessage,
    isSupported,
    setTargetField,
    connect,
    disconnect,
    startSimulation,
    simulateShot,
  } = useLaserMeter({
    defaultTargetField: selectedField,
    onMeasurementReceived: (dist, field) => {
      const target = field || selectedField;
      if (onApplyMeasurement) {
        onApplyMeasurement(dist, target);
      }
    },
  });

  useEffect(() => {
    if (currentTargetField && currentTargetField !== selectedField) {
      setSelectedField(currentTargetField);
      setTargetField(currentTargetField);
    }
  }, [currentTargetField, setTargetField]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    setTargetField(field);
    if (onSelectTargetField) {
      onSelectTargetField(field);
    }
  };

  const getStatusBadge = (s: LaserMeterStatus) => {
    switch (s) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <Radio className="w-3.5 h-3.5" /> Połączono ({deviceName})
          </span>
        );
      case 'simulated':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Zap className="w-3.5 h-3.5" /> Tryb Symulatora
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            <Bluetooth className="w-3.5 h-3.5 animate-spin" /> Wyszukiwanie BLE...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Błąd połączenia
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <WifiOff className="w-3.5 h-3.5" /> Rozłączony
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Dalmierz Laserowy Bluetooth
              </h2>
              <p className="text-xs text-slate-400">Bezprzewodowy transfer pomiarów na żywo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Status & Live Measurement Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status Dalmierza</span>
              {getStatusBadge(status)}
            </div>

            {/* Cyfrowy wyświetlacz pomiaru */}
            <div className="py-3 px-4 bg-slate-900/80 rounded-xl border border-teal-500/30 my-2">
              <div className="text-4xl font-mono font-extrabold text-teal-400 tracking-tight flex items-baseline justify-center gap-2">
                {lastMeasurement !== null ? lastMeasurement.toFixed(3) : '---'}
                <span className="text-lg font-normal text-slate-400">m</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {lastMeasurement !== null
                  ? `Zarejestrowano pomiar z urządzenia`
                  : 'Naciśnij przycisk pomiaru na dalmierzu'}
              </p>
            </div>

            {/* Informacja o błędzie */}
            {errorMessage && (
              <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Cel pomiarowy - gdzie ma trafiać wartość */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-teal-400" />
              Wprowadź pomiar do pola:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'length', label: 'Długość ściany' },
                { id: 'width', label: 'Szerokość ściany' },
                { id: 'height', label: 'Wysokość ściany' },
                { id: 'd1', label: 'Przekątna D1' },
                { id: 'd2', label: 'Przekątna D2' },
                { id: 'custom', label: 'Własny wymiar' },
              ].map((f) => {
                const isActive = selectedField === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFieldChange(f.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition border text-left flex items-center justify-between ${
                      isActive
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm shadow-teal-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{f.label}</span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Akcje połączenia */}
          <div className="space-y-2.5 pt-1">
            {status !== 'connected' && status !== 'simulated' ? (
              <div className="space-y-2">
                <button
                  onClick={connect}
                  disabled={status === 'connecting'}
                  className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-400 active:scale-[0.99] text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  <Bluetooth className="w-5 h-5" />
                  Połącz z Dalmierzem (BLE)
                </button>
                <button
                  onClick={startSimulation}
                  className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Włącz tryb symulatora (test bez dalmierza)
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {status === 'simulated' && (
                  <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-2xl space-y-2">
                    <p className="text-xs text-amber-300 font-medium">
                      Symuluj strzał laserem (kliknij przycisk, aby wysłać pomiar):
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[2.65, 3.45, 4.2, 5.15].map((val) => (
                        <button
                          key={val}
                          onClick={() => simulateShot(val)}
                          className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-mono font-semibold border border-amber-500/40 transition active:scale-95"
                        >
                          {val.toFixed(2)} m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={disconnect}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <WifiOff className="w-4 h-4" />
                  Rozłącz urządzenie
                </button>
              </div>
            )}
          </div>

          {/* Obsługiwane modele i wskazówki */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              Obsługiwane dalmierze na budowie:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-300">Bosch Professional</strong>: GLM 50 C, GLM 100 C, GLM 120 C, PLR 30/50 C</li>
              <li><strong className="text-slate-300">Leica DISTO</strong>: D1, D2, D110, X3, X4 (z protokołem Bluetooth Smart)</li>
              <li><strong className="text-slate-300">Uniwersalne BLE</strong>: MiLESEEY, SNDWAY, Parkside (Nordic UART)</li>
            </ul>
            <p className="text-[10px] text-slate-500">
              Wskazówka: Upewnij się, że w telefonie włączony jest moduł Bluetooth oraz GPS/Lokalizacja (wymóg systemowy Android do skanowania BLE).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
