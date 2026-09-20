'use client';

import React, { useState, useMemo } from 'react';
import {
  Contractor,
  ContractorPayment,
  ContractorTrade,
  ContractorStatus,
  RenovationProject,
} from '@/types/renovation';
import {
  calculateContractorSettlement,
  calculateProjectLaborEstimate,
  POLISH_LABOR_MARKET_RATES,
} from '@/lib/labor-calculator';
import { ContractModal } from '@/components/ContractModal';
import { AddContractorModal } from '@/components/AddContractorModal';
import { AddContractorPaymentModal } from '@/components/AddContractorPaymentModal';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Star,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Edit2,
  Trash2,
  Calculator,
  Search,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface ContractorManagerViewProps {
  project: RenovationProject;
  onUpdateProject: (updated: RenovationProject) => void;
  onAddExpenseRecord?: (amount: number, title: string, date: string) => void;
}

const TRADE_LABELS: Record<ContractorTrade, { label: string; color: string }> = {
  general: { label: 'Ekipa ogólnobudowlana', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40' },
  tiler: { label: 'Glazurnik / Płytki', color: 'bg-teal-950/80 text-teal-300 border-teal-500/40' },
  plumber: { label: 'Hydraulik / Wod-Kan', color: 'bg-sky-950/80 text-sky-300 border-sky-500/40' },
  electrician: { label: 'Elektryk', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40' },
  painter: { label: 'Malarz / Gładzie', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' },
  doors_floors: { label: 'Montażysta drzwi i podłóg', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
  carpenter: { label: 'Stolarz', color: 'bg-amber-900/60 text-amber-200 border-amber-600/40' },
  plasterer: { label: 'Tynkarz', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  hvac: { label: 'Klimatyzacja i HVAC', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' },
};

const STATUS_LABELS: Record<ContractorStatus, { label: string; color: string }> = {
  contact: { label: 'Wstępny kontakt', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  quote_received: { label: 'Otrzymano wycenę', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40' },
  contract_signed: { label: 'Umowa podpisana', color: 'bg-teal-950/80 text-teal-300 border-teal-500/40' },
  in_progress: { label: 'Prace w toku', color: 'bg-sky-950/80 text-sky-300 border-sky-500/40' },
  completed: { label: 'Rozliczone (100%)', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
};

export const ContractorManagerView: React.FC<ContractorManagerViewProps> = ({
  project,
  onUpdateProject,
  onAddExpenseRecord,
}) => {
  const [subTab, setSubTab] = useState<'contractors' | 'market_rates'>('contractors');
  const [selectedContractorForContract, setSelectedContractorForContract] = useState<Contractor | null>(null);
  const [selectedContractorForPayment, setSelectedContractorForPayment] = useState<Contractor | null>(null);
  const [contractorToEdit, setContractorToEdit] = useState<Contractor | null>(null);
  const [contractorToDeleteId, setContractorToDeleteId] = useState<string | null>(null);
  const [isAddContractorOpen, setIsAddContractorOpen] = useState(false);
  const [rateSearch, setRateSearch] = useState('');
  const [rateCategoryFilter, setRateCategoryFilter] = useState('all');

  const contractors = useMemo(() => project.contractors || [], [project.contractors]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalAgreed = 0;
    let totalPaid = 0;

    contractors.forEach((c) => {
      const s = calculateContractorSettlement(c);
      totalAgreed += s.agreedTotalCost;
      totalPaid += s.totalPaid;
    });

    const remaining = Math.max(0, totalAgreed - totalPaid);
    const paidPercent = totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0;

    return {
      totalAgreed,
      totalPaid,
      remaining,
      paidPercent,
      count: contractors.length,
    };
  }, [contractors]);

  // Project Labor Estimate based on actual rooms
  const laborEstimate = useMemo(() => {
    return calculateProjectLaborEstimate(project.rooms);
  }, [project.rooms]);

  // Handlers
  const handleSaveContractor = (contractor: Contractor) => {
    const exists = contractors.some((c) => c.id === contractor.id);
    const updated = exists
      ? contractors.map((c) => (c.id === contractor.id ? contractor : c))
      : [...contractors, contractor];

    onUpdateProject({
      ...project,
      contractors: updated,
    });
  };

  const handleDeleteContractor = (contractorId: string) => {
    setContractorToDeleteId(contractorId);
  };

  const confirmDeleteContractor = () => {
    if (!contractorToDeleteId) return;
    const updated = contractors.filter((c) => c.id !== contractorToDeleteId);
    onUpdateProject({
      ...project,
      contractors: updated,
    });
    setContractorToDeleteId(null);
  };

  const handleSavePayment = (
    contractorId: string,
    payment: ContractorPayment,
    createExpenseRecord: boolean
  ) => {
    const target = contractors.find((c) => c.id === contractorId);
    if (!target) return;

    let linkedExpenseId: string | undefined;

    // Optionally create an expense in project.expenses
    let updatedExpenses = [...project.expenses];
    if (createExpenseRecord) {
      linkedExpenseId = `exp-labor-${Date.now()}`;
      payment.linkedExpenseId = linkedExpenseId;

      updatedExpenses.push({
        id: linkedExpenseId,
        title: `${target.name} (${TRADE_LABELS[target.trade]?.label || 'Robocizna'}) - ${payment.note}`,
        amount: payment.amount,
        date: payment.date,
        category: 'Robocizna / Ekipa',
        paid: true,
        paymentMethod: 'Karta / Przelew',
        receiptNote: `Wypłata ${payment.type === 'advance' ? 'zaliczki' : 'transzy'} dla wykonawcy ${target.name}`,
      });

      if (onAddExpenseRecord) {
        onAddExpenseRecord(payment.amount, target.name, payment.date);
      }
    }

    const updatedContractors = contractors.map((c) => {
      if (c.id !== contractorId) return c;
      const updatedPayments = [...c.payments, payment];
      // If paid total reaches or exceeds agreed cost, mark as completed
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const isCompleted = c.agreedTotalCost > 0 && totalPaid >= c.agreedTotalCost;
      return {
        ...c,
        status: isCompleted ? ('completed' as ContractorStatus) : c.status,
        payments: updatedPayments,
      };
    });

    onUpdateProject({
      ...project,
      expenses: updatedExpenses,
      contractors: updatedContractors,
    });
  };

  // Filtered market rates
  const filteredRates = useMemo(() => {
    return POLISH_LABOR_MARKET_RATES.filter((r) => {
      const matchSearch =
        !rateSearch ||
        r.name.toLowerCase().includes(rateSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(rateSearch.toLowerCase()) ||
        r.category.toLowerCase().includes(rateSearch.toLowerCase());
      const matchCat = rateCategoryFilter === 'all' || r.category === rateCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [rateSearch, rateCategoryFilter]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    POLISH_LABOR_MARKET_RATES.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0">
          <button
            onClick={() => setSubTab('contractors')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              subTab === 'contractors'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Ekipy & Umowy Robocizny ({contractors.length})</span>
          </button>
          <button
            onClick={() => setSubTab('market_rates')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              subTab === 'market_rates'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Kalkulator Stawek Rynkowych (Wycena lokalu)</span>
          </button>
        </div>

        {subTab === 'contractors' && (
          <button
            onClick={() => {
              setContractorToEdit(null);
              setIsAddContractorOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj Fachowca / Ekipę</span>
          </button>
        )}
      </div>

      {/* View 1: Contractors List & Payment Settlements */}
      {subTab === 'contractors' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Suma umów robocizny</span>
                <Briefcase className="h-4 w-4 text-teal-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {summary.totalAgreed.toLocaleString('pl-PL')} <span className="text-xs font-normal text-slate-400">PLN</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary.count} zakontraktowanych fachowców
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Wypłacono dotychczas</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {summary.totalPaid.toLocaleString('pl-PL')} <span className="text-xs font-normal text-slate-400">PLN</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary.paidPercent}% ustalonej kwoty robocizny
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Pozostało do zapłaty</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {summary.remaining.toLocaleString('pl-PL')} <span className="text-xs font-normal text-slate-400">PLN</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Do wypłaty po odbiorach etapowych
              </div>
            </div>

            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-300 mb-1">
                <span className="text-xs font-semibold">Szacunek rynkowy lokalu</span>
                <TrendingUp className="h-4 w-4 text-teal-400" />
              </div>
              <div className="text-xl font-bold font-mono text-teal-200">
                ~{laborEstimate.totalAvg.toLocaleString('pl-PL')} <span className="text-xs font-normal text-teal-300/70">PLN</span>
              </div>
              <div className="text-[11px] text-teal-400/80 mt-1">
                Widełki: {laborEstimate.totalMin.toLocaleString('pl-PL')} - {laborEstimate.totalMax.toLocaleString('pl-PL')} zł
              </div>
            </div>
          </div>

          {/* Contractors Cards Grid */}
          {contractors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
              <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Brak dodanych wykonawców</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Zapisz kontakty do swoich ekip remontowych, kontroluj wypłacane zaliczki i generuj bezpieczne umowy o remont.
              </p>
              <button
                onClick={() => {
                  setContractorToEdit(null);
                  setIsAddContractorOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj pierwszego wykonawcę</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {contractors.map((c) => {
                const settlement = calculateContractorSettlement(c);
                const tradeMeta = TRADE_LABELS[c.trade] || TRADE_LABELS.general;
                const statusMeta = STATUS_LABELS[c.status] || STATUS_LABELS.in_progress;

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      {/* Top Bar: Name, Trade & Actions */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{c.name}</h4>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${tradeMeta.color}`}>
                              {tradeMeta.label}
                            </span>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusMeta.color}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          {c.companyName && (
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Building className="w-3 h-3 text-slate-500" />
                              <span>{c.companyName}</span>
                              {c.nip && <span className="font-mono text-[11px] text-slate-500">• NIP: {c.nip}</span>}
                            </div>
                          )}
                        </div>

                        {/* Edit / Delete Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setContractorToEdit(c);
                              setIsAddContractorOpen(true);
                            }}
                            title="Edytuj wykonawcę"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContractor(c.id)}
                            title="Usuń wykonawcę"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact & Dates Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 py-1">
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1.5 text-teal-300 hover:underline font-mono"
                        >
                          <Phone className="w-3 h-3 text-teal-400" />
                          <span>{c.phone}</span>
                        </a>
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="flex items-center gap-1.5 text-slate-300 hover:underline"
                          >
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{c.email}</span>
                          </a>
                        )}
                        {(c.startDate || c.endDate) && (
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                            <Calendar className="w-3 h-3" />
                            <span>{c.startDate || 'start'} → {c.endDate || 'koniec'}</span>
                          </div>
                        )}
                      </div>

                      {/* Scope of Work Notes */}
                      {c.scopeNotes && (
                        <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 my-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                            Zakres prac:
                          </span>
                          <p className="line-clamp-2">{c.scopeNotes}</p>
                        </div>
                      )}

                      {/* Financial Progress & Settlement Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            Wypłacono: <strong className="text-emerald-300">{settlement.totalPaid.toLocaleString('pl-PL')} zł</strong> ({settlement.paidPercent}%)
                          </span>
                          <span className="text-slate-300">
                            Umowa: <strong>{settlement.agreedTotalCost.toLocaleString('pl-PL')} zł</strong>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              settlement.paidPercent >= 100 ? 'bg-emerald-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${settlement.paidPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Pozostało: <strong className="text-amber-300 font-mono">{settlement.remainingToPay.toLocaleString('pl-PL')} zł</strong></span>
                          <span>Liczba transz: {c.payments.length}</span>
                        </div>
                      </div>

                      {/* Recent Payments Mini List */}
                      {c.payments.length > 0 && (
                        <div className="mt-3 space-y-1 pt-2 border-t border-slate-800/60 text-[11px]">
                          <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                            Ostatnie wypłaty:
                          </span>
                          {c.payments.slice(-2).map((p) => (
                            <div key={p.id} className="flex justify-between items-center text-slate-400 font-mono bg-slate-950/40 px-2 py-1 rounded-md">
                              <span className="truncate max-w-[200px] text-slate-300">
                                {p.date} • {p.note}
                              </span>
                              <span className="font-bold text-teal-300 shrink-0">
                                +{p.amount.toLocaleString('pl-PL')} zł
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Card Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedContractorForPayment(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/25 transition cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Zarejestruj Wypłatę</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedContractorForContract(c)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                        title="Generuj umowę o remont wg art. 647 k.c."
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-400" />
                        <span>Umowa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Labor Market Rates Calculator & Room-by-Room Estimate */}
      {subTab === 'market_rates' && (
        <div className="space-y-6">
          {/* Apartment Labor Cost Projection Card */}
          <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="rounded-md border border-teal-500/30 bg-teal-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-teal-300 uppercase tracking-wider">
                  Automatyczny Szacunek Robocizny Inwestycji
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5">
                  Łączny szacunkowy koszt robocizny: ~{laborEstimate.totalAvg.toLocaleString('pl-PL')} PLN
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kalkulacja wyliczona na podstawie łącznej powierzchni pomieszczeń lokalu ({project.rooms.reduce((s, r) => s + r.area, 0).toFixed(1)} m² posadzki, {project.rooms.reduce((s, r) => s + r.wallArea, 0).toFixed(1)} m² ścian netto) oraz standardowych norm rynkowych w Polsce.
                </p>
              </div>

              <div className="flex gap-3 font-mono text-center">
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 min-w-[110px]">
                  <span className="text-[10px] text-slate-500 block">Wariant Eko (min):</span>
                  <strong className="text-slate-300 text-sm">{laborEstimate.totalMin.toLocaleString('pl-PL')} zł</strong>
                </div>
                <div className="rounded-xl bg-teal-950/60 border border-teal-500/40 p-3 min-w-[120px]">
                  <span className="text-[10px] text-teal-400 block font-sans font-semibold">Średnia rynkowa:</span>
                  <strong className="text-teal-300 text-base font-bold">{laborEstimate.totalAvg.toLocaleString('pl-PL')} zł</strong>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 min-w-[110px]">
                  <span className="text-[10px] text-slate-500 block">Wariant Premium (max):</span>
                  <strong className="text-slate-300 text-sm">{laborEstimate.totalMax.toLocaleString('pl-PL')} zł</strong>
                </div>
              </div>
            </div>

            {/* Breakdown by Trade Tags */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2.5">
              {Object.entries(laborEstimate.byTrade).map(([tradeKey, data]) => {
                if (data.totalCost <= 0) return null;
                const tradeMeta = TRADE_LABELS[tradeKey as ContractorTrade] || TRADE_LABELS.general;
                return (
                  <div
                    key={tradeKey}
                    className="flex items-center gap-2 rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-1.5 text-xs font-mono"
                  >
                    <span className="text-slate-400">{tradeMeta.label}:</span>
                    <strong className="text-teal-300 font-bold">{data.totalCost.toLocaleString('pl-PL')} zł</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room-by-Room Labor Estimates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-400" />
              <span>Szacunek kosztów robocizny w podziale na pomieszczenia</span>
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {laborEstimate.rooms.map((r) => (
                <div key={r.roomId} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <strong className="text-xs font-bold text-teal-300">{r.roomName}</strong>
                    <span className="font-mono text-xs text-slate-300 font-semibold">
                      ~{r.totalAvg.toLocaleString('pl-PL')} PLN
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {r.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[11px] text-slate-400 gap-2">
                        <div>
                          <span className="text-slate-300">{item.name}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{item.formulaDescription}</span>
                        </div>
                        <span className="font-mono text-slate-200 shrink-0">{item.totalCost.toLocaleString('pl-PL')} zł</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reference Table of Polish Market Rates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span>Katalog Średnich Stawek Rynkowych Robocizny w Polsce</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Aktualne stawki netto dla prac wykończeniowych wysokiej jakości (lata 2024-2026).
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Szukaj usługi..."
                    value={rateSearch}
                    onChange={(e) => setRateSearch(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden"
                  />
                </div>

                <select
                  value={rateCategoryFilter}
                  onChange={(e) => setRateCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-hidden"
                >
                  <option value="all">Wszystkie kategorie</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Zakres prac / Usługa</th>
                    <th className="py-2.5 px-3">Kategoria</th>
                    <th className="py-2.5 px-3 text-center">Jednostka</th>
                    <th className="py-2.5 px-3 text-right">Stawka Min</th>
                    <th className="py-2.5 px-3 text-right text-teal-300">Średnia Rynkowa</th>
                    <th className="py-2.5 px-3 text-right">Stawka Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        <div>{rate.name}</div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5 line-clamp-1">{rate.description}</div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">
                        <span className="rounded-md bg-slate-950 px-2 py-0.5 text-[10px] border border-slate-800">
                          {rate.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{rate.unit}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{rate.minRate} zł</td>
                      <td className="py-2.5 px-3 text-right text-teal-300 font-bold bg-teal-950/20">{rate.avgRate} zł</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{rate.maxRate} zł</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ContractModal
        isOpen={Boolean(selectedContractorForContract)}
        onClose={() => setSelectedContractorForContract(null)}
        contractor={selectedContractorForContract}
        project={project}
      />

      <AddContractorModal
        isOpen={isAddContractorOpen}
        onClose={() => {
          setIsAddContractorOpen(false);
          setContractorToEdit(null);
        }}
        onSaveContractor={handleSaveContractor}
        contractorToEdit={contractorToEdit}
      />

      <AddContractorPaymentModal
        isOpen={Boolean(selectedContractorForPayment)}
        onClose={() => setSelectedContractorForPayment(null)}
        contractor={selectedContractorForPayment}
        onSavePayment={handleSavePayment}
      />

      {/* Confirmation Modal for Contractor Deletion */}
      {contractorToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Usuń wykonawcę</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Czy na pewno chcesz usunąć tego wykonawcę z rejestru? Zostaną również usunięte powiązane z nim transze płatności i wyliczenia kosztorysowe.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setContractorToDeleteId(null)}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeleteContractor}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-xs"
              >
                Usuń wykonawcę
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
