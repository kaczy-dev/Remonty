'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RenovationProject } from '@/types/renovation';
import { calculateProjectProgress } from '@/lib/progress-helper';
import { createProjectFromTemplate, ProjectTemplateType } from '@/lib/project-templates';
import {
  FolderKanban,
  Building2,
  Plus,
  CheckCircle2,
  Copy,
  Trash2,
  X,
  ExternalLink,
  Wallet,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ProjectSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: RenovationProject;
  projects: RenovationProject[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (project: RenovationProject) => void;
  onDuplicateProject: (source: RenovationProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectSwitcherModal: React.FC<ProjectSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  projects,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState<number | ''>(85000);
  const [contingency, setContingency] = useState<number>(15);
  const [templateType, setTemplateType] = useState<ProjectTemplateType>('two_room');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !budget || Number(budget) <= 0) return;

    const newProject = createProjectFromTemplate({
      title: title.trim(),
      address: address.trim() || 'Polska',
      budget: Number(budget),
      contingencyPercent: Number(contingency),
      templateType,
    });

    onCreateProject(newProject);
    setTitle('');
    setAddress('');
    setShowCreateForm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Twoje Projekty & Lokale Remontowe
                    <span className="text-[10px] uppercase font-semibold bg-teal-950 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-full">
                      Aktywne: {projects.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Prowadź równolegle wiele remontów, twórz nowe mieszkania i przełączaj się jednym kliknięciem
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-header & Action Bar */}
            <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-3 shrink-0 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Aktualnie pracujesz nad: <strong className="text-white">{currentProject.title}</strong>
              </span>

              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{showCreateForm ? 'Zamknij formularz' : 'Nowy Remont'}</span>
              </button>
            </div>

            {/* Creation Form (Collapsible) */}
            {showCreateForm && (
              <form onSubmit={handleCreateSubmit} className="border-b border-teal-500/30 bg-slate-950/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Utwórz Nowy Projekt Remontu</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Wszystkie dane zapisywane lokalnie w IndexedDB</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nazwa lokalu / inwestycji:</label>
                    <input
                      type="text"
                      required
                      placeholder="np. Apartament Powiśle 52m²"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Adres / Lokalizacja:</label>
                    <input
                      type="text"
                      placeholder="np. ul. Dobra 15, Warszawa"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Budżet całkowity (PLN):</label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      value={budget}
                      onChange={(e) => setBudget(parseFloat(e.target.value) || '')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Rezerwa bezpieczeństwa (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={contingency}
                      onChange={(e) => setContingency(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Szablon pomieszczeń:</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as ProjectTemplateType)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                    >
                      <option value="two_room">Mieszkanie 2-pokojowe (Salon, Sypialnia, Łazienka, Korytarz)</option>
                      <option value="studio">Kawalerka / Studio (Salon z aneksem + Łazienka)</option>
                      <option value="three_room">Mieszkanie 3-pokojowe (Salon, Kuchnia, 2 Sypialnie, Łazienka, Przedpokój)</option>
                      <option value="empty">Czysty projekt (1 pokój startowy)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm"
                  >
                    Utwórz i Otwórz Projekt
                  </button>
                </div>
              </form>
            )}

            {/* Projects List Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => {
                  const isCurrent = proj.id === currentProject.id;
                  const progress = calculateProjectProgress(proj.rooms);
                  const totalSpent = proj.expenses.reduce((sum, e) => sum + e.amount, 0);
                  const spentPercent = proj.totalPlannedBudget > 0
                    ? Math.round((totalSpent / proj.totalPlannedBudget) * 100)
                    : 0;

                  return (
                    <div
                      key={proj.id}
                      className={`rounded-2xl border p-5 transition flex flex-col justify-between relative overflow-hidden ${
                        isCurrent
                          ? 'border-teal-500 bg-slate-950/90 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/50'
                          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Current Active Badge */}
                      {isCurrent && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-teal-950 border border-teal-500/40 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                          <CheckCircle2 className="w-3 h-3 text-teal-400" />
                          <span>AKTYWNY</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                            <h4 className="text-sm font-bold text-white truncate pr-16">
                              {proj.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{proj.address || 'Brak adresu'}</span>
                          </div>
                        </div>

                        {/* Project Metrics Summary Chips */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Pokoje:</span>
                            <strong className="text-slate-200">
                              {proj.rooms.length} ({progress.totalArea} m²)
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Budżet:</span>
                            <strong className="text-slate-200 font-mono">
                              {(proj.totalPlannedBudget / 1000).toFixed(0)}k zł
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Postęp:</span>
                            <strong className="text-teal-300 font-bold font-mono">
                              {progress.percent}%
                            </strong>
                          </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Wydano z budżetu:</span>
                            <span className="font-mono text-slate-300">{totalSpent.toLocaleString('pl-PL')} zł ({spentPercent}%)</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, spentPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-800/80">
                        {isCurrent ? (
                          <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Otwarte w aplikacji
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectProject(proj.id);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition active:scale-95"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Otwórz ten projekt</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onDuplicateProject(proj)}
                            title="Duplikuj projekt jako nowy szablon"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {projects.length > 1 && (
                            <>
                              {confirmDeleteId === proj.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      onDeleteProject(proj.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-500 transition"
                                  >
                                    Potwierdź
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 transition"
                                  >
                                    Nie
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(proj.id)}
                                  title="Usuń ten projekt"
                                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
