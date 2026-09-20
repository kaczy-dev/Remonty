import { RenovationProject, MaterialCalculation, Expense, Room, Contractor } from '@/types/renovation';

export interface ReportConfig {
  roomId?: string; // 'all' or specific room ID
  includeSummary: boolean;
  includeMaterials: boolean;
  includeLabor: boolean;
  includeContractors: boolean;
  includeGantt: boolean;
  includeExpenses: boolean;
  includeQAChecklist: boolean;
  contractorName?: string;
  investorName?: string;
}

export interface ReportSummaryData {
  projectName: string;
  projectAddress: string;
  generatedDate: string;
  roomsCount: number;
  totalFloorArea: number;
  totalWallArea: number;
  totalVolume: number;
  totalPerimeter: number;
  totalPlannedBudget: number;
  contingencyReservePercent: number;
  contingencyAmount: number;
  totalMaterialsEstimated: number;
  totalLaborEstimated: number;
  totalContractorsAgreed: number;
  totalSpentActual: number;
  remainingBudget: number;
  materialsCount: number;
  expensesCount: number;
  qaItemsCount: number;
  qaPassedCount: number;
  contractorsCount: number;
}

/**
 * Calculates aggregated project metrics for reports
 */
export function getReportSummaryData(project: RenovationProject, selectedRoomId?: string): ReportSummaryData {
  const roomsToInclude = selectedRoomId && selectedRoomId !== 'all'
    ? project.rooms.filter((r) => r.id === selectedRoomId)
    : project.rooms;

  const totalFloorArea = roomsToInclude.reduce((sum, r) => sum + r.area, 0);
  const totalWallArea = roomsToInclude.reduce((sum, r) => sum + r.wallArea, 0);
  const totalVolume = roomsToInclude.reduce((sum, r) => sum + (r.area * r.height), 0);
  const totalPerimeter = roomsToInclude.reduce((sum, r) => sum + (r.perimeter || 0), 0);

  const materialsToInclude = selectedRoomId && selectedRoomId !== 'all'
    ? project.materials.filter((m) => m.roomId === selectedRoomId)
    : project.materials;

  const expensesToInclude = selectedRoomId && selectedRoomId !== 'all'
    ? project.expenses.filter((e) => e.roomId === selectedRoomId)
    : project.expenses;

  const stagesToInclude = selectedRoomId && selectedRoomId !== 'all'
    ? project.stages.filter((s) => s.roomId === selectedRoomId)
    : project.stages;

  const qaToInclude = selectedRoomId && selectedRoomId !== 'all'
    ? project.qaChecklist.filter((q) => q.roomId === selectedRoomId)
    : project.qaChecklist;

  const totalMaterialsEstimated = materialsToInclude.reduce((sum, m) => sum + m.totalPrice, 0);
  const totalLaborEstimated = stagesToInclude.reduce((sum, s) => sum + s.contractorCostEstimate, 0);
  const totalContractorsAgreed = (project.contractors || []).reduce((sum, c) => sum + c.agreedTotalCost, 0);
  const totalSpentActual = expensesToInclude.reduce((sum, e) => sum + e.amount, 0);

  const contingencyAmount = Math.round((project.totalPlannedBudget * project.contingencyReservePercent) / 100);
  const remainingBudget = project.totalPlannedBudget - totalSpentActual;

  const qaPassedCount = qaToInclude.filter((q) => q.status === 'passed').length;

  return {
    projectName: project.title,
    projectAddress: project.address,
    generatedDate: new Date().toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    roomsCount: roomsToInclude.length,
    totalFloorArea: Number(totalFloorArea.toFixed(2)),
    totalWallArea: Number(totalWallArea.toFixed(2)),
    totalVolume: Number(totalVolume.toFixed(2)),
    totalPerimeter: Number(totalPerimeter.toFixed(2)),
    totalPlannedBudget: project.totalPlannedBudget,
    contingencyReservePercent: project.contingencyReservePercent,
    contingencyAmount,
    totalMaterialsEstimated: Number(totalMaterialsEstimated.toFixed(2)),
    totalLaborEstimated: Number(totalLaborEstimated.toFixed(2)),
    totalContractorsAgreed: Number(totalContractorsAgreed.toFixed(2)),
    totalSpentActual: Number(totalSpentActual.toFixed(2)),
    remainingBudget: Number(remainingBudget.toFixed(2)),
    materialsCount: materialsToInclude.length,
    expensesCount: expensesToInclude.length,
    qaItemsCount: qaToInclude.length,
    qaPassedCount,
    contractorsCount: (project.contractors || []).length,
  };
}

