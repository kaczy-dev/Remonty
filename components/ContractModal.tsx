'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contractor, RenovationProject } from '@/types/renovation';
import { generateRenovationContractText } from '@/lib/labor-calculator';
import {
  FileText,
  Copy,
  Check,
  Printer,
  Download,
  X,
  ShieldCheck,
  UserCheck,
  Calendar,
  Building,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor | null;
  project: RenovationProject;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  contractor,
  project,
}) => {
  const [investorName, setInvestorName] = useState('Inwestor / Właściciel lokalu');
  const [investorAddress, setInvestorAddress] = useState(project.address || 'ul. Grzybowska 43, Warszawa');
  const [investorPhone, setInvestorPhone] = useState('+48 500 000 000');
  const [contractCity, setContractCity] = useState('Warszawa');
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warrantyMonths, setWarrantyMonths] = useState(24);
  const [penaltyPerDay, setPenaltyPerDay] = useState(0.2);
  const [copied, setCopied] = useState(false);

  const contractText = useMemo(() => {
    if (!contractor) return '';
    return generateRenovationContractText({
      project,
      contractor,
      investorName,
      investorAddress,
      investorPhone,
      contractCity,
      contractDate,
      warrantyMonths,
      penaltyPerDayPercent: penaltyPerDay,
    });
  }, [
    project,
    contractor,
    investorName,
    investorAddress,
    investorPhone,
    contractCity,
    contractDate,
    warrantyMonths,
    penaltyPerDay,
  ]);

  if (!isOpen || !contractor) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Umowa_Remontowa_${contractor.name.replace(/\s+/g, '_')}_${contractDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Umowa o roboty remontowe - ${contractor.name}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; margin: 30mm 20mm; color: #000; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
            @page { size: A4; margin: 20mm; }
          </style>
        </head>
        <body>
          <pre>${contractText}</pre>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          className="w-full max-w-4xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Generator Umowy o Roboty Remontowe
                  <span className="rounded-md border border-teal-500/30 bg-teal-950/60 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                    Art. 647 Kodeksu Cywilnego
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Wykonawca: <strong>{contractor.companyName || contractor.name}</strong> • Kwota:{' '}
                  <strong className="text-teal-300">{contractor.agreedTotalCost.toLocaleString('pl-PL')} PLN</strong>
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

          {/* Quick Param Config Bar */}
          <div className="bg-slate-950/40 border-b border-slate-800 px-6 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Inwestor (Zamawiający):</label>
              <input
                type="text"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Telefon Inwestora:</label>
              <input
                type="text"
                value={investorPhone}
                onChange={(e) => setInvestorPhone(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Miejscowość i data:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={contractCity}
                  onChange={(e) => setContractCity(e.target.value)}
                  className="w-1/2 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
                />
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-1/2 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Gwarancja / Kary dzienne:</label>
              <div className="flex gap-1.5 items-center">
                <select
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                  className="w-1/2 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
                >
                  <option value={12}>12 m-cy</option>
                  <option value={24}>24 m-ce</option>
                  <option value={36}>36 m-cy</option>
                </select>
                <div className="w-1/2 flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={penaltyPerDay}
                    onChange={(e) => setPenaltyPerDay(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Content Preview Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-text space-y-4">
            <pre className="whitespace-pre-wrap font-mono">{contractText}</pre>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4 bg-slate-950/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Zawiera protokół odbioru i klauzule zabezpieczające termin</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj tekst'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/40 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Pobierz .txt</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Drukuj / PDF</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
