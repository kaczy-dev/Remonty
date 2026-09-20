'use client';

import React, { useState, useRef, useEffect } from 'react';
import { WorkLogEntry, Room, StageCategory } from '@/types/renovation';
import { savePhotoBlob } from '@/lib/db/photos';
import { usePhotoSrc, LOCAL_PHOTO_PREFIX } from '@/lib/db/usePhotoSrc';
import {
  BookOpen,
  Plus,
  Calendar,
  Camera,
  User,
  Building,
  Layers,
  Trash2,
  X,
  Maximize2,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface WorkLogJournalProps {
  rooms: Room[];
  selectedRoomId: string;
  workLogs: WorkLogEntry[];
  onAddWorkLog: (entry: WorkLogEntry) => void;
  onDeleteWorkLog: (logId: string) => void;
}

const CATEGORIES: { key: StageCategory; label: string; color: string }[] = [
  { key: 'demolition', label: 'Wyburzenia & Demontaż', color: '#ef4444' },
  { key: 'installation', label: 'Instalacje (wod-kan, elektr.)', color: '#3b82f6' },
  { key: 'masonry', label: 'Tynki & Murarka', color: '#f59e0b' },
  { key: 'insulation', label: 'Hydroizolacja & Ocieplenie', color: '#06b6d4' },
  { key: 'finishing', label: 'Gładzie & Malowanie', color: '#8b5cf6' },
  { key: 'flooring', label: 'Posadzki & Płytki', color: '#10b981' },
  { key: 'carpentry', label: 'Stolarka & Montaż drzwi', color: '#ec4899' },
  { key: 'cleanup', label: 'Odbiory & Sprzątanie', color: '#14b8a6' },
];

const AUTHORS = [
  'Kierownik prac',
  'Inwestor',
  'Glazurnik',
  'Elektryk',
  'Hydraulik',
  'Malarz / Szpachlarz',
  'Montażysta mebli',
];

const LogPhotoThumbnail: React.FC<{ photoId: string; onZoom: (src: string) => void }> = ({ photoId, onZoom }) => {
  const src = usePhotoSrc(LOCAL_PHOTO_PREFIX + photoId);
  if (!src) return null;

  return (
    <div
      onClick={() => onZoom(src)}
      className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video max-w-xs mt-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Zdjęcie z dziennika" className="h-full w-full object-cover group-hover:scale-105 transition duration-200" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1">
        <Maximize2 className="w-4 h-4" />
        <span>Powiększ</span>
      </div>
    </div>
  );
};

export const WorkLogJournal: React.FC<WorkLogJournalProps> = ({
  rooms,
  selectedRoomId,
  workLogs,
  onAddWorkLog,
  onDeleteWorkLog,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

  // New entry form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState<string>(selectedRoomId || rooms[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageCategory, setStageCategory] = useState<StageCategory>('finishing');
  const [author, setAuthor] = useState('Kierownik prac');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  const handlePhotoSelect = (file: File | null) => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const photoPreviewRef = useRef<string | null>(null);
  photoPreviewRef.current = photoPreview;

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
    };
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const id = crypto.randomUUID();
      let photoId: string | undefined;

      if (photoFile) {
        photoId = `worklog-${id}`;
        await savePhotoBlob(photoId, photoFile);
      }

      const newEntry: WorkLogEntry = {
        id,
        date,
        roomId: roomId || undefined,
        stageCategory,
        author,
        title: title.trim(),
        description: description.trim(),
        photoId,
        createdAt: new Date().toISOString(),
      };

      onAddWorkLog(newEntry);

      // Reset form
      setTitle('');
      setDescription('');
      handlePhotoSelect(null);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = workLogs
    .filter((log) => {
      if (filterRoomId !== 'all' && log.roomId !== filterRoomId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-5">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dziennik Prac i Zdarzeń Remontowych
              <span className="text-[10px] uppercase font-semibold bg-teal-950 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-full">
                Wpisy: {workLogs.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Chronologiczny zapis postępów, prób szczelności, uwag technicznych i dokumentacja fotograficzna
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Room Filter */}
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">Wszystkie pomieszczenia</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Zamknij formularz' : 'Nowy Wpis'}</span>
          </button>
        </div>
      </div>

      {/* Add Entry Card (Collapsible) */}
      {showAddForm && (
        <form onSubmit={handleSaveEntry} className="rounded-2xl border border-teal-500/40 bg-slate-900 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Dodaj wpis do dziennika prac</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Data zdarzenia:</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Pomieszczenie:</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              >
                <option value="">Całe mieszkanie / Ogólne</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Autor / Branża:</label>
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              >
                {AUTHORS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tytuł wpisu:</label>
              <input
                type="text"
                required
                placeholder="np. Zakończenie prób ciśnieniowych hydrauliki"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Kategoria prac:</label>
              <select
                value={stageCategory}
                onChange={(e) => setStageCategory(e.target.value as StageCategory)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Opis wykonanych prac / uwagi technologiczne:</label>
            <textarea
              rows={2}
              placeholder="np. Próba ciśnieniowa trwała 120 minut przy 6 barach, wynik pozytywny. Zaaplikowano 1. warstwę gruntu pod hydroizolację."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Photo attachment with preview */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Zdjęcie postępu / protokołu (opcjonalnie):</label>
            {photoPreview ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-500/50 bg-slate-950 p-2.5">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Podgląd zdjęcia"
                    className="h-12 w-12 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-teal-300 truncate">
                      {photoFile?.name || 'Zdjęcie wpisu'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''} • Zapis w IndexedDB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePhotoSelect(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Usuń zdjęcie"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-xs text-slate-400 hover:border-teal-500 hover:text-teal-300 transition cursor-pointer">
                <Camera className="w-4 h-4 text-teal-400" />
                <span>Zrób zdjęcie postępu prac lub wybierz z galerii</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz Wpis w Dzienniku'}
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto stroke-1" />
            <div className="text-sm font-semibold text-slate-300">Dziennik prac jest pusty</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Dodawaj wpisy po zakończeniu kluczowych etapów, prób ciśnieniowych czy odbiorów częściowych. Możesz załączać zdjęcia z aparatu telefonu.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj pierwszy wpis</span>
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const cat = CATEGORIES.find((c) => c.key === log.stageCategory);
            const roomName = log.roomId ? (roomMap.get(log.roomId) || log.roomId) : 'Całe mieszkanie';

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      <Calendar className="w-3 h-3 text-teal-400" />
                      {log.date}
                    </span>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      <Building className="w-3 h-3 text-slate-500" />
                      {roomName}
                    </span>

                    {cat && (
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold border"
                        style={{
                          borderColor: `${cat.color}40`,
                          backgroundColor: `${cat.color}15`,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </span>
                    )}

                    {log.author && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/60">
                        <User className="w-3 h-3 text-slate-500" />
                        {log.author}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteWorkLog(log.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Usuń ten wpis"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{log.title}</h4>
                  {log.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                      {log.description}
                    </p>
                  )}
                </div>

                {log.photoId && (
                  <LogPhotoThumbnail photoId={log.photoId} onZoom={(src) => setZoomedPhotoUrl(src)} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full-screen Photo Zoom Lightbox */}
      {zoomedPhotoUrl && (
        <div
          onClick={() => setZoomedPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomedPhotoUrl} alt="Powiększenie" className="max-h-[85vh] max-w-full object-contain" />
            <button
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
