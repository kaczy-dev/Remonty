'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contractor, ContractorTrade, ContractorStatus } from '@/types/renovation';
import {
  Briefcase,
  Phone,
  Mail,
  DollarSign,
  Star,
  X,
  FileCheck,
} from 'lucide-react';

interface AddContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveContractor: (contractor: Contractor) => void;
  contractorToEdit?: Contractor | null;
}

const TRADE_OPTIONS: Array<{ value: ContractorTrade; label: string }> = [
  { value: 'general', label: 'Ekipa ogólnobudowlana / wykończeniowa' },
  { value: 'tiler', label: 'Glazurnik / Układanie płytek' },
  { value: 'plumber', label: 'Hydraulik / Wod-Kan i Biały Montaż' },
  { value: 'electrician', label: 'Elektryk / Pomiary i Osprzęt' },
  { value: 'painter', label: 'Malarz / Gładzie bezpyłowe' },
  { value: 'doors_floors', label: 'Montażysta drzwi i paneli/parkietu' },
  { value: 'carpenter', label: 'Stolarz / Meble na wymiar' },
  { value: 'plasterer', label: 'Tynkarz / Tynki maszynowe' },
  { value: 'hvac', label: 'Klimatyzacja i wentylacja' },
];

const STATUS_OPTIONS: Array<{ value: ContractorStatus; label: string }> = [
  { value: 'contact', label: 'Wstępny kontakt / Rozmowy' },
  { value: 'quote_received', label: 'Otrzymano wycenę / Ofertę' },
  { value: 'contract_signed', label: 'Umowa podpisana' },
  { value: 'in_progress', label: 'Prace w toku' },
  { value: 'completed', label: 'Prace zakończone i rozliczone' },
];

interface ContractorFormContentProps {
  contractorToEdit?: Contractor | null;
  onClose: () => void;
  onSaveContractor: (contractor: Contractor) => void;
}

const ContractorFormContent: React.FC<ContractorFormContentProps> = ({
  contractorToEdit,
  onClose,
  onSaveContractor,
}) => {
  const [name, setName] = useState(contractorToEdit?.name || '');
  const [companyName, setCompanyName] = useState(contractorToEdit?.companyName || '');
  const [nip, setNip] = useState(contractorToEdit?.nip || '');
  const [phone, setPhone] = useState(contractorToEdit?.phone || '');
  const [email, setEmail] = useState(contractorToEdit?.email || '');
  const [trade, setTrade] = useState<ContractorTrade>(contractorToEdit?.trade || 'general');
  const [agreedTotalCost, setAgreedTotalCost] = useState<number | ''>(
    contractorToEdit?.agreedTotalCost ?? 15000
  );
  const [status, setStatus] = useState<ContractorStatus>(
    contractorToEdit?.status || 'contract_signed'
  );
  const [scopeNotes, setScopeNotes] = useState(contractorToEdit?.scopeNotes || '');
  const [startDate, setStartDate] = useState(contractorToEdit?.startDate || '');
  const [endDate, setEndDate] = useState(contractorToEdit?.endDate || '');
  const [rating, setRating] = useState<number>(contractorToEdit?.rating || 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const contractor: Contractor = {
      id: contractorToEdit?.id || `contr-${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      nip: nip.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      trade,
      agreedTotalCost: Number(agreedTotalCost) || 0,
      status,
      scopeNotes: scopeNotes.trim() || 'Prace remontowo-wykończeniowe.',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      payments: contractorToEdit?.payments || [],
      rating,
    };

    onSaveContractor(contractor);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Imię / Nazwisko */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Imię i Nazwisko majstra / kierownika *
          </label>
          <input
            type="text"
            required
            placeholder="np. Jan Kowalski"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
          />
        </div>

        {/* Nazwa Firmy */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Nazwa firmy (opcjonalnie)
          </label>
          <input
            type="text"
            placeholder="np. Kowalski Remonty Sp. z o.o."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
          />
        </div>

        {/* Branża */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Specjalizacja / Branża
          </label>
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value as ContractorTrade)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
          >
            {TRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Status współpracy
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContractorStatus)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Telefon kontaktowy *
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="tel"
              required
              placeholder="+48 600 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
            />
          </div>
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Adres e-mail (opcjonalnie)
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="email"
              placeholder="kontakt@fachowiec.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
            />
          </div>
        </div>

        {/* NIP */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            NIP wykonawcy (opcjonalnie do umowy)
          </label>
          <input
            type="text"
            placeholder="np. 5252819401"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
          />
        </div>

        {/* Ustalony koszt całkowity */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Uzgodniona kwota umowy (PLN) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3 h-3.5 w-3.5 text-teal-400" />
            <input
              type="number"
              min="0"
              step="100"
              required
              value={agreedTotalCost}
              onChange={(e) => setAgreedTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white font-mono focus:border-teal-400 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Daty */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Termin rozpoczęcia prac
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Termin zakończenia / Odbiór
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Zakres prac */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Zakres rzeczowy prac (do umowy i kosztorysu)
        </label>
        <textarea
          rows={3}
          placeholder="np. Kompleksowe ułożenie gresu w łazience, hydroizolacja 2K, montaż odpływu liniowego, osadzenie stelaża WC."
          value={scopeNotes}
          onChange={(e) => setScopeNotes(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
        />
      </div>

      {/* Ocena */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-400">Ocena jakości / rzetelności:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 text-slate-600 hover:text-amber-400 transition cursor-pointer"
            >
              <Star
                className={`h-4 w-4 ${
                  star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Submit Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={!name.trim() || !phone.trim()}
          className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition disabled:opacity-50 cursor-pointer"
        >
          <FileCheck className="h-4 w-4" />
          <span>{contractorToEdit ? 'Zapisz zmiany' : 'Dodaj wykonawcę'}</span>
        </button>
      </div>
    </form>
  );
};

export const AddContractorModal: React.FC<AddContractorModalProps> = ({
  isOpen,
  onClose,
  onSaveContractor,
  contractorToEdit,
}) => {
  if (!isOpen) return null;

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
          className="w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {contractorToEdit ? 'Edycja Danych Wykonawcy' : 'Dodaj Nowego Wykonawcę / Fachowca'}
                </h3>
                <p className="text-xs text-slate-400">
                  Zapisz kontakt, zakres robót i uzgodnioną stawkę umowy
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

          <ContractorFormContent
            key={contractorToEdit?.id || 'new'}
            contractorToEdit={contractorToEdit}
            onClose={onClose}
            onSaveContractor={onSaveContractor}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
