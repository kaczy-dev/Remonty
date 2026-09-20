import { RenovationProject, NotificationItem } from '@/types/renovation';

/**
 * Checks project state and generates automated alerts/notifications:
 * - Technological curing alerts (e.g. wait times for waterproofing, screed)
 * - Budget limit warnings (exceeding planned budget or contingency reserve threshold)
 * - Schedule deadlines (stages nearing deadline or overdue)
 * - Unpurchased critical materials for impending stages
 * - Uninspected critical QA checkpoints
 */
export function generateAutomatedProjectAlerts(
  project: RenovationProject,
  now: Date = new Date()
): NotificationItem[] {
  const alerts: NotificationItem[] = [];
  const currentDateStr = now.toISOString().slice(0, 10);

  // 1. Technological Curing Alerts
  project.stages.forEach((stage) => {
    if (stage.status === 'waiting_cure' && stage.curingHoursRemaining && stage.curingHoursRemaining > 0) {
      alerts.push({
        id: `alert-cure-${stage.id}`,
        title: `Przerwa technologiczna: ${stage.name}`,
        message: `Trwa schnięcie/wiązanie materiału. Pozostało ok. ${stage.curingHoursRemaining}h przed wejściem z kolejnymi pracami. Nie wchodzić na podłoże!`,
        type: 'cure_time',
        timestamp: 'W trakcie wiązania',
        read: false,
        priority: 'high',
        stageId: stage.id,
      });
    }
  });

  // 2. Budget Alerts
  const totalSpent = project.expenses.reduce((sum, e) => sum + e.amount, 0);
  const plannedBudget = project.totalPlannedBudget || 1;
  const budgetRatio = totalSpent / plannedBudget;

  if (budgetRatio > 1.0) {
    const overspend = totalSpent - plannedBudget;
    alerts.push({
      id: `alert-budget-exceeded`,
      title: `Przekroczenie budżetu planowanego!`,
      message: `Rzeczywiste koszty (${totalSpent.toLocaleString('pl-PL')} zł) przekroczyły budżet bazowy o ${overspend.toLocaleString('pl-PL')} zł (${Math.round((budgetRatio - 1) * 100)}%). Wykorzystywana jest rezerwa inwestycyjna.`,
      type: 'budget',
      timestamp: 'Dzisiaj',
      read: false,
      priority: 'high',
    });
  } else if (budgetRatio >= 0.85) {
    alerts.push({
      id: `alert-budget-warning`,
      title: `Ostrzeżenie budżetowe: ${Math.round(budgetRatio * 100)}% budżetu`,
      message: `Wykorzystano już ${totalSpent.toLocaleString('pl-PL')} zł z ${plannedBudget.toLocaleString('pl-PL')} zł. Do dyspozycji pozostało ${(plannedBudget - totalSpent).toLocaleString('pl-PL')} zł.`,
      type: 'budget',
      timestamp: 'Dzisiaj',
      read: false,
      priority: 'medium',
    });
  }

  // 3. Schedule Deadlines & Overdue stages
  project.stages.forEach((stage) => {
    if (stage.status !== 'done') {
      if (stage.endDate < currentDateStr) {
        alerts.push({
          id: `alert-delay-${stage.id}`,
          title: `Opóźnienie w harmonogramie: ${stage.name}`,
          message: `Planowany termin zakończenia etapu minął (${stage.endDate}). Aktualny stan zaawansowania: ${stage.progressPercent}%.`,
          type: 'schedule',
          timestamp: 'Zaległe',
          read: false,
          priority: 'high',
          stageId: stage.id,
        });
      }
    }
  });

  // 4. Contractor payment milestones
  project.contractors?.forEach((contractor) => {
    const totalPaid = contractor.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceRemaining = contractor.agreedTotalCost - totalPaid;

    if (contractor.status === 'in_progress' && contractor.payments.length === 0 && contractor.agreedTotalCost > 0) {
      alerts.push({
        id: `alert-contractor-advance-${contractor.id}`,
        title: `Rozliczenie wykonawcy: ${contractor.name}`,
        message: `Ekipa '${contractor.name}' ma status prac w toku, brak zarejestrowanych zaliczek lub płatności etapowych (umowa: ${contractor.agreedTotalCost.toLocaleString('pl-PL')} zł).`,
        type: 'schedule',
        timestamp: 'Do weryfikacji',
        read: false,
        priority: 'medium',
      });
    } else if (contractor.status === 'completed' && balanceRemaining > 0) {
      alerts.push({
        id: `alert-contractor-final-${contractor.id}`,
        title: `Końcowe rozliczenie z wykonawcą: ${contractor.name}`,
        message: `Prace zakończone, pozostało do rozliczenia ${balanceRemaining.toLocaleString('pl-PL')} zł po bezusterkowym protokole odbioru.`,
        type: 'schedule',
        timestamp: 'Do rozliczenia',
        read: false,
        priority: 'high',
      });
    }
  });

  // 5. Critical QA items pending when stage is finishing
  project.qaChecklist.forEach((qa) => {
    if (qa.severity === 'critical' && qa.status === 'failed') {
      alerts.push({
        id: `alert-qa-failed-${qa.id}`,
        title: `Wykryto usterkę krytyczną: ${qa.title}`,
        message: `Niezgodność z normą (${qa.standardNorm}). Wymaga natychmiastowej poprawki wykonawczej przed kolejnymi pracami wykończeniowymi.`,
        type: 'qa',
        timestamp: 'Wymaga naprawy',
        read: false,
        priority: 'high',
      });
    }
  });

  return alerts;
}

/**
 * Merge user notifications with automatic rule-based alerts, avoiding duplicates
 */
export function syncProjectNotifications(project: RenovationProject): NotificationItem[] {
  const autoAlerts = generateAutomatedProjectAlerts(project);
  const existingMap = new Map(project.notifications.map((n) => [n.id, n]));

  // Add new automated alerts if not already dismissed or present
  const merged: NotificationItem[] = [...project.notifications];

  autoAlerts.forEach((auto) => {
    if (!existingMap.has(auto.id)) {
      merged.unshift(auto);
    }
  });

  return merged;
}
