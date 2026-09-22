'use client';

import React, { useState, useLayoutEffect, useCallback } from 'react';
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
  RoomOpening,
  RoomWorkStage,
  StageStatus,
  WorkLogEntry,
  RoomAtticRoof,
} from '@/types/renovation';
import { 
  loadOrMigrateInitialProject, 
  saveProjectToDB, 
  getAllProjectsFromDB, 
  deleteProjectFromDB,
  deletePhotoBlob 
} from '@/lib/db';
import { DEFAULT_RENOVATION_PROJECT } from '@/lib/default-data';
import { getRoomWorkStages } from '@/lib/progress-helper';
import { duplicateProject } from '@/lib/project-templates';
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
import { BackupModal } from '@/components/BackupModal';
import { AddRoomModal } from '@/components/AddRoomModal';
import { ReportGeneratorModal } from '@/components/ReportGeneratorModal';
import { ProjectSwitcherModal } from '@/components/ProjectSwitcherModal';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useToast } from '@/components/ToastProvider';
import { syncProjectNotifications } from '@/lib/notification-engine';
import {
  dispatchPendingNotifications,
  updateAppBadge,
  requestNotificationPermission,
} from '@/lib/web-notifications';

export default function HomePage() {
  const [project, setProject] = useState<RenovationProject>(() => {
    const base = structuredClone(DEFAULT_RENOVATION_PROJECT);
    return {
      ...base,
      notifications: syncProjectNotifications(base),
    };
  });
  const [allProjects, setAllProjects] = useState<RenovationProject[]>([]);
  const [activePipelineStep, setActivePipelineStep] = useState<RenovationPipelineStep>('measure');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrefilledPrompt, setAiPrefilledPrompt] = useState<string>('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [storageSaveFailed, setStorageSaveFailed] = useState(false);
  const [pushPermissionState, setPushPermissionState] = useState<string>('default');

  const { showToast } = useToast();
  const isOnline = useOnlineStatus();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermissionState(Notification.permission);
    }
  }, []);

  // Update app badge and dispatch native notifications when unread items change
  React.useEffect(() => {
    const unreadCount = project.notifications.filter((n) => !n.read).length;
    updateAppBadge(unreadCount);
    if (pushPermissionState === 'granted') {
      dispatchPendingNotifications(project.notifications);
    }
  }, [project.notifications, pushPermissionState]);

  // Safely hydrate stored project (IndexedDB, migrating legacy localStorage data if present)
  // and theme on client without SSR mismatch. useLayoutEffect + a microtask hop apply the
  // hydrated state before the browser paints, avoiding a visible demo-data flash.
  useLayoutEffect(() => {
    queueMicrotask(async () => {
      const stored = await loadOrMigrateInitialProject();
      if (stored && stored.id) {
        const withSyncedNotifs = {
          ...stored,
          notifications: syncProjectNotifications(stored),
        };
        setProject(withSyncedNotifs);
      }
      try {
        const all = await getAllProjectsFromDB();
        if (all && all.length > 0) {
          setAllProjects(all);
        } else if (stored && stored.id) {
          setAllProjects([stored]);
        }
      } catch (e) {
        console.error('Failed to load all projects from IndexedDB', e);
      }
      const savedTheme = localStorage.getItem('renovai_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('theme-light', savedTheme === 'light');
      }
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('renovai_theme', next);
      document.documentElement.classList.toggle('theme-light', next === 'light');
      return next;
    });
  }, []);

  // Save to storage helper with automated alert resynchronization
  const updateProject = useCallback((newProject: RenovationProject) => {
    // Keep automated notifications synchronized with budget, stages, curing times
    const syncedProject: RenovationProject = {
      ...newProject,
      notifications: syncProjectNotifications(newProject),
    };

    setProject(syncedProject);
    setAllProjects((prev) => {
      const exists = prev.some((p) => p.id === syncedProject.id);
      if (exists) {
        return prev.map((p) => (p.id === syncedProject.id ? syncedProject : p));
      }
      return [...prev, syncedProject];
    });
    saveProjectToDB(syncedProject)
      .then(() => setStorageSaveFailed(false))
      .catch((e) => {
        console.error('Failed to save project to IndexedDB', e);
        setStorageSaveFailed(true);
      });
  }, []);

  const handleSelectProject = useCallback((projectId: string) => {
    const target = allProjects.find((p) => p.id === projectId);
    if (target) {
      setProject(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('renovai_active_project_id', target.id);
      }
    }
  }, [allProjects]);

  const handleCreateProject = useCallback(async (newProj: RenovationProject) => {
    await saveProjectToDB(newProj);
    setAllProjects((prev) => [...prev, newProj]);
    setProject(newProj);
    if (typeof window !== 'undefined') {
      localStorage.setItem('renovai_active_project_id', newProj.id);
    }
  }, []);

  const handleDuplicateProject = useCallback(async (sourceProj: RenovationProject) => {
    const copy = duplicateProject(sourceProj);
    await saveProjectToDB(copy);
    setAllProjects((prev) => [...prev, copy]);
    setProject(copy);
    if (typeof window !== 'undefined') {
      localStorage.setItem('renovai_active_project_id', copy.id);
    }
  }, []);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (allProjects.length <= 1) return;
    await deleteProjectFromDB(projectId);
    const remaining = allProjects.filter((p) => p.id !== projectId);
    setAllProjects(remaining);
    if (project.id === projectId && remaining.length > 0) {
      setProject(remaining[0]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('renovai_active_project_id', remaining[0].id);
      }
    }
  }, [allProjects, project.id]);

  const currentRoom = project.rooms.find((r) => r.id === project.selectedRoomId) || project.rooms[0];

  // Room selection handler
  const handleSelectRoom = useCallback((roomId: string) => {
    updateProject({
      ...project,
      selectedRoomId: roomId,
    });
  }, [project, updateProject]);

  // Update room dimensions & shape
  const handleUpdateRoomDimensions = useCallback((
    roomId: string,
    width: number,
    length: number,
    height: number,
    polygonVertices?: { x: number; y: number }[]
  ) => {
    let area = Math.round(width * length * 100) / 100;
    let perimeter = Math.round(2 * (width + length) * 100) / 100;

    if (polygonVertices && polygonVertices.length >= 3) {
      let shoelace = 0;
      let polyPerimeter = 0;
      for (let i = 0; i < polygonVertices.length; i++) {
        const next = polygonVertices[(i + 1) % polygonVertices.length];
        const curr = polygonVertices[i];
        shoelace += curr.x * next.y - next.x * curr.y;
        polyPerimeter += Math.hypot(next.x - curr.x, next.y - curr.y);
      }
      area = Math.round((Math.abs(shoelace) / 2) * 100) / 100;
      perimeter = Math.round(polyPerimeter * 100) / 100;
    }

    const room = project.rooms.find((r) => r.id === roomId);
    const openingsArea = (room?.openings ?? []).reduce((sum, o) => sum + o.width * o.height, 0);
    const wallArea = Math.max(0, Math.round((perimeter * height - openingsArea) * 100) / 100);

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
        polygonVertices: polygonVertices ?? r.polygonVertices,
      };
    });

    updateProject({
      ...project,
      rooms: updatedRooms,
    });
  }, [project, updateProject]);

  // Openings management (Windows & Doors)
  const handleAddOpening = useCallback((roomId: string, opening: RoomOpening) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const newOpenings = [...(r.openings || []), opening];
      const openingsArea = newOpenings.reduce((sum, o) => sum + o.width * o.height, 0);
      const wallArea = Math.max(0, Math.round((r.perimeter * r.height - openingsArea) * 100) / 100);
      return {
        ...r,
        openings: newOpenings,
        wallArea,
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  const handleUpdateOpening = useCallback((roomId: string, opening: RoomOpening) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const newOpenings = (r.openings || []).map((o) => (o.id === opening.id ? opening : o));
      const openingsArea = newOpenings.reduce((sum, o) => sum + o.width * o.height, 0);
      const wallArea = Math.max(0, Math.round((r.perimeter * r.height - openingsArea) * 100) / 100);
      return {
        ...r,
        openings: newOpenings,
        wallArea,
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  const handleDeleteOpening = useCallback((roomId: string, openingId: string) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const newOpenings = (r.openings || []).filter((o) => o.id !== openingId);
      const openingsArea = newOpenings.reduce((sum, o) => sum + o.width * o.height, 0);
      const wallArea = Math.max(0, Math.round((r.perimeter * r.height - openingsArea) * 100) / 100);
      return {
        ...r,
        openings: newOpenings,
        wallArea,
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Add furniture
  const handleAddFurniture = useCallback((roomId: string, furniture: RoomFurniture) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture: [...r.furniture, furniture],
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Update furniture collection (for drag-and-drop & rotation)
  const handleUpdateFurniture = useCallback((roomId: string, furniture: RoomFurniture[]) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture,
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Delete furniture
  const handleDeleteFurniture = useCallback((roomId: string, furnitureId: string) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        furniture: r.furniture.filter((f) => f.id !== furnitureId),
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Add outlet
  const handleAddOutlet = useCallback((roomId: string, outlet: RoomOutlet) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        outlets: [...r.outlets, outlet],
      };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Update design
  const handleUpdateRoomDesign = useCallback((roomId: string, design: Room['design']) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, design };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Update attic roof configuration (knee wall, pitch, skylight)
  const handleUpdateAtticRoof = useCallback((roomId: string, atticRoof?: RoomAtticRoof) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, atticRoof };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Update room photo (a local IndexedDB photo reference, see lib/db/usePhotoSrc.ts)
  const handleUpdateRoomPhoto = useCallback((roomId: string, photoUrl: string) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, photoUrl };
    });
    updateProject({ ...project, rooms: updatedRooms });
  }, [project, updateProject]);

  // Update room before / after comparison photos (IndexedDB storage)
  const handleUpdateRoomPhotos = useCallback((roomId: string, updates: { beforePhotoUrl?: string; afterPhotoUrl?: string }) => {
    const updatedRooms = project.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, ...updates };
    });
    updateProject({ ...project, rooms: updatedRooms });
    showToast('Zaktualizowano zdjęcia metamorfozy pomieszczenia', { type: 'success' });
  }, [project, updateProject, showToast]);

  // Expenses handlers
  const handleAddExpense = useCallback((expense: Expense) => {
    updateProject({
      ...project,
      expenses: [expense, ...project.expenses],
    });
    showToast(`Dodano wydatek: ${expense.title}`, {
      description: `Kwota: ${expense.amount.toFixed(2)} zł (${expense.category})`,
      type: 'success',
    });
  }, [project, updateProject, showToast]);

  const handleDeleteExpense = useCallback((expenseId: string) => {
    const target = project.expenses.find((e) => e.id === expenseId);
    if (target?.receiptPhotoId) {
      deletePhotoBlob(target.receiptPhotoId).catch((err) =>
        console.warn('Failed to delete receipt photo blob', err)
      );
    }
    updateProject({
      ...project,
      expenses: project.expenses.filter((e) => e.id !== expenseId),
    });
    showToast('Usunięto pozycję wydatku', { type: 'info' });
  }, [project, updateProject, showToast]);

  const handleToggleExpensePaid = useCallback((expenseId: string) => {
    const target = project.expenses.find((e) => e.id === expenseId);
    const newPaidStatus = !target?.paid;
    updateProject({
      ...project,
      expenses: project.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        return { ...e, paid: newPaidStatus };
      }),
    });
    showToast(newPaidStatus ? 'Oznaczono wydatek jako opłacony' : 'Cofnięto status opłacenia', {
      type: 'info',
    });
  }, [project, updateProject, showToast]);

  const handleUpdateExpenseReceipt = useCallback((expenseId: string, photoId: string) => {
    const updatedExpenses = project.expenses.map((exp) => {
      if (exp.id !== expenseId) return exp;
      return { ...exp, receiptPhotoId: photoId };
    });
    updateProject({ ...project, expenses: updatedExpenses });
  }, [project, updateProject]);

  const handleAddWorkLog = useCallback((entry: WorkLogEntry) => {
    updateProject({
      ...project,
      workLogs: [entry, ...(project.workLogs || [])],
    });
  }, [project, updateProject]);

  const handleDeleteWorkLog = useCallback((logId: string) => {
    const target = (project.workLogs || []).find((l) => l.id === logId);
    if (target?.photoId) {
      deletePhotoBlob(target.photoId).catch((err) =>
        console.warn('Failed to delete work log photo blob', err)
      );
    }
    if (target?.photoIds && target.photoIds.length > 0) {
      target.photoIds.forEach((pid) => {
        if (pid !== target.photoId) {
          deletePhotoBlob(pid).catch((err) =>
            console.warn('Failed to delete work log gallery photo blob', err)
          );
        }
      });
    }
    updateProject({
      ...project,
      workLogs: (project.workLogs || []).filter((l) => l.id !== logId),
    });
  }, [project, updateProject]);

  // Materials handlers
  const handleToggleMaterialPurchased = useCallback((materialId: string) => {
    updateProject({
      ...project,
      materials: project.materials.map((m) => {
        if (m.id !== materialId) return m;
        return { ...m, purchased: !m.purchased };
      }),
    });
  }, [project, updateProject]);

  const handleAddMaterial = useCallback((material: MaterialCalculation) => {
    updateProject({
      ...project,
      materials: [...project.materials, material],
    });
  }, [project, updateProject]);

  const handleDeleteMaterial = useCallback((materialId: string) => {
    updateProject({
      ...project,
      materials: project.materials.filter((m) => m.id !== materialId),
    });
    showToast('Usunięto pozycję materiałową', { type: 'info' });
  }, [project, updateProject, showToast]);

  const handleAddExpenseFromMaterial = useCallback((mat: MaterialCalculation) => {
    const newExpense: Expense = {
      id: `exp-mat-${Date.now()}`,
      roomId: mat.roomId,
      title: mat.name,
      amount: mat.totalPrice,
      category: 'Materiały budowlane',
      date: new Date().toISOString().split('T')[0],
      paid: true,
      paymentMethod: 'Karta / Przelew',
      receiptNote: `Zakupiono w: ${mat.storeName || 'Market budowlany'}. ${mat.formulaExplanation}`,
    };

    const updatedMaterials = project.materials.map((m) => {
      if (m.id !== mat.id) return m;
      return { ...m, purchased: true };
    });

    updateProject({
      ...project,
      materials: updatedMaterials,
      expenses: [newExpense, ...project.expenses],
    });

    showToast(`Dodano wydatek: ${mat.name}`, {
      description: `Kwota: ${mat.totalPrice.toFixed(2)} PLN zapisana w budżecie`,
      type: 'success',
    });
  }, [project, updateProject, showToast]);

  // Schedule & Tasks handlers
  const handleUpdateStageProgress = useCallback((stageId: string, progress: number) => {
    updateProject({
      ...project,
      stages: project.stages.map((s) => {
        if (s.id !== stageId) return s;
        const status = progress === 100 ? 'done' : progress > 0 ? 'in_progress' : s.status;
        return { ...s, progressPercent: progress, status };
      }),
    });
  }, [project, updateProject]);

  const handleToggleTaskComplete = useCallback((stageId: string, taskId: string) => {
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
  }, [project, updateProject]);

  // Notifications handlers
  const handleAddNotification = useCallback((notification: NotificationItem) => {
    updateProject({
      ...project,
      notifications: [notification, ...project.notifications],
    });
  }, [project, updateProject]);

  const handleDismissNotification = useCallback((notificationId: string) => {
    updateProject({
      ...project,
      notifications: project.notifications.filter((n) => n.id !== notificationId),
    });
  }, [project, updateProject]);

  // QA Checklists
  const handleUpdateQAStatus = useCallback((qaId: string, status: QAChecklistItem['status']) => {
    updateProject({
      ...project,
      qaChecklist: project.qaChecklist.map((q) => {
        if (q.id !== qaId) return q;
        return { ...q, status };
      }),
    });
  }, [project, updateProject]);

  // Room Work Stages Handlers for Progress Tracking
  const handleUpdateRoomStages = useCallback((roomId: string, stages: RoomWorkStage[]) => {
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
  }, [project, updateProject]);

  const handleToggleRoomCompleted = useCallback((roomId: string, completed: boolean) => {
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
  }, [project, updateProject]);

  const handleQuickToggleStage = useCallback((roomId: string, stageId: string) => {
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
  }, [project, handleUpdateRoomStages]);

  // Add Room
  const handleAddRoom = useCallback((newRoom: Room) => {
    updateProject({
      ...project,
      rooms: [...project.rooms, newRoom],
      selectedRoomId: newRoom.id,
    });
  }, [project, updateProject]);

  // Step Switch routing logic
  const renderStepContent = () => {
    switch (activePipelineStep) {
      case 'measure':
        return (
          <ViewRoomScanMeasure
            room={currentRoom}
            onUpdateRoomDimensions={handleUpdateRoomDimensions}
            onAddOpening={handleAddOpening}
            onUpdateOpening={handleUpdateOpening}
            onDeleteOpening={handleDeleteOpening}
            onAddFurniture={handleAddFurniture}
            onUpdateFurniture={handleUpdateFurniture}
            onDeleteFurniture={handleDeleteFurniture}
            onAddOutlet={handleAddOutlet}
            onUpdateRoomDesign={handleUpdateRoomDesign}
            onUpdateRoomPhoto={handleUpdateRoomPhoto}
            onUpdateAtticRoof={handleUpdateAtticRoof}
            onNavigateToStep={(s) => setActivePipelineStep(s as RenovationPipelineStep)}
          />
        );


      case 'design':
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
            onAddExpenseFromMaterial={handleAddExpenseFromMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onUpdateRoomPhoto={handleUpdateRoomPhoto}
          />
        );

      case 'cost':
        return (
          <ViewBudgetExpenses
            project={project}
            onUpdateProject={updateProject}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleExpensePaid={handleToggleExpensePaid}
            onOpenAddModal={() => setIsExpenseModalOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onUpdateExpenseReceipt={handleUpdateExpenseReceipt}
          />
        );

      case 'plan':
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
            workLogs={project.workLogs}
            onSelectRoom={handleSelectRoom}
            onUpdateRoomStages={handleUpdateRoomStages}
            onToggleRoomCompleted={handleToggleRoomCompleted}
            onAddWorkLog={handleAddWorkLog}
            onDeleteWorkLog={handleDeleteWorkLog}
            onConsultAI={(prompt) => {
              setAiPrefilledPrompt(prompt);
              setIsAIModalOpen(true);
            }}
            onNavigateToStep={(s) => setActivePipelineStep(s as RenovationPipelineStep)}
          />
        );

      case 'qa':
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
            onDeleteQACheck={(qaId) => {
              updateProject({
                ...project,
                qaChecklist: project.qaChecklist.filter((q) => q.id !== qaId),
              });
            }}
            onUpdateRoomPhotos={handleUpdateRoomPhotos}
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

      {/* Storage Save Failure Warning Bar */}
      {storageSaveFailed && (
        <div className="flex items-center justify-between gap-3 bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
          <span>Nie udało się zapisać zmian lokalnie (brak miejsca w pamięci przeglądarki). Wyeksportuj projekt jako kopię zapasową.</span>
          <button
            onClick={() => setStorageSaveFailed(false)}
            className="rounded-md bg-rose-800/60 px-2 py-1 hover:bg-rose-800"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Main Top App Header */}
      <Header
        project={project}
        projectsCount={allProjects.length || 1}
        isOnline={isOnline}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSelectRoom={handleSelectRoom}
        onOpenAddExpense={() => setIsExpenseModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenAddRoomModal={() => setIsAddRoomModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenProjectSwitcher={() => setIsProjectSwitcherOpen(true)}
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
            <strong>Renowacje u Kaczaka</strong> • Lokalny, privacy-first asystent projektowania i remontu mieszkania
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

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        project={project}
        onRestoreProject={(p) => updateProject(p)}
      />

      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onAddRoom={handleAddRoom}
      />

      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={project}
      />

      <ProjectSwitcherModal
        isOpen={isProjectSwitcherOpen}
        onClose={() => setIsProjectSwitcherOpen(false)}
        currentProject={project}
        projects={allProjects.length > 0 ? allProjects : [project]}
        onSelectProject={(id) => {
          handleSelectProject(id);
          setIsProjectSwitcherOpen(false);
        }}
        onCreateProject={(newProj) => {
          handleCreateProject(newProj);
          setIsProjectSwitcherOpen(false);
        }}
        onDuplicateProject={(sourceProj) => {
          handleDuplicateProject(sourceProj);
          setIsProjectSwitcherOpen(false);
        }}
        onDeleteProject={handleDeleteProject}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={project.notifications}
        onDismissNotification={handleDismissNotification}
        onAddNotification={handleAddNotification}
        onMarkAllAsRead={() => {
          updateProject({
            ...project,
            notifications: project.notifications.map((n) => ({ ...n, read: true })),
          });
        }}
        onClearAll={() => {
          updateProject({
            ...project,
            notifications: [],
          });
        }}
        onRequestPushPermission={async () => {
          const perm = await requestNotificationPermission();
          setPushPermissionState(perm);
          if (perm === 'granted') {
            new Notification('Renowacje u Kaczaka: Powiadomienia włączone!', {
              body: 'Będziesz na bieżąco informowany o terminach prac i czasach schnięcia.',
              icon: '/icon.svg',
            });
            dispatchPendingNotifications(project.notifications);
          }
        }}
        pushPermissionState={pushPermissionState}
      />

      {/* Mobile Bottom Navigation Bar (Thumb zone) */}
      <MobileBottomNav
        activeStep={activePipelineStep}
        onSelectStep={(step) => setActivePipelineStep(step)}
        onOpenQuickExpense={() => setIsExpenseModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

    </div>
  );
}
