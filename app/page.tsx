'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RenovationProject, 
  RenovationPipelineStep, 
  Room, 
  Expense, 
  MaterialCalculation, 
  QAChecklistItem,
  NotificationItem,
  RoomFurniture,
  RoomOutlet,
  RoomWorkStage,
  StageStatus
} from '@/types/renovation';
import { loadProjectFromStorage, saveProjectToStorage } from '@/lib/storage';
import { DEFAULT_RENOVATION_PROJECT } from '@/lib/default-data';
import { getRoomWorkStages } from '@/lib/progress-helper';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Header } from '@/components/Header';
import { WorkflowPipeline } from '@/components/WorkflowPipeline';
import { OfflineIndicator } from '@/components/PWAInstallButton';
import { ViewRoomScanMeasure } from '@/components/ViewRoomScanMeasure';
import { ViewDesignMaterials } from '@/components/ViewDesignMaterials';
import { ViewBudgetExpenses } from '@/components/ViewBudgetExpenses';
import { ViewScheduleTimeline } from '@/components/ViewScheduleTimeline';
import { ViewProgressQA } from '@/components/ViewProgressQA';
import { ViewRenovationProgress } from '@/components/ViewRenovationProgress';
import { ProjectProgressIndicator } from '@/components/ProjectProgressIndicator';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { AIExpertModal } from '@/components/AIExpertModal';
import { E2EEVaultModal } from '@/components/E2EEVaultModal';
import { AddRoomModal } from '@/components/AddRoomModal';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { Sparkles, Bot, AlertCircle, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [project, setProject] = useState<RenovationProject>(DEFAULT_RENOVATION_PROJECT);
  const [activePipelineStep, setActivePipelineStep] = useState<RenovationPipelineStep>('measure');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrefilledPrompt, setAiPrefilledPrompt] = useState<string>('');
  const [isE2EEModalOpen, setIsE2EEModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

  const isOnline = useOnlineStatus();

  // Safely hydrate stored project and theme on client without SSR mismatch
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = loadProjectFromStorage();
      if (stored && stored.id) {
        setProject(stored);
      }
      const savedTheme = localStorage.getItem('renovai_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('theme-light', savedTheme === 'light');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('renovai_theme', next);
      document.documentElement.classList.toggle('theme-light', next === 'light');
      return next;
    });
  };

  // Save to storage helper
  const updateProject = (newProject: RenovationProject) => {
    setProject(newProject);
    saveProjectToStorage(newProject);
  };

  const currentRoom = project.rooms.find((r) => r.id === project.selectedRoomId) || project.rooms[0];

  // Room selection handler
  const handleSelectRoom = (roomId: string) => {
    updateProject({
      ...project,
      selectedRoomId: roomId,
    });
  };

  // Update room dimensions
  const handleUpdateRoomDimensions = (roomId: string, width: number, length: number, height: number) => {
    const area = width * length;
    const perimeter = 2 * (width + length);
    const wallArea = Math.max(0, perimeter * height - 3.2);

    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        width,
        length,
        height,
        area,
        perimeter,
        wallArea,
      };
    });

    updateProject({
      ...project,
      rooms: updatedRooms,
    });
  };

  // Add furniture
  const handleAddFurniture = (roomId: string, furniture: RoomFurniture) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture: [...r.furniture, furniture],
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  };

  // Update furniture collection (for drag-and-drop & rotation)
  const handleUpdateFurniture = (roomId: string, furniture: RoomFurniture[]) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture,
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  };

  // Delete furniture
  const handleDeleteFurniture = (roomId: string, furnitureId: string) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture: r.furniture.filter((f) => f.id !== furnitureId),
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  };

  // Add outlet
  const handleAddOutlet = (roomId: string, outlet: RoomOutlet) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        outlets: [...r.outlets, outlet],
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  };

  // Update design
  const handleUpdateRoomDesign = (roomId: string, design: Room['design']) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, design };
    });
    updateProject({ ...project, rooms: updatedRooms });
  };

  // Expenses handlers
  const handleAddExpense = (expense: Expense) => {
    updateProject({
      ...project,
      expenses: [expense, ...project.expenses],
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateProject({
      ...project,
      expenses: project.expenses.filter((e) => e.id !== expenseId),
    });
  };

  const handleToggleExpensePaid = (expenseId: string) => {
    updateProject({
      ...project,
      expenses: project.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        return { ...e, paid: !e.paid };
      }),
    });
  };

  // Materials handlers
  const handleToggleMaterialPurchased = (materialId: string) => {
    updateProject({
      ...project,
      materials: project.materials.map((m) => {
        if (m.id !== materialId) return m;
        return { ...m, purchased: !m.purchased };
      }),
    });
  };

  const handleAddMaterial = (material: MaterialCalculation) => {
    updateProject({
      ...project,
      materials: [...project.materials, material],
    });
  };

  // Schedule & Tasks handlers
  const handleUpdateStageProgress = (stageId: string, progress: number) => {
    updateProject({
      ...project,
      stages: project.stages.map((s) => {
        if (s.id !== stageId) return s;
        const status = progress === 100 ? 'done' : progress > 0 ? 'in_progress' : s.status;
        return { ...s, progressPercent: progress, status };
      }),
    });
  };

  const handleToggleTaskComplete = (stageId: string, taskId: string) => {
    updateProject({
      ...project,
      stages: project.stages.map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return { ...t, completed: !t.completed };
          }),
        };
      }),
    });
  };

  // Notifications handlers
  const handleAddNotification = (notification: NotificationItem) => {
    updateProject({
      ...project,
      notifications: [notification, ...project.notifications],
    });
  };

  const handleDismissNotification = (notificationId: string) => {
    updateProject({
      ...project,
      notifications: project.notifications.filter((n) => n.id !== notificationId),
    });
  };

  // QA Checklists
  const handleUpdateQAStatus = (qaId: string, status: QAChecklistItem['status']) => {
    updateProject({
      ...project,
      qaChecklist: project.qaChecklist.map((q) => {
        if (q.id !== qaId) return q;
        return { ...q, status };
      }),
    });
  };

  // Room Work Stages Handlers for Progress Tracking
  const handleUpdateRoomStages = (roomId: string, stages: RoomWorkStage[]) => {
    const isCompleted = stages.length > 0 && stages.every((s) => s.completed || s.status === 'done');
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        workStages: stages,
        isCompleted,
      };
    });
    updateProject({
      ...project,
      rooms: updatedRooms,
    });
  };

  const handleToggleRoomCompleted = (roomId: string, completed: boolean) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const currentStages = getRoomWorkStages(r);
      const updatedStages = currentStages.map((st) => ({
        ...st,
        completed,
        status: (completed ? 'done' : 'in_progress') as StageStatus,
        completedAt: completed ? (st.completedAt || new Date().toISOString().slice(0, 10)) : undefined,
      }));
      return {
        ...r,
        isCompleted: completed,
        workStages: updatedStages,
      };
    });
    updateProject({
      ...project,
      rooms: updatedRooms,
    });
  };

  const handleQuickToggleStage = (roomId: string, stageId: string) => {
    const targetRoom = project.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    const stages = getRoomWorkStages(targetRoom);
    const updatedStages = stages.map((st) => {
      if (st.id !== stageId) return st;
      const willBeCompleted = !st.completed;
      return {
        ...st,
        completed: willBeCompleted,
        status: (willBeCompleted ? 'done' : 'in_progress') as StageStatus,
        completedAt: willBeCompleted ? new Date().toISOString().slice(0, 10) : undefined,
      };
    });
    handleUpdateRoomStages(roomId, updatedStages);
  };

  // Add Room
  const handleAddRoom = (newRoom: Room) => {
    updateProject({
      ...project,
      rooms: [...project.rooms, newRoom],
      selectedRoomId: newRoom.id,
    });
  };

  // Step Switch routing logic
  const renderStepContent = () => {
    switch (activePipelineStep) {
      case 'photo_scan':
      case 'measure':
        return (
          <ViewRoomScanMeasure
            room={currentRoom}
            onUpdateRoomDimensions={handleUpdateRoomDimensions}
            onAddFurniture={handleAddFurniture}
            onUpdateFurniture={handleUpdateFurniture}
            onDeleteFurniture={handleDeleteFurniture}
            onAddOutlet={handleAddOutlet}
            onUpdateRoomDesign={handleUpdateRoomDesign}
            onNavigateToStep={(s) => setActivePipelineStep(s as RenovationPipelineStep)}
          />
        );

      case 'analyze':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-teal-500/40 bg-slate-900/90 p-6 text-center space-y-4 shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 mx-auto border border-teal-500/30">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-xl mx-auto">
                <h3 className="text-lg font-bold text-white">
                  Diagnostyka Inżynieryjna AI dla: {currentRoom.name}
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  System RenovAI przeanalizował geometrię ({currentRoom.area.toFixed(2)} m²), grubość ścian oraz instalacje. Wykryto 4 newralgiczne punkty technologiczne.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto pt-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs font-bold text-teal-400 uppercase">Strefa Mokra Walk-in</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Wymaga podwójnej hydroizolacji 2-składnikowej z wywinięciem na ścianę min. 200 cm i spadku posadzki 2%.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs font-bold text-amber-400 uppercase">Pion Kanalizacyjny</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Zabudowa g-k o podwyższonej odporności na wilgoć (płyta zielona GKBI) z rewizją magnetyczną.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs font-bold text-cyan-400 uppercase">Wentylacja Grawitacyjna</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Zakaz montażu wentylatora mechanicznego przy podłączeniu do zbiorczego kanału spalinowego.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500 transition"
                >
                  <Bot className="w-4 h-4" />
                  <span>Rozpocznij Konsultację z Inżynierem AI</span>
                </button>
                <button
                  onClick={() => setActivePipelineStep('design')}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  Przejdź do Projektu (DESIGN) →
                </button>
              </div>
            </div>

            {/* Also show scanned elements */}
            <ViewRoomScanMeasure
              room={currentRoom}
              onUpdateRoomDimensions={handleUpdateRoomDimensions}
              onAddFurniture={handleAddFurniture}
              onUpdateFurniture={handleUpdateFurniture}
              onDeleteFurniture={handleDeleteFurniture}
              onAddOutlet={handleAddOutlet}
            />
          </div>
        );

      case 'design':
      case 'materials':
      case 'shopping':
        return (
          <ViewDesignMaterials
            room={currentRoom}
            materials={project.materials}
            onToggleMaterialPurchased={handleToggleMaterialPurchased}
            onAddMaterial={handleAddMaterial}
            onUpdateRoomDesign={handleUpdateRoomDesign}
            onUpdateFurniture={handleUpdateFurniture}
            onConsultAI={(prompt) => {
              setAiPrefilledPrompt(prompt);
              setIsAIModalOpen(true);
            }}
          />
        );

      case 'cost':
        return (
          <ViewBudgetExpenses
            project={project}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleExpensePaid={handleToggleExpensePaid}
            onOpenAddModal={() => setIsExpenseModalOpen(true)}
          />
        );

      case 'plan':
      case 'execution':
        return (
          <ViewScheduleTimeline
            project={project}
            onUpdateStageProgress={handleUpdateStageProgress}
            onToggleTaskComplete={handleToggleTaskComplete}
            onAddNotification={handleAddNotification}
            onDismissNotification={handleDismissNotification}
          />
        );

      case 'progress':
        return (
          <ViewRenovationProgress
            rooms={project.rooms}
            selectedRoomId={project.selectedRoomId}
            onSelectRoom={handleSelectRoom}
            onUpdateRoomStages={handleUpdateRoomStages}
            onToggleRoomCompleted={handleToggleRoomCompleted}
            onConsultAI={(prompt) => {
              setAiPrefilledPrompt(prompt);
              setIsAIModalOpen(true);
            }}
            onNavigateToStep={(s) => setActivePipelineStep(s as RenovationPipelineStep)}
          />
        );

      case 'qa':
      case 'before_after':
        return (
          <ViewProgressQA
            room={currentRoom}
            qaItems={project.qaChecklist}
            onUpdateQAStatus={handleUpdateQAStatus}
            onAddQACheck={(item) => {
              updateProject({
                ...project,
                qaChecklist: [...project.qaChecklist, item],
              });
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-teal-500/30 transition-colors duration-200 ${
      theme === 'light' ? 'theme-light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Offline Status Warning Bar if offline */}
      <OfflineIndicator />

      {/* Main Top App Header */}
      <Header
        project={project}
        isOnline={isOnline}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSelectRoom={handleSelectRoom}
        onOpenAddExpense={() => setIsExpenseModalOpen(true)}
        onOpenNotifications={() => setActivePipelineStep('plan')}
        onOpenE2EEModal={() => setIsE2EEModalOpen(true)}
        onOpenAddRoomModal={() => setIsAddRoomModalOpen(true)}
        unreadNotificationsCount={project.notifications.filter((n) => !n.read).length}
      />

      {/* 12-Step Renovation Pipeline Navigator */}
      <WorkflowPipeline
        activeStep={activePipelineStep}
        onSelectStep={(step) => setActivePipelineStep(step)}
      />

      {/* Core Dynamic Content Area with Step Transitions */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Visual Renovation Progress Indicator Banner on Main Screen */}
        {activePipelineStep !== 'progress' && (
          <ProjectProgressIndicator
            rooms={project.rooms}
            selectedRoomId={project.selectedRoomId}
            onSelectRoom={handleSelectRoom}
            onOpenProgressPage={() => setActivePipelineStep('progress')}
            onToggleStage={handleQuickToggleStage}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activePipelineStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>RenovAI</strong> • Lokalny, privacy-first asystent projektowania i remontu mieszkania
          </span>
          <span className="font-mono text-[11px] text-slate-600">
            Wszystkie dane szyfrowane lokalnie (Web Crypto API) • Offline Ready PWA
          </span>
        </div>
      </footer>

      {/* Floating Action Button for AI Engineering Assistant with Draggable Handle & Quick Actions */}
      <FloatingAIAssistant
        currentRoom={currentRoom}
        currentStep={activePipelineStep}
        project={project}
        onOpenFullModal={(prompt) => {
          if (prompt) setAiPrefilledPrompt(prompt);
          setIsAIModalOpen(true);
        }}
      />

      {/* Modals */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
        rooms={project.rooms}
        currentRoomId={project.selectedRoomId}
      />

      <AIExpertModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        currentRoom={currentRoom}
        currentStep={activePipelineStep}
        initialPrompt={aiPrefilledPrompt}
      />

      <E2EEVaultModal
        isOpen={isE2EEModalOpen}
        onClose={() => setIsE2EEModalOpen(false)}
        project={project}
        onRestoreProject={(p) => setProject(p)}
      />

      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onAddRoom={handleAddRoom}
      />

    </div>
  );
}
