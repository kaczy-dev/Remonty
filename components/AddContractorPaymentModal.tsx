'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contractor, ContractorPayment, Expense } from '@/types/renovation';
import { calculateContractorSettlement } from '@/lib/labor-calculator';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AddContractorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor | null;
  onSavePayment: (
    contractorId: string,
    payment: ContractorPayment,
    createExpenseRecord: boolean
  ) => void;
}

export const AddContractorPaymentModal: React.FC<AddContractorPaymentModalProps> = ({
  isOpen,
  onClose,
  contractor,
  onSavePayment,
}) => {
  const [amount, setAmount] = useState<number | ''>(2000);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<ContractorPayment['type']>('advance');
  const [note, setNote] = useState('Zaliczka na poczet prac remontowych');
  const [syncWithExpenses, setSyncWithExpenses] = useState(true);

  if (!isOpen || !contractor) return null;

  const settlement = calculateContractorSettlement(contractor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const payment: ContractorPayment = {
      id: `pay-${Date.now()}`,
      date,
      amount: Number(amount),
      type,
      note: note.trim() || 'Wypłata dla wykonawcy',
    };

    onSavePayment(contractor.id, payment, syncWithExpenses);
    onClose();
  };

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rejestracja Wypłaty / Zaliczki</h3>
                <p className="text-xs text-slate-400">
                  Wykonawca: <strong className="text-slate-200">{contractor.name}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Balance Overview Box */}
          <div className="bg-slate-950/40 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Wartość umowy:</span>
              <strong className="text-white font-mono">{settlement.agreedTotalCost.toLocaleString('pl-PL')} zł</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Wypłacono dotychczas:</span>
              <strong className="text-teal-300 font-mono">{settlement.totalPaid.toLocaleString('pl-PL')} zł ({settlement.paidPercent}%)</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pozostało do spłaty:</span>
              <strong className="text-amber-300 font-mono">{settlement.remainingToPay.toLocaleString('pl-PL')} zł</strong>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Kwota wypłaty (PLN) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3 h-3.5 w-3.5 text-teal-400" />
                <input
                  type="number"
                  min="1"
                  step="50"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-sm font-bold text-white font-mono focus:border-teal-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Typ transzy / płatności
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ContractorPayment['type'])}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-teal-400 focus:outline-hidden"
                >
                  <option value="advance">Zaliczka początkowa</option>
                  <option value="stage_settlement">Rozliczenie etapu</option>
                  <option value="final">Płatność końcowa (odbiór)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Data przekazania środków
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-teal-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Tytuł przelewu / Opis rozliczenia
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="np. Zaliczka na hydraulikę lub Zakończenie gładzi w salonie"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
              />
            </div>

            {/* Sync Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={syncWithExpenses}
                  onChange={(e) => setSyncWithExpenses(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">
                    Zarejestruj automatycznie w Rejestrze Wydatków
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Dodaje pozycję o wartości {amount ? Number(amount).toLocaleString('pl-PL') : 0} zł do kategorii <em>Robocizna / Ekipa</em>, obciążając bieżący budżet mieszkania.
                  </span>
                </div>
              </label>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={!amount || Number(amount) <= 0}
                className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Zapisz wypłatę</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
