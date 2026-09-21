'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, Room } from '@/types/renovation';
import { usePhotoSrc, LOCAL_PHOTO_PREFIX } from '@/lib/db/usePhotoSrc';
import { savePhotoBlob } from '@/lib/db/photos';
import { compressImage } from '@/lib/image-compressor';
import {
  X,
  Receipt,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Calendar,
  CreditCard,
  Building,
  Camera,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  room?: Room;
  onUpdateExpenseReceipt?: (expenseId: string, photoId: string) => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  expense,
  room,
  onUpdateExpenseReceipt,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const photoKey = expense?.receiptPhotoId ? LOCAL_PHOTO_PREFIX + expense.receiptPhotoId : undefined;
  const photoSrc = usePhotoSrc(photoKey);

  if (!expense) return null;

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(2.5, z + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(0.75, z - 0.25));
  };

  const handleDownload = () => {
    if (!photoSrc) return;
    const link = document.createElement('a');
    link.href = photoSrc;
    link.download = `paragon-${expense.id.slice(0, 8)}-${expense.date}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAttachReceipt = async (file: File) => {
    try {
      setIsUploading(true);
      const photoId = `expense-${expense.id}`;
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      await savePhotoBlob(photoId, compressed);
      if (onUpdateExpenseReceipt) {
        onUpdateExpenseReceipt(expense.id, photoId);
      }
    } catch (err) {
      console.error('Błąd zapisu paragonu:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {expense.title}
                    <span className="font-mono text-teal-300 font-bold">
                      {expense.amount.toFixed(2)} PLN
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cyfrowy dowód zakupu zmagazynowany lokalnie w IndexedDB
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

            {/* Content Body: Image Viewport + Metadata Details */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Column: Image Canvas Stage */}
              <div className="flex-1 bg-black/70 flex flex-col items-center justify-center p-4 min-h-[300px] sm:min-h-[400px] relative overflow-hidden">
                {photoSrc ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoSrc}
                      alt="Paragon / Faktura"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-h-[50vh] md:max-h-[60vh] max-w-full object-contain rounded-lg shadow-xl"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-3">
                    <Receipt className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
                    <div>
                      <div className="text-sm font-semibold text-slate-300">Brak załączonego zdjęcia paragonu</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Możesz sfotografować lub dodać paragon dla tej pozycji teraz.
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition cursor-pointer shadow-sm">
                      <Camera className="w-4 h-4" />
                      <span>{isUploading ? 'Zapisywanie...' : 'Dodaj zdjęcie paragonu'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAttachReceipt(f);
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Floating Image Control Bar */}
                {photoSrc && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 px-3 py-1.5 text-slate-300 shadow-xl">
                    <button
                      onClick={handleZoomOut}
                      title="Pomniejsz"
                      className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono w-10 text-center font-bold">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      title="Powiększ"
                      className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    <button
                      onClick={handleRotate}
                      title="Obróć o 90°"
                      className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    <button
                      onClick={handleDownload}
                      title="Pobierz zdjęcie na dysk"
                      className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
                    >
                      <Download className="w-4 h-4 text-teal-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Expense Specification */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/90 p-5 space-y-4 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Szczegóły Księgowe</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Kwota Brutto</span>
                      <span className="text-lg font-mono font-bold text-white">{expense.amount.toFixed(2)} PLN</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Status płatności:</span>
                      {expense.paid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Opłacony
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          Do zapłaty
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">Data zakupu:</span>
                      <strong className="font-mono text-white ml-auto">{expense.date}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">Kategoria:</span>
                      <span className="font-semibold text-teal-300 ml-auto">{expense.category}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">Pomieszczenie:</span>
                      <span className="font-medium text-white ml-auto">
                        {room ? room.name : 'Całe mieszkanie'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">Płatność:</span>
                      <span className="font-medium text-white ml-auto">{expense.paymentMethod}</span>
                    </div>
                  </div>

                  {expense.receiptNote && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Numer faktury / Notatka</span>
                      <p className="text-xs text-slate-200">{expense.receiptNote}</p>
                    </div>
                  )}

                  {/* Change/Replace receipt photo button */}
                  {photoSrc && (
                    <div className="pt-2">
                      <label className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-teal-500 hover:text-white transition cursor-pointer">
                        <Camera className="w-3.5 h-3.5 text-teal-400" />
                        <span>Zastąp zdjęcie paragonu</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAttachReceipt(f);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
