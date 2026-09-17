'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, ExpenseCategory, Room } from '@/types/renovation';
import { X, Wallet, Receipt, Plus } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      amount: Number(amount),
      category,
      roomId: roomId || undefined,
      date,
      paid,
      paymentMethod,
      receiptNote: receiptNote.trim() || undefined,
    };

    onAddExpense(newExpense);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100"
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Rejestracja Wydatku / Faktury</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Tytuł wydatku / Nazwa pozycji:</label>
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
                  <option key={c} value={c}>{c}</option>
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
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Numer paragonu / faktury:</label>
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
                onChange={(e) => setPaymentMethod(e.target.value as Expense['paymentMethod'])}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              >
                <option value="Karta / Przelew">Karta / Przelew</option>
                <option value="BLIK">BLIK</option>
                <option value="Gotówka">Gotówka</option>
                <option value="Faktura terminowa">Faktura terminowa</option>
              </select>
            </div>
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
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm"
            >
              Zapisz Wydatek
            </button>
          </div>
        </form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
