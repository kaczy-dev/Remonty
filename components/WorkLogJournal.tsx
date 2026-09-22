'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WorkLogEntry, Room, StageCategory } from '@/types/renovation';
import { savePhotoBlob } from '@/lib/db/photos';
import { usePhotoSrc, LOCAL_PHOTO_PREFIX } from '@/lib/db/usePhotoSrc';
import { compressImage } from '@/lib/image-compressor';
import {
  BookOpen,
  Plus,
  Calendar,
  Camera,
  Image as ImageIcon,
  User,
  Building,
  Trash2,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  CheckCircle2,
  Stamp,
  Layers,
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

interface PendingPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface ActiveLightboxState {
  photos: string[]; // photoIds
  currentIndex: number;
  entryTitle: string;
  entryDate: string;
}

const SinglePhotoThumb: React.FC<{
  photoId: string;
  index: number;
  total: number;
  onClick: () => void;
}> = ({ photoId, index, total, onClick }) => {
  const src = usePhotoSrc(LOCAL_PHOTO_PREFIX + photoId);
  if (!src) {
    return (
      <div className="h-24 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 text-xs animate-pulse">
        Wczytywanie...
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-700/80 bg-black aspect-video hover:border-teal-500 transition-all shadow-md"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Zdjęcie ${index + 1}`}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1.5 backdrop-blur-[2px]">
        <Maximize2 className="w-4 h-4 text-teal-300" />
        <span className="font-semibold text-xs">Powiększ</span>
      </div>
      {total > 1 && (
        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300 border border-white/10">
          {index + 1}/{total}
        </span>
      )}
    </div>
  );
};

const LightboxModal: React.FC<{
  lightbox: ActiveLightboxState;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}> = ({ lightbox, onClose, onNavigate }) => {
  const currentPhotoId = lightbox.photos[lightbox.currentIndex];
  const src = usePhotoSrc(LOCAL_PHOTO_PREFIX + currentPhotoId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && lightbox.currentIndex > 0) {
        onNavigate(lightbox.currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && lightbox.currentIndex < lightbox.photos.length - 1) {
        onNavigate(lightbox.currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox, onClose, onNavigate]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between border-b border-slate-800 pb-3 pt-1 text-slate-300"
      >
        <div className="min-w-0 pr-4">
          <h4 className="text-sm font-bold text-white truncate">{lightbox.entryTitle}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{lightbox.entryDate}</span>
            <span>•</span>
            <span className="font-mono text-teal-300">
              Zdjęcie {lightbox.currentIndex + 1} z {lightbox.photos.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {src && (
            <a
              href={src}
              download={`foto-dziennik-${lightbox.entryDate}-${lightbox.currentIndex + 1}.webp`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
              title="Pobierz zdjęcie"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Pobierz</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Zamknij (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2 sm:p-4 my-2 overflow-hidden"
      >
        {lightbox.photos.length > 1 && lightbox.currentIndex > 0 && (
          <button
            onClick={() => onNavigate(lightbox.currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900/80 p-3 text-white hover:bg-teal-600 transition shadow-xl border border-slate-700"
            title="Poprzednie (strzałka w lewo)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Powiększenie zdjęcia ${lightbox.currentIndex + 1}`}
            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
          />
        ) : (
          <div className="text-sm text-slate-500 animate-pulse">Ładowanie zdjęcia...</div>
        )}

        {lightbox.photos.length > 1 && lightbox.currentIndex < lightbox.photos.length - 1 && (
          <button
            onClick={() => onNavigate(lightbox.currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900/80 p-3 text-white hover:bg-teal-600 transition shadow-xl border border-slate-700"
            title="Następne (strzałka w prawo)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple photos) */}
      {lightbox.photos.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 max-w-2xl overflow-x-auto p-2 rounded-2xl bg-slate-900/80 border border-slate-800"
        >
          {lightbox.photos.map((pId, idx) => (
            <button
              key={pId}
              onClick={() => onNavigate(idx)}
              className={`h-12 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                idx === lightbox.currentIndex
                  ? 'border-teal-400 scale-105 shadow-md'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <ThumbPreviewStrip photoId={pId} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ThumbPreviewStrip: React.FC<{ photoId: string }> = ({ photoId }) => {
  const src = usePhotoSrc(LOCAL_PHOTO_PREFIX + photoId);
  if (!src) return <div className="h-full w-full bg-slate-950" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Miniatura" className="h-full w-full object-cover" />;
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
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<ActiveLightboxState | null>(null);

  // New entry form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState<string>(selectedRoomId || rooms[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageCategory, setStageCategory] = useState<StageCategory>('finishing');
  const [author, setAuthor] = useState('Kierownik prac');
  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhotoItem[]>([]);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  // Clean up object URLs on unmount
  const pendingPhotosRef = useRef(selectedPhotos);
  useEffect(() => {
    pendingPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleAddFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = Math.max(0, 6 - pendingPhotosRef.current.length);
    if (remainingSlots <= 0) return;

    const filesToAdd = Array.from(fileList).slice(0, remainingSlots);
    const newItems: PendingPhotoItem[] = filesToAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedPhotos((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const id = crypto.randomUUID();
      const savedPhotoIds: string[] = [];

      const targetRoomName = roomId ? (roomMap.get(roomId) || 'Pomieszczenie') : 'Całe mieszkanie';
      const cat = CATEGORIES.find((c) => c.key === stageCategory);

      // Watermark text stamped onto WebP photos
      const watermarkText = `[ ${date} ] • ${targetRoomName} • ${cat?.label || 'Prace remontowe'}`;
      const watermarkSubtext = `DZIENNIK BUDOWY | Autor: ${author} | ${title.trim()}`;

      for (let i = 0; i < selectedPhotos.length; i++) {
        const item = selectedPhotos[i];
        const photoId = `worklog-${id}-${i + 1}`;

        // Compress and optionally stamp photo
        const compressedBlob = await compressImage(item.file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
          mimeType: 'image/webp',
          watermark: applyWatermark
            ? {
                text: watermarkText,
                subtext: watermarkSubtext,
              }
            : undefined,
        });

        await savePhotoBlob(photoId, compressedBlob);
        savedPhotoIds.push(photoId);
      }

      const newEntry: WorkLogEntry = {
        id,
        date,
        roomId: roomId || undefined,
        stageCategory,
        author,
        title: title.trim(),
        description: description.trim(),
        photoId: savedPhotoIds[0] || undefined,
        photoIds: savedPhotoIds.length > 0 ? savedPhotoIds : undefined,
        createdAt: new Date().toISOString(),
      };

      onAddWorkLog(newEntry);

      // Reset form
      setTitle('');
      setDescription('');
      selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setSelectedPhotos([]);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = workLogs
    .filter((log) => {
      if (filterRoomId !== 'all' && log.roomId !== filterRoomId) return false;
      if (filterCategory !== 'all' && log.stageCategory !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = log.title.toLowerCase().includes(q);
        const matchesDesc = (log.description || '').toLowerCase().includes(q);
        const matchesAuthor = (log.author || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Count total photos across all logs
  const totalPhotosCount = workLogs.reduce((acc, l) => {
    if (l.photoIds && l.photoIds.length > 0) return acc + l.photoIds.length;
    if (l.photoId) return acc + 1;
    return acc;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dziennik Prac i Foto-Rejestr Budowy
              <span className="text-[10px] uppercase font-semibold bg-teal-950 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-full">
                Wpisy: {workLogs.length}
              </span>
              {totalPhotosCount > 0 && (
                <span className="text-[10px] uppercase font-semibold bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                  Zdjęcia: {totalPhotosCount}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Dokumentacja fotograficzna z automatyczną kompresją WebP, stemplem budowlanym i protokołami prób
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Zamknij formularz' : 'Nowy Wpis z Galerią'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Szukaj wpisów, uwag, wykonawcy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:outline-hidden"
          />
        </div>

        {/* Room Filter */}
        <select
          value={filterRoomId}
          onChange={(e) => setFilterRoomId(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
        >
          <option value="all">Wszystkie pomieszczenia</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
        >
          <option value="all">Wszystkie kategorie prac</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Entry Card (Collapsible) */}
      {showAddForm && (
        <form onSubmit={handleSaveEntry} className="rounded-2xl border border-teal-500/40 bg-slate-900 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Nowy wpis w foto-dzienniku budowy</span>
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
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
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
                  <option key={a} value={a}>
                    {a}
                  </option>
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
                placeholder="np. Próba ciśnieniowa hydrauliki i 1. warstwa hydroizolacji"
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
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Opis wykonanych prac / uwagi technologiczne:</label>
            <textarea
              rows={2}
              placeholder="np. Próba ciśnieniowa trwała 120 minut przy ciśnieniu 6 barów wg PN-EN 806-4, wynik pozytywny. Wklejono taśmy uszczelniające w narożnikach."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Multi-photo attachment section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                <span>Dokumentacja fotograficzna (do 6 zdjęć na wpis):</span>
                <span className="text-[10px] text-slate-500">
                  Wybrano {selectedPhotos.length}/6
                </span>
              </label>

              {/* Watermark toggle */}
              <label className="flex items-center gap-1.5 text-[11px] text-teal-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyWatermark}
                  onChange={(e) => setApplyWatermark(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-0 focus:outline-hidden"
                />
                <Stamp className="w-3 h-3 text-teal-400" />
                <span>Wtop stempel budowlany (data, etap, autor)</span>
              </label>
            </div>

            {/* Selected Photos Thumbnails List */}
            {selectedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {selectedPhotos.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden border border-teal-500/40 bg-slate-950 aspect-video shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={`Załącznik ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-1 left-1 rounded-md bg-black/70 px-1 py-0.5 text-[9px] font-mono text-white">
                      #{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(item.id)}
                      className="absolute top-1 right-1 rounded-md bg-rose-600/90 p-1 text-white hover:bg-rose-500 transition shadow"
                      title="Usuń to zdjęcie"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5 text-[9px] text-slate-300 truncate">
                      {(item.file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Action Buttons */}
            {selectedPhotos.length < 6 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Camera Snap Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-950/20 px-3 py-2.5 text-xs font-semibold text-teal-300 hover:bg-teal-950/40 transition active:scale-98"
                >
                  <Camera className="w-4 h-4 text-teal-400" />
                  <span>Zrób zdjęcie aparatem (Live)</span>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleAddFiles(e.target.files);
                      if (e.target) e.target.value = '';
                    }}
                  />
                </button>

                {/* Gallery Multiple Picker */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition active:scale-98"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>Wybierz z galerii (wiele zdjęć)</span>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddFiles(e.target.files);
                      if (e.target) e.target.value = '';
                    }}
                  />
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-500">
              Zdjęcia są kompresowane do nowoczesnego formatu WebP (oszczędność 90% miejsca) i zapisywane offline w IndexedDB.
            </p>
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
              {isSubmitting ? 'Zapisywanie i kompresja WebP...' : 'Zapisz Wpis w Dzienniku'}
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto stroke-1" />
            <div className="text-sm font-semibold text-slate-300">
              {searchQuery || filterRoomId !== 'all' || filterCategory !== 'all'
                ? 'Brak wpisów spełniających wybrane filtry'
                : 'Dziennik prac jest pusty'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Dokumentuj etapy prac, próby ciśnieniowe hydrauliki, hydroizolację i odbiory techniczne ze zdjęciami prosto ze smartfona.
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

            // Resolve all photo IDs (support both array and legacy single photoId)
            const photoList: string[] =
              log.photoIds && log.photoIds.length > 0
                ? log.photoIds
                : log.photoId
                ? [log.photoId]
                : [];

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 hover:border-slate-700 transition"
              >
                {/* Meta bar */}
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

                {/* Title & Notes */}
                <div>
                  <h4 className="text-sm font-bold text-white">{log.title}</h4>
                  {log.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                      {log.description}
                    </p>
                  )}
                </div>

                {/* Multi-Photo Gallery Grid */}
                {photoList.length > 0 && (
                  <div className="pt-1">
                    <div
                      className={`grid gap-2 ${
                        photoList.length === 1
                          ? 'max-w-md grid-cols-1'
                          : photoList.length === 2
                          ? 'grid-cols-2 max-w-xl'
                          : 'grid-cols-2 sm:grid-cols-3 max-w-2xl'
                      }`}
                    >
                      {photoList.map((pId, idx) => (
                        <SinglePhotoThumb
                          key={pId}
                          photoId={pId}
                          index={idx}
                          total={photoList.length}
                          onClick={() =>
                            setActiveLightbox({
                              photos: photoList,
                              currentIndex: idx,
                              entryTitle: log.title,
                              entryDate: log.date,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full-screen Lightbox with Navigation */}
      {activeLightbox && (
        <LightboxModal
          lightbox={activeLightbox}
          onClose={() => setActiveLightbox(null)}
          onNavigate={(newIndex) =>
            setActiveLightbox((prev) => (prev ? { ...prev, currentIndex: newIndex } : null))
          }
        />
      )}
    </div>
  );
};
