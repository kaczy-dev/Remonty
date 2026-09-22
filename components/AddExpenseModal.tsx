'use client';

import React, { useLayoutEffect, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, ExpenseCategory, Room } from '@/types/renovation';
import {
  X,
  Wallet,
  Camera,
  Sparkles,
  ScanText,
  ClipboardPaste,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { savePhotoBlob } from '@/lib/db/photos';
import { compressImage } from '@/lib/image-compressor';
import {
  parseReceiptText,
  tryScanFiscalQRCode,
  ParsedReceiptData,
} from '@/lib/receipt-parser';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Expense) => void;
  rooms: Room[];
  currentRoomId?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Materiały budowlane',
  'Robocizna / Ekipa',
  'Narzędzia i sprzęt',
  'Wykończenie i dekoracje',
  'Transport i wniesienie',
  'Wywóz gruzu i utylizacja',
  'Projekt i formalności',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  rooms,
  currentRoomId,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('Materiały budowlane');
  const [roomId, setRoomId] = useState<string>(currentRoomId || rooms[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paid, setPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('Karta / Przelew');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  // OCR & Smart Auto-fill state
  const [showOcrDrawer, setShowOcrDrawer] = useState(false);
  const [ocrRawInput, setOcrRawInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyParsedReceipt = useCallback(
    (data: ParsedReceiptData, sourceLabel: string) => {
      let appliedCount = 0;

      if (data.totalAmount && data.totalAmount > 0) {
        setAmount(data.totalAmount);
        appliedCount++;
      }
      if (data.date) {
        setDate(data.date);
        appliedCount++;
      }
      if (data.storeName) {
        setTitle(`${data.storeName} - ${data.category || 'Materiały'}`);
        appliedCount++;
      }
      if (data.category) {
        setCategory(data.category);
        appliedCount++;
      }
      if (data.receiptNumber) {
        setReceiptNote(data.receiptNumber);
        appliedCount++;
      }
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      }

      if (appliedCount > 0) {
        setScanFeedback(
          `Rozpoznano ${appliedCount} parametrów (${sourceLabel}): ${
            data.storeName || ''
          } ${data.totalAmount ? `${data.totalAmount.toFixed(2)} PLN` : ''}`
        );
      }
    },
    []
  );

  const handleFileChange = async (file: File | null) => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptFile(file);
    if (file) {
      setReceiptPreviewUrl(URL.createObjectURL(file));

      // Attempt scanning fiscal QR code if supported
      try {
        const qrResult = await tryScanFiscalQRCode(file);
        if (qrResult) {
          applyParsedReceipt(qrResult, 'Kod QR paragonu');
        }
      } catch (err) {
        console.debug('QR code detection skipped:', err);
      }
    } else {
      setReceiptPreviewUrl(null);
    }
  };

  const receiptPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    receiptPreviewUrlRef.current = receiptPreviewUrl;
  }, [receiptPreviewUrl]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrlRef.current) {
        URL.revokeObjectURL(receiptPreviewUrlRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setTitle('');
      setAmount('');
      setCategory('Materiały budowlane');
      setRoomId(currentRoomId || rooms[0]?.id || '');
      setDate(new Date().toISOString().slice(0, 10));
      setPaid(true);
      setPaymentMethod('Karta / Przelew');
      setReceiptNote('');
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setShowOcrDrawer(false);
      setOcrRawInput('');
      setScanFeedback(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleParseManualText = () => {
    if (!ocrRawInput.trim()) return;
    const parsed = parseReceiptText(ocrRawInput);
    applyParsedReceipt(parsed, 'Tekst paragonu');
    setShowOcrDrawer(false);
  };

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setOcrRawInput(clipText);
          const parsed = parseReceiptText(clipText);
          applyParsedReceipt(parsed, 'Schowek systemowy');
          setShowOcrDrawer(false);
        }
      }
    } catch {
      // Fallback: clipboard access rejected or unsupported
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const id = crypto.randomUUID();
      let receiptPhotoId: string | undefined;
      if (receiptFile) {
        const photoId = `expense-${id}`;
        const compressed = await compressImage(receiptFile, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
          mimeType: 'image/webp',
        });
        await savePhotoBlob(photoId, compressed);
        receiptPhotoId = photoId;
      }

      const newExpense: Expense = {
        id,
        title: title.trim(),
        amount: Number(amount),
        category,
        roomId: roomId || undefined,
        date,
        paid,
        paymentMethod,
        receiptNote: receiptNote.trim() || undefined,
        receiptPhotoId,
      };

      onAddExpense(newExpense);
      onClose();
    } catch (err) {
      console.error('Błąd zapisu wydatku / kompresji paragonu:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-modal-title"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="add-expense-modal-title" className="text-sm font-bold text-white">Rejestracja Wydatku / Faktury</h3>
                  <p className="text-[11px] text-slate-400">
                    Rozpoznawanie paragonów (Castorama, Leroy, OBI) i kompresja do WebP
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                aria-label="Zamknij okno rejestracji wydatku"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Smart OCR / Assistant Quick Banner */}
            <div className="mb-3.5 space-y-2">
              <div className="flex items-center justify-between bg-teal-950/40 border border-teal-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Inteligentny Asystent Paragonu (OCR)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOcrDrawer((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-200 transition"
                >
                  <ScanText className="w-3.5 h-3.5" />
                  <span>{showOcrDrawer ? 'Ukryj' : 'Wklej tekst ze skanera'}</span>
                  {showOcrDrawer ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Collapsible Text / Clipboard OCR Parser */}
              {showOcrDrawer && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Wklej tekst ze skanera telefonu (Live Text / Google Lens):</span>
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Wklej ze schowka</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="np. CASTORAMA POLSKA SUMA PLN 349,50 DATA 2026-03-12 PŁATNOŚĆ KARTĄ..."
                    value={ocrRawInput}
                    onChange={(e) => setOcrRawInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white placeholder:text-slate-600 focus:border-teal-500 focus:outline-hidden"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseManualText}
                      disabled={!ocrRawInput.trim()}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition disabled:opacity-40"
                    >
                      Rozpoznaj i wypełnij formularz
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback alert if OCR recognized something */}
              {scanFeedback && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{scanFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setScanFeedback(null)}
                    className="ml-auto text-emerald-400 hover:text-emerald-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Tytuł wydatku / Nazwa pozycji:
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Klej do gresu C2TE S1 (5 worków)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kwota brutto (PLN):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="np. 450.00"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data zakupu:</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kategoria kosztu:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Pomieszczenie:</label>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Numer paragonu / faktury:
                  </label>
                  <input
                    type="text"
                    placeholder="np. Faktura VAT 2026/03/991"
                    value={receiptNote}
                    onChange={(e) => setReceiptNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Metoda płatności:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as Expense['paymentMethod'])
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="Karta / Przelew">Karta / Przelew</option>
                    <option value="BLIK">BLIK</option>
                    <option value="Gotówka">Gotówka</option>
                    <option value="Faktura terminowa">Faktura terminowa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Zdjęcie paragonu / faktury (opcjonalnie):
                </label>
                {receiptPreviewUrl ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-500/50 bg-slate-950 p-2.5">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptPreviewUrl}
                        alt="Podgląd paragonu"
                        className="h-12 w-12 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-teal-300 truncate">
                          {receiptFile?.name || 'Zdjęcie paragonu'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {receiptFile
                            ? `${(receiptFile.size / 1024).toFixed(1)} KB • Zapis w IndexedDB`
                            : 'Gotowy do zapisu w IndexedDB'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Usuń zdjęcie"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-xs text-slate-400 hover:border-teal-500 hover:text-teal-300 transition cursor-pointer">
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>Zrób zdjęcie lub wybierz z galerii (IndexedDB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is-paid-chk"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-700 accent-teal-500 cursor-pointer"
                />
                <label htmlFor="is-paid-chk" className="text-xs text-slate-300 cursor-pointer">
                  Wydatek opłacony natychmiastowo (gotówka / BLIK / karta)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz Wydatek'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
