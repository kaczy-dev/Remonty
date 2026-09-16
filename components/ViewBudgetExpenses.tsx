'use client';

import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, RenovationProject } from '@/types/renovation';
import { 
  Wallet, 
  TrendingDown, 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  AlertCircle,
  CheckCircle2,
  PieChart,
  Calendar,
  Building,
  DollarSign
} from 'lucide-react';

interface ViewBudgetExpensesProps {
  project: RenovationProject;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onToggleExpensePaid: (expenseId: string) => void;
  onOpenAddModal: () => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Materiały budowlane': '#10b981',
  'Robocizna / Ekipa': '#3b82f6',
  'Narzędzia i sprzęt': '#f59e0b',
  'Wykończenie i dekoracje': '#ec4899',
  'Transport i wniesienie': '#8b5cf6',
  'Wywóz gruzu i utylizacja': '#ef4444',
  'Projekt i formalności': '#06b6d4',
};

export const ViewBudgetExpenses: React.FC<ViewBudgetExpensesProps> = ({
  project,
  onAddExpense,
  onDeleteExpense,
  onToggleExpensePaid,
  onOpenAddModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculations
  const totalSpent = useMemo(() => {
    return project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [project.expenses]);

  const remainingBudget = project.totalPlannedBudget - totalSpent;
  const spentPercent = Math.min(100, Math.round((totalSpent / project.totalPlannedBudget) * 100));
  const contingencyAmount = Math.round((project.totalPlannedBudget * project.contingencyReservePercent) / 100);

  // Group by category
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    project.expenses.forEach((exp) => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return Object.entries(map).map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
      percent: Math.round((amount / (totalSpent || 1)) * 100),
      color: CATEGORY_COLORS[category as ExpenseCategory] || '#94a3b8',
    })).sort((a, b) => b.amount - a.amount);
  }, [project.expenses, totalSpent]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return project.expenses.filter((exp) => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (selectedRoomId !== 'all' && exp.roomId !== selectedRoomId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return exp.title.toLowerCase().includes(q) || (exp.receiptNote && exp.receiptNote.toLowerCase().includes(q));
      }
      return true;
    });
  }, [project.expenses, selectedCategory, selectedRoomId, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Tytuł', 'Kwota (PLN)', 'Kategoria', 'Pomieszczenie', 'Opłacone', 'Notatka'];
    const rows = project.expenses.map((e) => [
      e.date,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.category}"`,
      e.roomId || 'Ogólne',
      e.paid ? 'TAK' : 'NIE',
      `"${(e.receiptNote || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `renovai-kosztorys-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Cards: Budget Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Budget */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Budżet Całkowity</span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {project.totalPlannedBudget.toLocaleString('pl-PL')} <span className="text-sm font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Rezerwa 15%: <strong className="text-slate-300 font-mono">{contingencyAmount.toLocaleString('pl-PL')} zł</strong>
          </div>
        </div>

        {/* Total Spent */}
        <div className="rounded-2xl border border-teal-500/30 bg-teal-950/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-teal-300 text-xs">
            <span className="font-semibold uppercase tracking-wider">Wydano Dotychczas</span>
            <Receipt className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalSpent.toLocaleString('pl-PL')} <span className="text-sm font-normal text-slate-400">PLN</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-teal-300 font-mono font-bold">{spentPercent}% budżetu</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-teal-400 rounded-full" 
                style={{ width: `${spentPercent}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Pozostało w kasie</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {remainingBudget.toLocaleString('pl-PL')} <span className="text-sm font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Środki bezpieczne na dalsze etapy prac
          </div>
        </div>

        {/* Cost Optimization DIY */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Oszczędność w trybie DIY</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            12 850 <span className="text-sm font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Zaoszczędzone na samodzielnych demontażach i gładziach
          </div>
        </div>

      </div>

      {/* Category Breakdown Progress Bars & Distribution */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-400" />
            Rozbicie Kosztów według Kategorii
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {project.expenses.length} zarejestrowanych wydatków
          </span>
        </div>

        {/* Segmented Cumulative Bar */}
        <div className="w-full h-3 rounded-xl bg-slate-950 overflow-hidden flex border border-slate-800">
          {categoryStats.map((cat) => (
            <div
              key={cat.category}
              title={`${cat.category}: ${cat.amount} PLN (${cat.percent}%)`}
              style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
              className="h-full transition-all duration-300 hover:opacity-80"
            />
          ))}
        </div>

        {/* Category Legend Tags */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {categoryStats.map((cat) => (
            <div 
              key={cat.category}
              className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-medium text-slate-300 truncate">{cat.category}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white shrink-0">
                {cat.amount.toLocaleString('pl-PL')} zł
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filterable Expenses Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        
        {/* Ledger Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-400" />
              Rejestr Faktur i Paragonów Remontowych
            </h3>
            <p className="text-xs text-slate-400">
              Ewidencja każdego zakupu ze statusem opłacenia i przypisaniem do pomieszczenia.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Eksportuj CSV</span>
            </button>
            <button
              id="ledger-add-expense-btn"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nowy Wydatek</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Szukaj wydatku, faktury..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">Wszystkie kategorie</option>
            <option value="Materiały budowlane">Materiały budowlane</option>
            <option value="Robocizna / Ekipa">Robocizna / Ekipa</option>
            <option value="Narzędzia i sprzęt">Narzędzia i sprzęt</option>
            <option value="Wywóz gruzu i utylizacja">Wywóz gruzu i utylizacja</option>
            <option value="Wykończenie i dekoracje">Wykończenie i dekoracje</option>
            <option value="Transport i wniesienie">Transport i wniesienie</option>
          </select>

          {/* Room Filter */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">Wszystkie pomieszczenia</option>
            {project.rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Tytuł wydatku & Dowód</th>
                <th className="py-3 px-4">Kategoria</th>
                <th className="py-3 px-4">Pomieszczenie</th>
                <th className="py-3 px-4 text-right">Kwota (PLN)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Brak wydatków spełniających wybrane kryteria wyszukiwania.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const room = project.rooms.find((r) => r.id === exp.roomId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{exp.title}</div>
                        {exp.receiptNote && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>{exp.receiptNote}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span 
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold border"
                          style={{
                            borderColor: `${CATEGORY_COLORS[exp.category] || '#64748b'}40`,
                            backgroundColor: `${CATEGORY_COLORS[exp.category] || '#64748b'}15`,
                            color: CATEGORY_COLORS[exp.category] || '#cbd5e1',
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                        {room ? room.name : 'Całe mieszkanie'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {exp.amount.toLocaleString('pl-PL')} zł
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onToggleExpensePaid(exp.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition ${
                            exp.paid
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                              : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${exp.paid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span>{exp.paid ? 'Opłacony' : 'Do zapłaty'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="text-slate-500 hover:text-rose-400 transition text-[11px]"
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
