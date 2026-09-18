'use client';

import React, { useState } from 'react';
import { Download, Upload, Check, AlertCircle, X, FileJson } from 'lucide-react';
import { exportProjectJson, isRenovationProjectShape } from '@/lib/storage';
import { RenovationProject } from '@/types/renovation';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: RenovationProject;
  onRestoreProject: (project: RenovationProject) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  project,
  onRestoreProject,
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    exportProjectJson(project);
    setStatusMessage('Kopia zapasowa projektu została pobrana jako plik JSON.');
    setIsError(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isRenovationProjectShape(parsed)) {
        throw new Error('Nieprawidłowa struktura pliku projektu.');
      }
      onRestoreProject(parsed);
      setStatusMessage('Projekt został pomyślnie przywrócony z pliku!');
      setIsError(false);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setStatusMessage('Nie udało się wczytać pliku — uszkodzony lub nieprawidłowy format.');
      setIsError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">

        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Kopia zapasowa projektu</h3>
              <p className="text-[10px] text-slate-400 font-mono">Eksport / import pliku JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Wszystkie dane projektu przechowywane są lokalnie w tej przeglądarce. Pobierz plik JSON jako kopię zapasową lub przywróć projekt z wcześniej pobranego pliku.
        </p>

        <div className="space-y-4">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              isError ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300' : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
            }`}>
              {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Pobierz kopię</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/40 p-2.5 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition cursor-pointer text-center">
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Przywróć z pliku</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};
