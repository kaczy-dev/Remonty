'use client';

import React, { useState } from 'react';
import { RenovationStage, NotificationItem, RenovationProject } from '@/types/renovation';
import { 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Hammer, 
  Wrench, 
  Sparkles, 
  Plus, 
  ShieldAlert, 
  ChevronRight,
  Flame
} from 'lucide-react';

interface ViewScheduleTimelineProps {
  project: RenovationProject;
  onUpdateStageProgress: (stageId: string, progress: number) => void;
  onToggleTaskComplete: (stageId: string, taskId: string) => void;
  onAddNotification: (notification: NotificationItem) => void;
  onDismissNotification: (notificationId: string) => void;
}

const STAGE_STATUS_LABELS: Record<RenovationStage['status'], { label: string; color: string }> = {
  done: { label: 'Zakończony (100%)', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
  in_progress: { label: 'W trakcie realizacji', color: 'bg-teal-950/80 text-teal-300 border-teal-500/40' },
  waiting_cure: { label: 'Schnięcie technologiczne', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40' },
  planned: { label: 'Zaplanowany', color: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export const ViewScheduleTimeline: React.FC<ViewScheduleTimelineProps> = ({
  project,
  onUpdateStageProgress,
  onToggleTaskComplete,
  onAddNotification,
  onDismissNotification,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(project.stages[3]?.id || project.stages[0]?.id);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notifications'>('timeline');
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMsg, setNewNotifMsg] = useState('');
  const [newNotifPriority, setNewNotifPriority] = useState<NotificationItem['priority']>('medium');
  const [showAddNotifModal, setShowAddNotifModal] = useState(false);
  const [notifPermissionState, setNotifPermissionState] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const selectedStage = project.stages.find((s) => s.id === selectedStageId) || project.stages[0];

  const handleRequestWebNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermissionState(perm);
        if (perm === 'granted') {
          new Notification('RenovAI: Powiadomienia włączone!', {
            body: 'Będziesz otrzymywać przypomnienia o terminach dostaw i czasach schnięcia posadzek.',
            icon: '/icon.svg',
          });
        }
      } catch (err) {
        console.warn('Notification permission error', err);
      }
    }
  };

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitle.trim()) return;

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: newNotifTitle,
      message: newNotifMsg || 'Przypomnienie z harmonogramu prac.',
      type: 'schedule',
      timestamp: 'Przed chwilą',
      read: false,
      priority: newNotifPriority,
    });

    setNewNotifTitle('');
    setNewNotifMsg('');
    setShowAddNotifModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-timeline-gantt-btn"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'timeline'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Harmonogram i Etapy Gantta</span>
            </button>
            <button
              id="tab-notifications-center-btn"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'notifications'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Centrum Powiadomień ({project.notifications.length})</span>
            </button>
          </div>
        </div>

        {/* Global Timeline Dates */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="text-slate-500 font-medium">Czas trwania inwestycji:</span>
          <span className="font-mono font-semibold text-teal-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {project.startDate} → {project.targetEndDate}
          </span>
        </div>
      </div>

      {/* Mode 1: Timeline Gantt & Technological Curing Engine */}
      {activeTab === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Chronological Gantt Bars */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-teal-400" />
                Chronologiczny Przebieg Prac Remontowych
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {project.stages.filter(s => s.status === 'done').length} / {project.stages.length} etapów ukończonych
              </span>
            </div>

            {/* Stages Stack */}
            <div className="space-y-3">
              {project.stages.map((stage, idx) => {
                const isSelected = selectedStage?.id === stage.id;
                const statusMeta = STAGE_STATUS_LABELS[stage.status];

                return (
                  <div
                    key={stage.id}
                    id={`gantt-stage-${stage.id}`}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/25 shadow-md ring-1 ring-teal-500/30'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-mono text-slate-300">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{stage.name}</h4>
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Progress Bar & Dates */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>{stage.startDate} — {stage.endDate}</span>
                        <span className="font-bold text-teal-300">{stage.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            stage.status === 'done'
                              ? 'bg-emerald-500'
                              : stage.status === 'waiting_cure'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-teal-500'
                          }`}
                          style={{ width: `${stage.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Curing alert pill if active */}
                    {stage.curingHoursRemaining && stage.curingHoursRemaining > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                        <span>Czas schnięcia: pozostało <strong>{stage.curingHoursRemaining}h</strong> do kolejnego etapu.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Stage Inspection & Sub-tasks Checklist */}
          {selectedStage && (
            <div className="lg:col-span-5 space-y-4">
              
              {/* Stage Detail Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-teal-400 uppercase tracking-wider">
                      Szczegóły Etapu
                    </span>
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                      {selectedStage.isDiy ? 'Tryb DIY (Samodzielnie)' : 'Ekipa z uprawnieniami'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedStage.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {selectedStage.description}
                  </p>
                </div>

                {/* Interactive Progress Slider */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Aktualizuj postęp prac:</span>
                    <span className="font-mono text-teal-300 font-bold">{selectedStage.progressPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={selectedStage.progressPercent}
                    onChange={(e) => onUpdateStageProgress(selectedStage.id, parseInt(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                  />
                </div>

                {/* Sub-Tasks Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Zadania Technologiczne do Odfajkowania
                  </h4>
                  <div className="space-y-1.5">
                    {selectedStage.tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950 p-2.5 text-xs text-slate-200 cursor-pointer hover:bg-slate-900/60 transition"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => onToggleTaskComplete(selectedStage.id, task.id)}
                          className="mt-0.5 rounded-sm border-slate-700 accent-teal-500 cursor-pointer"
                        />
                        <span className={`leading-relaxed ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Required Tools & PPE Safety */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-teal-400" />
                    Wymagany Sprzęt i Narzędzia:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedStage.requiredTools.map((tool, idx) => (
                      <span key={idx} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5 pt-2 border-t border-slate-800">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    BHP i Środki Ochrony:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedStage.safetyGear.map((gear, idx) => (
                      <span key={idx} className="rounded-md bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300">
                        {gear}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* Mode 2: Notifications Center */}
      {activeTab === 'notifications' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-400" />
                Alerty Budowlane, Czas Schnięcia & Przypomnienia
              </h3>
              <p className="text-xs text-slate-400">
                Powiadomienia o zbliżających się etapach, wstrzymaniu prac na schnięcie materiałów oraz dostawach.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifPermissionState !== 'granted' && (
                <button
                  onClick={handleRequestWebNotification}
                  className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-950/40 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Włącz powiadomienia Push</span>
                </button>
              )}
              <button
                onClick={() => setShowAddNotifModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nowe Przypomnienie</span>
              </button>
            </div>
          </div>

          {/* Active Notifications Stack */}
          <div className="space-y-3">
            {project.notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-xl border p-4 flex items-start justify-between gap-4 transition ${
                  notif.priority === 'high'
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    notif.priority === 'high' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-teal-500/20 text-teal-400'
                  }`}>
                    {notif.priority === 'high' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                      <span className="font-mono text-[10px] text-slate-500">{notif.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDismissNotification(notif.id)}
                  className="text-slate-500 hover:text-slate-300 text-xs shrink-0"
                >
                  Odczytano
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Add Notification Modal */}
      {showAddNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-3">Dodaj Przypomnienie w Harmonogramie</h3>
            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tytuł powiadomienia:</label>
                <input
                  type="text"
                  required
                  placeholder="np. Dostawa desek podłogowych z salonu"
                  value={newNotifTitle}
                  onChange={(e) => setNewNotifTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Treść przypomnienia / instrukcja:</label>
                <textarea
                  rows={3}
                  placeholder="np. Przygotować wózek transportowy i sprawdzić czy deski nie są uszkodzone."
                  value={newNotifMsg}
                  onChange={(e) => setNewNotifMsg(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Priorytet alertu:</label>
                <select
                  value={newNotifPriority}
                  onChange={(e) => setNewNotifPriority(e.target.value as NotificationItem['priority'])}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                >
                  <option value="low">Niski (Informacyjny)</option>
                  <option value="medium">Średni (Wymaga uwagi)</option>
                  <option value="high">Wysoki (Krytyczny / Blokujący prace)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNotifModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition"
                >
                  Zapisz Powiadomienie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
