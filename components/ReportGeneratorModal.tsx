'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RenovationProject } from '@/types/renovation';
import {
  getReportSummaryData,
  generateMaterialsCSV,
  generateExpensesCSV,
  generateContractorsCSV,
  generateFullCostEstimateCSV,
  downloadFile,
} from '@/lib/report-generator';
import { calculateGanttTimeline } from '@/lib/gantt-helper';
import {
  FileSpreadsheet,
  Printer,
  Download,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: RenovationProject;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [includeLabor, setIncludeLabor] = useState(true);
  const [includeGantt, setIncludeGantt] = useState(true);
  const [includeContractors, setIncludeContractors] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeQA, setIncludeQA] = useState(true);

  const [investorName, setInvestorName] = useState('Inwestor / Właściciel lokalu');
  const [contractorName, setContractorName] = useState('Renowacje u Kaczaka - Wykonawca');

  const summary = getReportSummaryData(project, selectedRoomId);

  const filteredRooms = selectedRoomId === 'all'
    ? project.rooms
    : project.rooms.filter((r) => r.id === selectedRoomId);

  const filteredMaterials = selectedRoomId === 'all'
    ? project.materials
    : project.materials.filter((m) => m.roomId === selectedRoomId);

  const filteredExpenses = selectedRoomId === 'all'
    ? project.expenses
    : project.expenses.filter((e) => e.roomId === selectedRoomId);

  const filteredStages = selectedRoomId === 'all'
    ? project.stages
    : project.stages.filter((s) => s.roomId === selectedRoomId);

  const filteredQA = selectedRoomId === 'all'
    ? project.qaChecklist
    : project.qaChecklist.filter((q) => q.roomId === selectedRoomId);

  const roomMap = new Map(project.rooms.map((r) => [r.id, r.name]));

  const ganttMeta = calculateGanttTimeline(
    filteredStages,
    project.startDate,
    project.targetEndDate
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFullCSV = () => {
    const csv = generateFullCostEstimateCSV(project);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `kosztorys-inwestorski-${project.title.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`);
  };

  const handleDownloadMaterialsCSV = () => {
    const csv = generateMaterialsCSV(filteredMaterials, project.rooms);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `zestawienie-materialow-${dateStr}.csv`);
  };

  const handleDownloadExpensesCSV = () => {
    const csv = generateExpensesCSV(filteredExpenses, project.rooms);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `rejestr-wydatkow-${dateStr}.csv`);
  };

  const handleDownloadContractorsCSV = () => {
    const csv = generateContractorsCSV(project.contractors || []);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `rozliczenie-ekip-${dateStr}.csv`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.96, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-5xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-950/40">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Generator Kosztorysów & Raportów Technicznych
                    <span className="text-[10px] uppercase font-semibold bg-teal-950 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-full">
                      PDF • Druk • Excel CSV
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rozszerzona dokumentacja wykonawcza, harmonogram Gantta, rozliczenia ekip, materiały i protokół PN-EN
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

            {/* Modal Top Control Bar & Options (Hidden when printing) */}
            <div className="border-b border-slate-800 bg-slate-950/70 px-6 py-3 shrink-0 no-print space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Room Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Zakres:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-hidden"
                  >
                    <option value="all">Całe mieszkanie ({project.rooms.length} pomieszczeń)</option>
                    {project.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.area.toFixed(1)} m²)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Export CTA Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
                    title="Drukuj lub zapisz jako czysty PDF A4 bez pasków bocznych"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Drukuj / Zapisz jako PDF</span>
                  </button>

                  <button
                    onClick={handleDownloadFullCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-teal-500 hover:text-white transition active:scale-95"
                    title="Pobierz pełny arkusz kosztorysowy (format CSV zgodny z Excel PL)"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pełny Kosztorys CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadMaterialsCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
                    title="Pobierz samo zestawienie materiałów i chemii budowlanej"
                  >
                    <Layers className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Materiały CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadContractorsCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
                    title="Pobierz zestawienie wykonawców i rozliczeń finansowych"
                  >
                    <Users className="w-3 h-3 text-sky-400" />
                    <span className="hidden sm:inline">Ekipy CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadExpensesCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
                    title="Pobierz rejestr wydatków i paragonów"
                  >
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">Wydatki CSV</span>
                  </button>
                </div>
              </div>

              {/* Section Checkboxes */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Dołącz w raporcie:</span>
                
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Metryka lokalu</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Materiały & Naddatki</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGantt}
                    onChange={(e) => setIncludeGantt(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Wykres Gantta</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLabor}
                    onChange={(e) => setIncludeLabor(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Robocizna & Etapy</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeContractors}
                    onChange={(e) => setIncludeContractors(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Ekipy & Rozliczenia</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Rejestr wydatków</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQA}
                    onChange={(e) => setIncludeQA(e.target.checked)}
                    className="rounded-sm border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Normy QA & Protokół odbioru</span>
                </label>
              </div>

              {/* Signatures Name Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-24 shrink-0">Inwestor:</span>
                  <input
                    type="text"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    placeholder="Imię i nazwisko inwestora"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-24 shrink-0">Wykonawca:</span>
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="Nazwa wykonawcy / ekipy"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Document Live Preview & Print Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/40">
              <div
                id="printable-report"
                className="mx-auto max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 text-xs leading-normal font-sans border border-slate-200"
              >
                {/* Printable Document Header */}
                <div className="border-b-2 border-teal-600 pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xl font-extrabold tracking-tight text-teal-800 uppercase flex items-center gap-2">
                        Renowacje u Kaczaka
                      </div>
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Karta Inwestycyjna • Kosztorys & Protokół Techniczny
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>Data wygenerowania: <strong>{summary.generatedDate}</strong></div>
                      <div>Status dokumentu: <strong>Oryginał wykonawczy</strong></div>
                    </div>
                  </div>

                  {/* Project Details Box */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Inwestycja:</span>
                      <strong className="text-slate-900 text-xs">{project.title}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Lokalizacja:</span>
                      <strong className="text-slate-900">{project.address}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inwestor:</span>
                      <strong className="text-slate-900">{investorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wykonawca:</span>
                      <strong className="text-slate-900">{contractorName}</strong>
                    </div>
                  </div>
                </div>

                {/* 1. Metric / Room Summary Section */}
                {includeSummary && (
                  <div className="mb-6 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3 flex items-center gap-1.5">
                      1. Metryka Powierzchniowa Lokalu
                    </h4>
                    
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                            <th className="py-1.5 px-2 font-semibold">Pomieszczenie</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Wymiary (m)</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Wysokość</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Posadzka netto</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Ściany netto</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Obwód (cokoły)</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Kubatura</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredRooms.map((r) => (
                            <tr key={r.id}>
                              <td className="py-1.5 px-2 font-medium text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-600">{r.width.toFixed(2)} × {r.length.toFixed(2)} m</td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-600">{r.height.toFixed(2)} m</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{r.area.toFixed(2)} m²</td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-700">{r.wallArea.toFixed(2)} m²</td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-700">{(r.perimeter || 0).toFixed(1)} mb</td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-700">{(r.area * r.height).toFixed(1)} m³</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td className="py-2 px-2">SUMA ZAKRESU</td>
                            <td className="py-2 px-2 text-right">—</td>
                            <td className="py-2 px-2 text-right">—</td>
                            <td className="py-2 px-2 text-right font-mono text-teal-800">{summary.totalFloorArea} m²</td>
                            <td className="py-2 px-2 text-right font-mono">{summary.totalWallArea} m²</td>
                            <td className="py-2 px-2 text-right font-mono">{summary.totalPerimeter} mb</td>
                            <td className="py-2 px-2 text-right font-mono">{summary.totalVolume} m³</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Materials & Waste Calculation Section */}
                {includeMaterials && (
                  <div className="mb-6 print-avoid-break">
                    <div className="flex justify-between items-baseline border-b border-teal-500/30 pb-1 mb-3">
                      <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider">
                        2. Zestawienie Materiałowe i Naddatki Technologiczne (+10-15%)
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Pozycji: {filteredMaterials.length}
                      </span>
                    </div>

                    {filteredMaterials.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                        Brak skalkulowanych materiałów dla wybranego zakresu.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mb-2">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                              <th className="py-1.5 px-2 font-semibold">Lp.</th>
                              <th className="py-1.5 px-2 font-semibold">Materiał / Asortyment</th>
                              <th className="py-1.5 px-2 font-semibold">Pomieszczenie</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Netto</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Zapas</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Do zakupu</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Cena jedn.</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Wartość PLN</th>
                              <th className="py-1.5 px-2 font-semibold text-center">Stan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredMaterials.map((m, idx) => (
                              <tr key={m.id}>
                                <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                                <td className="py-1.5 px-2 font-medium text-slate-900">
                                  {m.name}
                                  {m.formulaExplanation && (
                                    <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{m.formulaExplanation}</div>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-slate-600">{roomMap.get(m.roomId) || 'Ogólne'}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-slate-600">{m.baseQuantity.toFixed(2)} {m.unit}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-amber-700">+{m.wasteMarginPercent}%</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{m.finalQuantity.toFixed(2)} {m.unit}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-slate-600">{m.estimatedUnitPrice.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-teal-800">{m.totalPrice.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-center">
                                  {m.purchased ? (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-sm">KUPIONO</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">DO ZAKUPU</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                              <td colSpan={7} className="py-2 px-2 text-right">SUMA MATERIAŁÓW:</td>
                              <td className="py-2 px-2 text-right font-mono text-teal-800 text-xs">
                                {summary.totalMaterialsEstimated.toFixed(2)} PLN
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Gantt Chart Visual Export */}
                {includeGantt && (
                  <div className="mb-6 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3 flex items-center justify-between">
                      <span>3. Harmonogram Osi Czasu Gantta ({ganttMeta.projectStart} do {ganttMeta.projectEnd})</span>
                      <span className="text-[10px] text-slate-500 font-normal">Łączny czas: {ganttMeta.totalDays} dni</span>
                    </h4>

                    <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
                      <div className="grid grid-cols-12 text-[10px] font-bold text-slate-600 border-b border-slate-300 pb-1">
                        <div className="col-span-5">Etap prac / branża</div>
                        <div className="col-span-7 flex justify-between font-mono">
                          {ganttMeta.timeAxisMarkers.map((m, i) => (
                            <span key={i}>{m.label}</span>
                          ))}
                        </div>
                      </div>

                      {ganttMeta.bars.map((bar) => (
                        <div key={bar.id} className="grid grid-cols-12 gap-1 items-center text-[10px]">
                          <div className="col-span-5 truncate pr-2">
                            <span className="font-semibold text-slate-800">{bar.name}</span>
                            <span className="text-slate-500 block text-[9px] font-mono">{bar.startDate} → {bar.endDate} ({bar.durationDays}d)</span>
                          </div>
                          <div className="col-span-7 relative h-5 bg-slate-200 rounded-sm overflow-hidden flex items-center">
                            <div
                              className="absolute h-4 rounded-xs bg-teal-600 text-white font-mono text-[9px] font-bold flex items-center justify-center px-1"
                              style={{
                                left: `${bar.leftPercent}%`,
                                width: `${bar.widthPercent}%`,
                                minWidth: '20px',
                              }}
                            >
                              {bar.progressPercent}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Labor & Stages Section */}
                {includeLabor && (
                  <div className="mb-6 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3">
                      4. Szczegółowy Szacunek Robocizny i Etapów Prac
                    </h4>

                    {filteredStages.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                        Brak zdefiniowanych etapów prac w harmonogramie.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mb-2">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                              <th className="py-1.5 px-2 font-semibold">Lp.</th>
                              <th className="py-1.5 px-2 font-semibold">Zakres Prac</th>
                              <th className="py-1.5 px-2 font-semibold">Branża</th>
                              <th className="py-1.5 px-2 font-semibold">Termin</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Szacunek Ekipa</th>
                              <th className="py-1.5 px-2 font-semibold text-right">Szacunek DIY</th>
                              <th className="py-1.5 px-2 font-semibold text-center">Postęp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredStages.map((s, idx) => (
                              <tr key={s.id}>
                                <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                                <td className="py-1.5 px-2 font-medium text-slate-900">{s.name}</td>
                                <td className="py-1.5 px-2 text-slate-600 capitalize">{s.category}</td>
                                <td className="py-1.5 px-2 text-slate-600 font-mono text-[10px]">{s.startDate} → {s.endDate}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">{s.contractorCostEstimate.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-right font-mono text-slate-600">{s.diyCostEstimate.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-center font-mono font-bold">
                                  {s.progressPercent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                              <td colSpan={4} className="py-2 px-2 text-right">SUMA ROBOCIZNY:</td>
                              <td className="py-2 px-2 text-right font-mono text-teal-800 text-xs">
                                {summary.totalLaborEstimated.toFixed(2)} PLN
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Contractors & Settlements Section */}
                {includeContractors && project.contractors && project.contractors.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3">
                      5. Rejestr Wykonawców i Rozliczenia Finansowe
                    </h4>
                    <div className="overflow-x-auto mb-2">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                            <th className="py-1.5 px-2 font-semibold">Wykonawca</th>
                            <th className="py-1.5 px-2 font-semibold">Branża</th>
                            <th className="py-1.5 px-2 font-semibold">Status</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Kwota Umowna</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Wypłacono</th>
                            <th className="py-1.5 px-2 font-semibold text-right">Pozostało</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {project.contractors.map((c) => {
                            const totalPaid = (c.payments || []).reduce((sum, p) => sum + p.amount, 0);
                            const balance = Math.max(0, c.agreedTotalCost - totalPaid);
                            return (
                              <tr key={c.id}>
                                <td className="py-1.5 px-2 font-semibold text-slate-900">{c.name}</td>
                                <td className="py-1.5 px-2 text-slate-600">{c.trade}</td>
                                <td className="py-1.5 px-2 text-slate-600 capitalize">{c.status.replace('_', ' ')}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold">{c.agreedTotalCost.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-right font-mono text-teal-800">{totalPaid.toFixed(2)} zł</td>
                                <td className="py-1.5 px-2 text-right font-mono text-amber-800 font-bold">{balance.toFixed(2)} zł</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. Expenses Register Section */}
                {includeExpenses && filteredExpenses.length > 0 && (
                  <div className="mb-6 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3">
                      6. Rejestr Wydatków Rzeczywistych i Paragonów
                    </h4>
                    <div className="overflow-x-auto mb-2">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                            <th className="py-1 px-2 font-semibold">Data</th>
                            <th className="py-1 px-2 font-semibold">Pozycja</th>
                            <th className="py-1 px-2 font-semibold">Kategoria</th>
                            <th className="py-1 px-2 font-semibold">Płatność</th>
                            <th className="py-1 px-2 font-semibold text-right">Kwota PLN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredExpenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="py-1 px-2 font-mono text-slate-600">{exp.date}</td>
                              <td className="py-1 px-2 font-medium text-slate-900">{exp.title}</td>
                              <td className="py-1 px-2 text-slate-600">{exp.category}</td>
                              <td className="py-1 px-2 text-slate-600">{exp.paymentMethod}</td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">{exp.amount.toFixed(2)} zł</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. Financial Summary & Contingency Box */}
                <div className="mb-6 print-avoid-break bg-teal-50/60 border border-teal-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider mb-2">
                    Zbiorcze Podsumowanie Kosztorysowe i Rezerwa Bezpieczeństwa
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-600 block text-[10px]">Budżet Planowany:</span>
                      <strong className="text-slate-900 font-mono text-sm">{summary.totalPlannedBudget.toFixed(2)} PLN</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Rezerwa awaryjna ({summary.contingencyReservePercent}%):</span>
                      <strong className="text-amber-800 font-mono text-sm">{summary.contingencyAmount.toFixed(2)} PLN</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Suma Kosztorysu (Mat. + Rob.):</span>
                      <strong className="text-teal-900 font-mono text-sm">{(summary.totalMaterialsEstimated + summary.totalLaborEstimated).toFixed(2)} PLN</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Rzeczywiste Wydatki:</span>
                      <strong className="text-slate-900 font-mono text-sm">{summary.totalSpentActual.toFixed(2)} PLN</strong>
                    </div>
                  </div>
                </div>

                {/* 8. QA & Technical Acceptance Protocol */}
                {includeQA && (
                  <div className="mb-8 print-avoid-break">
                    <h4 className="text-sm font-bold text-teal-900 uppercase tracking-wider border-b border-teal-500/30 pb-1 mb-3">
                      8. Protokół Odbioru Technicznego i Normy PN-EN / ITB
                    </h4>

                    {filteredQA.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                        Brak punktów kontrolnych QA w projekcie.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mb-2">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                              <th className="py-1.5 px-2 font-semibold">Punkt Kontrolny</th>
                              <th className="py-1.5 px-2 font-semibold">Norma / Wytyczna</th>
                              <th className="py-1.5 px-2 font-semibold">Dopuszczalna Tolerancja</th>
                              <th className="py-1.5 px-2 font-semibold text-center">Status</th>
                              <th className="py-1.5 px-2 font-semibold text-center">Podpis Odbierającego</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredQA.map((q) => (
                              <tr key={q.id}>
                                <td className="py-1.5 px-2 font-medium text-slate-900">{q.title}</td>
                                <td className="py-1.5 px-2 text-slate-600 font-mono">{q.standardNorm}</td>
                                <td className="py-1.5 px-2 text-slate-700">{q.toleranceGuide}</td>
                                <td className="py-1.5 px-2 text-center font-bold">
                                  {q.status === 'passed' && <span className="text-emerald-700">POZYTYWNY</span>}
                                  {q.status === 'failed' && <span className="text-rose-700">USTERKA</span>}
                                  {q.status === 'pending' && <span className="text-slate-500">OCZEKUJE</span>}
                                </td>
                                <td className="py-1.5 px-2 text-center text-slate-400">
                                  ..............................
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Legal Signatures Section */}
                <div className="pt-6 border-t-2 border-slate-300 print-avoid-break mt-6">
                  <div className="text-[11px] text-slate-600 mb-6 italic">
                    Powyższy kosztorys i zestawienie sporządzono na podstawie inwentaryzacji lokalu, norm budowlanych PN-EN oraz wytycznych ITB. Wszelkie zmiany materiałowe lub zakresu prac wymagają pisemnej akceptacji stron.
                  </div>

                  <div className="grid grid-cols-2 gap-12 pt-4">
                    <div className="text-center">
                      <div className="h-12 border-b border-slate-400 border-dashed mb-2" />
                      <div className="text-xs font-bold text-slate-900">{investorName}</div>
                      <div className="text-[10px] text-slate-500">Data i Podpis Inwestora</div>
                    </div>
                    <div className="text-center">
                      <div className="h-12 border-b border-slate-400 border-dashed mb-2" />
                      <div className="text-xs font-bold text-slate-900">{contractorName}</div>
                      <div className="text-[10px] text-slate-500">Data i Podpis Wykonawcy / Kierownika Prac</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