/**
 * Generates an Excel-friendly CSV with Polish UTF-8 BOM (\uFEFF) for materials
 */
export function generateMaterialsCSV(materials: MaterialCalculation[], rooms: Room[]): string {
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  const headers = [
    'Lp.',
    'Pomieszczenie',
    'Nazwa Materiału',
    'Kategoria',
    'Ilość Netto',
    'Zapas %',
    'Ilość z Naddatkiem',
    'Jednostka',
    'Cena Jedn. Szac. (PLN)',
    'Wartość Całkowita (PLN)',
    'Zakupiono',
    'Wzór / Uzasadnienie Naddatku',
  ];

  const rows = materials.map((m, idx) => [
    idx + 1,
    `"${(roomMap.get(m.roomId) || 'Ogólne').replace(/"/g, '""')}"`,
    `"${m.name.replace(/"/g, '""')}"`,
    `"${m.category.replace(/"/g, '""')}"`,
    m.baseQuantity.toFixed(2).replace('.', ','),
    `${m.wasteMarginPercent}%`,
    m.finalQuantity.toFixed(2).replace('.', ','),
    `"${m.unit}"`,
    m.estimatedUnitPrice.toFixed(2).replace('.', ','),
    m.totalPrice.toFixed(2).replace('.', ','),
    m.purchased ? 'TAK' : 'NIE',
    `"${(m.formulaExplanation || '').replace(/"/g, '""')}"`,
  ]);

  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

/**
 * Generates an Excel-friendly CSV for actual expenses register
 */
export function generateExpensesCSV(expenses: Expense[], rooms: Room[]): string {
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  const headers = [
    'Lp.',
    'Data',
    'Tytuł Wydatku',
    'Kategoria',
    'Pomieszczenie',
    'Kwota (PLN)',
    'Forma Płatności',
    'Opłacone',
    'Notatka / Nr Paragonu',
  ];

  const rows = expenses.map((e, idx) => [
    idx + 1,
    e.date,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${e.category.replace(/"/g, '""')}"`,
    `"${(e.roomId ? (roomMap.get(e.roomId) || e.roomId) : 'Ogólne').replace(/"/g, '""')}"`,
    e.amount.toFixed(2).replace('.', ','),
    `"${e.paymentMethod}"`,
    e.paid ? 'TAK' : 'NIE',
    `"${(e.receiptNote || '').replace(/"/g, '""')}"`,
  ]);

  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

/**
 * Generates an Excel-friendly CSV for contractors register and settlements
 */
export function generateContractorsCSV(contractors: Contractor[]): string {
  const headers = [
    'Lp.',
    'Wykonawca / Nazwa',
    'Firma / NIP',
    'Branża',
    'Telefon',
    'Status',
    'Umówiona Kwota (PLN)',
    'Wypłacone Łącznie (PLN)',
    'Pozostało do Zapłaty (PLN)',
    'Liczba Płatności',
  ];

  const rows = (contractors || []).map((c, idx) => {
    const totalPaid = (c.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, c.agreedTotalCost - totalPaid);

    return [
      idx + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.companyName || c.nip || 'Osoba fizyczna').replace(/"/g, '""')}"`,
      `"${c.trade}"`,
      `"${c.phone}"`,
      `"${c.status}"`,
      c.agreedTotalCost.toFixed(2).replace('.', ','),
      totalPaid.toFixed(2).replace('.', ','),
      balance.toFixed(2).replace('.', ','),
      (c.payments || []).length,
    ];
  });

  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

/**
 * Generates a full master cost estimate CSV combining materials, labor, contractors, and budget summary
 */
export function generateFullCostEstimateCSV(project: RenovationProject): string {
  const summary = getReportSummaryData(project);
  const roomMap = new Map(project.rooms.map((r) => [r.id, r.name]));

  const lines: string[] = [
    `KOSZTORYS INWESTORSKI I WYKONAWCZY - RENOWACJE U KACZAKA`,
    `Inwestycja:;${project.title}`,
    `Adres:;${project.address}`,
    `Data wygenerowania:;${summary.generatedDate}`,
    `Całkowity metraż posadzek:;${summary.totalFloorArea.toString().replace('.', ',')} m²`,
    `Całkowita powierzchnia ścian:;${summary.totalWallArea.toString().replace('.', ',')} m²`,
    `Budżet planowany:;${summary.totalPlannedBudget.toFixed(2).replace('.', ',')} PLN`,
    `Rezerwa bezpieczeństwa (${summary.contingencyReservePercent}%):;${summary.contingencyAmount.toFixed(2).replace('.', ',')} PLN`,
    `Suma szacowana materiałów:;${summary.totalMaterialsEstimated.toFixed(2).replace('.', ',')} PLN`,
    `Suma szacowana robocizny:;${summary.totalLaborEstimated.toFixed(2).replace('.', ',')} PLN`,
    `Suma umów z wykonawcami:;${summary.totalContractorsAgreed.toFixed(2).replace('.', ',')} PLN`,
    `Rzeczywiste wydatki poniesione:;${summary.totalSpentActual.toFixed(2).replace('.', ',')} PLN`,
    `Pozostały budżet:;${summary.remainingBudget.toFixed(2).replace('.', ',')} PLN`,
    ``,
    `--- 1. ZESTAWIENIE MATERIAŁÓW I NADDATKÓW TECHNOLOGICZNYCH ---`,
    `Lp.;Pomieszczenie;Nazwa Materiału;Kategoria;Ilość z naddatkiem;Jednostka;Cena jedn. PLN;Wartość PLN;Kupione`,
  ];

  project.materials.forEach((m, idx) => {
    lines.push([
      idx + 1,
      `"${(roomMap.get(m.roomId) || 'Ogólne').replace(/"/g, '""')}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.category.replace(/"/g, '""')}"`,
      m.finalQuantity.toFixed(2).replace('.', ','),
      `"${m.unit}"`,
      m.estimatedUnitPrice.toFixed(2).replace('.', ','),
      m.totalPrice.toFixed(2).replace('.', ','),
      m.purchased ? 'TAK' : 'NIE',
    ].join(';'));
  });

  lines.push('');
  lines.push('--- 2. SZACUNEK ROBOCIZNY I ETAPÓW PRAC ---');
  lines.push('Lp.;Nazwa Etapu;Kategoria;Status;Ekipa szac. PLN;DIY szac. PLN;Postęp %');

  project.stages.forEach((s, idx) => {
    lines.push([
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.category.replace(/"/g, '""')}"`,
      `"${s.status.replace(/"/g, '""')}"`,
      s.contractorCostEstimate.toFixed(2).replace('.', ','),
      s.diyCostEstimate.toFixed(2).replace('.', ','),
      `${s.progressPercent}%`,
    ].join(';'));
  });

  if (project.contractors && project.contractors.length > 0) {
    lines.push('');
    lines.push('--- 3. REJESTR WYKONAWCÓW I PŁATNOŚCI ---');
    lines.push('Lp.;Wykonawca;Branża;Status;Kwota Umowna PLN;Wypłacono PLN;Pozostało PLN');
    project.contractors.forEach((c, idx) => {
      const totalPaid = (c.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, c.agreedTotalCost - totalPaid);
      lines.push([
        idx + 1,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.trade}"`,
        `"${c.status}"`,
        c.agreedTotalCost.toFixed(2).replace('.', ','),
        totalPaid.toFixed(2).replace('.', ','),
        remaining.toFixed(2).replace('.', ','),
      ].join(';'));
    });
  }

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Triggers file download in browser
 */
export function downloadFile(content: string, fileName: string, mimeType: string = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
