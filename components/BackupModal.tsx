'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Check,
  AlertCircle,
  X,
  FileArchive,
  FileJson,
  Loader2,
  Image as ImageIcon,
  FolderArchive,
  Sparkles,
} from 'lucide-react';
import { exportProjectJson } from '@/lib/storage';
import { RenovationProject } from '@/types/renovation';
import { getAllPhotoIds } from '@/lib/db/photos';
import { exportProjectArchiveZip, importProjectArchive, triggerBlobDownload } from '@/lib/archive-backup';

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
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storedPhotosCount, setStoredPhotosCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAllPhotoIds()
        .then((ids) => setStoredPhotosCount(ids.length))
        .catch(() => setStoredPhotosCount(0));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportZip = async () => {
    setIsExportingZip(true);
    setStatusMessage(null);
    try {
      const { blob, filename, photoCount } = await exportProjectArchiveZip(project);
      triggerBlobDownload(blob, filename);
      setStatusMessage(`Pobrano kompletne archiwum ZIP ze wszystkimi danymi i ${photoCount} zdjęciami.`);
      setIsError(false);
    } catch (err) {
      console.error('Failed to export ZIP archive', err);
      setStatusMessage('Wystąpił błąd podczas generowania archiwum ZIP.');
      setIsError(true);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportJson = () => {
    exportProjectJson(project);
    setStatusMessage('Kopia zapasowa konfiguracji projektu została pobrana jako plik JSON.');
    setIsError(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const result = await importProjectArchive(file);
      onRestoreProject(result.project);
      if (result.restoredPhotosCount > 0) {
        setStatusMessage(
          `Projekt pomyślnie przywrócony! Przywrócono ${result.restoredPhotosCount} zdjęć do bazy.`
        );
      } else {
        setStatusMessage('Projekt został pomyślnie przywrócony z pliku!');
      }
      setIsError(false);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      console.error('Import failed', err);
      setStatusMessage(
        err instanceof Error
          ? err.message
          : 'Nie udało się wczytać pliku — uszkodzony lub nieprawidłowy format.'
      );
      setIsError(true);
    } finally {
      setIsImporting(false);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Archiwum & Kopia Zapasowa</h3>
              <p className="text-xs text-slate-400">Eksport i przywracanie bazy remontu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Wszystkie dane projektu oraz zdjęcia (paragony, wpisy w dzienniku, pinezki usterek) są bezpiecznie przechowywane lokalnie w Twojej przeglądarce (IndexedDB). Możesz pobrać kompletne archiwum budowy lub przywrócić je na innym urządzeniu.
        </p>

        {storedPhotosCount !== null && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              <span>Zdjęcia i skany w pamięci podręcznej:</span>
            </div>
            <span className="font-mono font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
              {storedPhotosCount} {storedPhotosCount === 1 ? 'plik' : 'plików'}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                isError
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Backup Options Cards */}
          <div className="space-y-2.5">
            {/* Full ZIP Archive Button */}
            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-linear-to-r from-teal-950/50 to-slate-900 p-3.5 text-left hover:border-teal-400/70 hover:from-teal-950/70 transition group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 group-hover:scale-105 transition">
                  {isExportingZip ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileArchive className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-teal-200">
                      Pełne Archiwum Budowy (ZIP)
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      Zalecane
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    Dane JSON + wszystkie zdjęcia paragonów, dziennika i usterek + czytelny raport TXT
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-teal-400 shrink-0 group-hover:translate-y-0.5 transition" />
            </button>

            {/* Simple JSON Export Button */}
            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-slate-700 hover:bg-slate-800/50 transition group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                    Szybka Kopia Konfiguracji (JSON)
                  </span>
                  <p className="text-[11px] text-slate-400">Lekki plik bez załączników graficznych</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-white transition" />
            </button>
          </div>

          {/* Restore from File */}
          <div className="pt-2 border-t border-slate-800/80">
            <label
              className={`flex items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/50 bg-teal-950/20 p-3 text-xs font-semibold text-teal-300 hover:bg-teal-950/40 hover:border-teal-400 transition cursor-pointer text-center ${
                isImporting ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-teal-400" />
              )}
              <span>{isImporting ? 'Przywracanie danych i zdjęć...' : 'Przywróć z pliku (ZIP lub JSON)'}</span>
              <input
                type="file"
                accept=".zip,.json,application/zip,application/json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
