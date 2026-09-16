'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Download, Upload, Key, Check, AlertCircle, X } from 'lucide-react';
import { exportEncryptedBackup, importEncryptedBackup } from '@/lib/crypto';
import { RenovationProject } from '@/types/renovation';

interface E2EEVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: RenovationProject;
  onRestoreProject: (project: RenovationProject) => void;
}

export const E2EEVaultModal: React.FC<E2EEVaultModalProps> = ({
  isOpen,
  onClose,
  project,
  onRestoreProject,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!passphrase.trim()) {
      setStatusMessage('Wprowadź hasło do zaszyfrowania kopii (AES-GCM-256).');
      setIsError(true);
      return;
    }

    try {
      const encryptedData = await exportEncryptedBackup(project, passphrase);
      const blob = new Blob([encryptedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `renovai-vault-backup-${new Date().toISOString().slice(0, 10)}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Zaszyfrowana kopia została pomyślnie wyeksportowana!');
      setIsError(false);
    } catch (err) {
      console.error(err);
      setStatusMessage('Błąd szyfrowania kopii zapasowej.');
      setIsError(true);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!passphrase.trim()) {
      setStatusMessage('Wprowadź hasło, którym zaszyfrowano ten plik.');
      setIsError(true);
      return;
    }

    try {
      const text = await file.text();
      const restored = await importEncryptedBackup(text, passphrase);
      onRestoreProject(restored);
      setStatusMessage('Projekt pomyślnie odszyfrowany i przywrócony!');
      setIsError(false);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatusMessage('Nieprawidłowe hasło lub uszkodzony plik kopii.');
      setIsError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sejf Prywatności E2EE</h3>
              <p className="text-[10px] text-slate-400 font-mono">Web Crypto API • AES-GCM 256-bit</p>
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
          Wszystkie Twoje zdjęcia, wymiary pomieszczeń i faktury są przechowywane w pamięci podręcznej Twojej przeglądarki. Możesz wyeksportować w pełni zaszyfrowaną kopię zapasową chronioną hasłem.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-medium">
              Hasło do sejfu (Master Key):
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="Wpisz silne hasło..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              isError ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300' : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
            }`}>
              {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Eksportuj Sejf</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/40 p-2.5 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition cursor-pointer text-center">
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Przywróć Sejf</span>
              <input
                type="file"
                accept=".enc,.json"
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
