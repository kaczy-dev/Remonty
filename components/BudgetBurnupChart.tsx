'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { RenovationProject } from '@/types/renovation';
import { calculateBudgetBurnup, BudgetHealthStatus } from '@/lib/burnup-calculator';

interface BudgetBurnupChartProps {
  project: RenovationProject;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-300">
        <span>Termin:</span>
        <span className="font-mono text-teal-300">{label}</span>
      </div>

      {payload.map((entry, idx) => {
        if (entry.value === null || entry.value === undefined) return null;
        let name = entry.name;
        if (entry.dataKey === 'plannedCumulative') name = 'Plan wg harmonogramu (S-Curve)';
        if (entry.dataKey === 'actualCumulative') name = 'Wydatki rzeczywiste';
        if (entry.dataKey === 'projectedCumulative') name = 'Prognoza wydatków';

        return (
          <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {name}:
            </span>
            <span className="font-mono font-bold text-white">
              {entry.value.toLocaleString('pl-PL')} zł
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const BudgetBurnupChart: React.FC<BudgetBurnupChartProps> = ({ project }) => {
  const analysis = useMemo(() => {
    return calculateBudgetBurnup(project);
  }, [project]);

  const getStatusBadge = (status: BudgetHealthStatus) => {
    switch (status) {
      case 'under_budget':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: 'Dyscyplina budżetowa',
          bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
        };
      case 'on_track':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
          label: 'Zgodnie z planem',
          bg: 'bg-teal-950/60 border-teal-500/40 text-teal-300',
        };
      case 'using_reserve':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'W rezerwie finansowej',
          bg: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
        };
      case 'budget_exceeded':
        return {
          icon: <Flame className="w-4 h-4 text-rose-400" />,
          label: 'Przekroczenie budżetu',
          bg: 'bg-rose-950/60 border-rose-500/40 text-rose-300',
        };
    }
  };

  const statusBadge = getStatusBadge(analysis.budgetStatus);

  return (
    <div className="space-y-6">
      {/* Financial Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Kondycja Budżetu</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusBadge.bg}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {analysis.statusMessage}
          </p>
        </div>

        {/* CPI Index */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Wskaźnik CPI (Efektywność)</span>
            {analysis.cpi >= 1 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                analysis.cpi >= 1 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {analysis.cpi.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400">
              {analysis.cpi >= 1 ? '1 zł = zysk' : '1 zł = deficyt'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {analysis.cpi >= 1
              ? 'Wydajesz mniej niż zakładano w harmonogramie'
              : 'Wydatki rosną szybciej niż postęp prac'}
          </p>
        </div>

        {/* Forecast EAC */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Prognoza Końcowa (EAC)</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {analysis.estimatedAtCompletion.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] flex items-center gap-1.5">
            <span className="text-slate-400">Względem budżetu:</span>
            <strong
              className={`font-mono font-semibold ${
                analysis.estimatedVarianceAtCompletion >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {analysis.estimatedVarianceAtCompletion >= 0 ? '+' : ''}
              {analysis.estimatedVarianceAtCompletion.toLocaleString('pl-PL')} zł
            </strong>
          </div>
        </div>

        {/* Weekly Burn-Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Średni Burn-Rate</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {analysis.averageWeeklyBurn.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-slate-400">PLN/tydz</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Pozostało ok. <strong className="text-slate-200">{analysis.weeksRemaining} tyg.</strong> prac
          </p>
        </div>
      </div>

      {/* Main Burn-up Chart Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Wykres Spalania Budżetu & Krzywa S-Curve</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Porównanie planowanego tempa prac w harmonogramie z rzeczywistymi wydatkami i prognozą
            </p>
          </div>

          {/* Chart Legend Badges */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
              <span className="text-slate-300">Plan (S-Curve)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded-full" />
              <span className="text-slate-300 font-semibold">Rzeczywiste wydatki</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-purple-400 border-b border-dashed border-purple-400" />
              <span className="text-purple-300">Prognoza EAC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed border-amber-400" />
              <span className="text-amber-300">Rezerwa ({project.contingencyReservePercent}%)</span>
            </div>
          </div>
        </div>

        {/* Recharts Composed Graphic */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={analysis.points}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference line for baseline budget */}
              <ReferenceLine
                y={analysis.totalPlannedBudget}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: `Budżet: ${analysis.totalPlannedBudget / 1000}k`,
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Reference line for contingency reserve */}
              <ReferenceLine
                y={analysis.contingencyBudgetTotal}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `Limit z rezerwą: ${Math.round(analysis.contingencyBudgetTotal / 1000)}k`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Planned cumulative area / line (S-Curve) */}
              <Area
                type="monotone"
                dataKey="plannedCumulative"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#plannedGradient)"
                name="Plan (S-Curve)"
              />

              {/* Projected line in future */}
              <Line
                type="monotone"
                dataKey="projectedCumulative"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="Prognoza wydatków"
              />

              {/* Actual cumulative spend line */}
              <Line
                type="monotone"
                dataKey="actualCumulative"
                stroke={analysis.budgetStatus === 'budget_exceeded' ? '#f43f5e' : '#10b981'}
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#34d399' }}
                name="Wydatki rzeczywiste"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Practical Polish Construction Tips Box */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-300">
          <HelpCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-200">Jak czytać ten wykres?</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Krzywa S-Curve (niebieska)</strong> ilustruje naturalny cykl budowlany: wolniejszy start (rozbiórki), szybki przyrost kosztów w fazie instalacji i glazurnictwa, oraz wygasanie przy odbiorach końcowych. Jeśli <strong>linia zielona (wydatki rzeczywiste)</strong> biegnie poniżej niebieskiej, inwestycja przebiega oszczędnie. Jeśli unosi się ponad nią, wykorzystywana jest rezerwa inwestycyjna.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
