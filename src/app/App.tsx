import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { LandingPage } from '../features/auth/LandingPage';
import { AuthPage } from '../features/auth/AuthPage';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { AppShell } from '../components/layout/AppShell';
import { useFocusData, useTaskMutations } from '../features/data/useFocusData';
import { useGoogleWorkspace, mapDriveFiles } from '../features/integrations/googleWorkspace';
import { TaskDialog } from '../features/tasks/TaskDialog';
import { FocusMode } from '../features/focus/FocusMode';
import { RelaxMode } from '../features/focus/RelaxMode';
import { localDate } from '../features/tasks/taskDates';
import type { FocusTask, GoogleMessage, TaskDraft } from '../types/models';
import { useNotice } from './AppProviders';

const TodayPage = lazy(() => import('../features/today/TodayPage').then((module) => ({ default: module.TodayPage })));
const TasksPage = lazy(() => import('../features/tasks/TasksPage').then((module) => ({ default: module.TasksPage })));
const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const CalendarPage = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const VaultPage = lazy(() => import('../features/vault/VaultPage').then((module) => ({ default: module.VaultPage })));
const InboxPage = lazy(() => import('../features/inbox/InboxPage').then((module) => ({ default: module.InboxPage })));
const AssistantPage = lazy(() => import('../features/assistant/AssistantPage').then((module) => ({ default: module.AssistantPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const MorePage = lazy(() => import('../features/more/MorePage').then((module) => ({ default: module.MorePage })));

function ProtectedApp() {
  const focus = useFocusData();
  const google = useGoogleWorkspace();
  const { toggleTask, saveTask, setTaskHidden } = useTaskMutations();
  const { notify } = useNotice();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FocusTask | null>(null);
  const [focusTask, setFocusTask] = useState<FocusTask | null>(null);
  const [relaxOpen, setRelaxOpen] = useState(false);
  if (focus.isLoading) return <LoadingScreen label="Loading your workspace…" />;
  if (focus.error || !focus.data) return <LoadingScreen label={focus.error instanceof Error ? focus.error.message : 'Could not load FocusOS.'} />;
  const { state, tasks, projects, goals, tags, taskTags, dailyCompletions } = focus.data;
  const localToday = localDate();
  const anchorCompletedOn = (taskId: string, date: string) =>
    dailyCompletions.some((completion) => completion.task_id === taskId && completion.completion_date === date);
  const tasksForToday = tasks.map((task) =>
    task.is_daily_anchor && task.status !== 'archived'
      ? { ...task, status: anchorCompletedOn(task.id, localToday) ? 'completed' as const : 'open' as const }
      : task,
  );
  const openAdd = () => { setEditingTask(null); setTaskDialogOpen(true); };
  const openEdit = (task: FocusTask) => { setEditingTask(task); setTaskDialogOpen(true); };
  const toggle = async (task: FocusTask, completionDate = localToday) => {
    const wasCompleted = task.is_daily_anchor ? anchorCompletedOn(task.id, completionDate) : task.status === 'completed';
    try {
      await toggleTask.mutateAsync({ task, completionDate, completed: wasCompleted });
      if (google.connected && !task.is_daily_anchor) {
        try { await google.action('/sync-focus-task', { taskId: task.id }); }
        catch { notify('Task updated in FocusOS. Tap Sync now to retry Google.', 'warning'); return; }
      }
      notify(wasCompleted ? 'Task reopened.' : 'Task completed.');
    }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update task.', 'error'); }
  };
  const connect = () => google.connect.mutate();
  const googleError = google.error instanceof Error
    ? google.error.message
    : google.connectionError instanceof Error
      ? google.connectionError.message
      : google.connect.error instanceof Error ? google.connect.error.message : undefined;
  const googleLoading = google.checkingConnection || google.isFetching;
  const syncTaskToGoogle = async (taskId: string) => { await google.action('/sync-focus-task', { taskId }); };
  const removeTaskFromGoogle = async (taskId: string) => { await google.action('/delete-focus-task-links', { taskId }); };
  const hideTask = async (task: FocusTask) => {
    const hidden = task.status !== 'archived';
    try {
      await setTaskHidden.mutateAsync({ id: task.id, hidden });
      notify(hidden ? 'Task hidden. You can restore it from Hidden.' : 'Task restored.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not change task visibility.', 'error');
    }
  };
  const messages = google.data?.gmail?.messages ?? [];
  const events = google.data?.calendar?.events ?? [];
  const documents = [...mapDriveFiles(google.data), ...(state.docs ?? [])];
  const createMessageTask = async (message: GoogleMessage) => {
    const draft: TaskDraft = { title: message.subject || 'Follow up email', priority: null, project_id: null, goal_id: null, scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: null, is_daily_anchor: false, tag_ids: [] };
    try {
      const taskId = await saveTask.mutateAsync({ draft });
      if (google.connected) await syncTaskToGoogle(taskId);
      notify('Email added as a task.');
    }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not create task.', 'error'); }
  };
  const archiveMessage = async (message: GoogleMessage) => {
    try { await google.action('/gmail-action', { messageId: message.id, action: 'archive' }); await google.refetch(); notify('Email archived.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not archive email.', 'error'); }
  };
  return <AppShell xp={state.xp} onAddTask={openAdd}>
    <Suspense fallback={<LoadingScreen label="Opening page…" />}><Routes>
      <Route path="/today" element={<TodayPage tasks={tasks} projects={projects} dailyCompletions={dailyCompletions} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onHide={hideTask} onFocus={setFocusTask} onRelax={() => setRelaxOpen(true)} />} />
      <Route path="/tasks" element={<TasksPage tasks={tasksForToday} projects={projects} googleConnected={google.connected} googleEmail={google.email} googleLoading={googleLoading} googleError={google.data?.services?.tasks?.error || googleError} onGoogleConnect={connect} onGoogleRefresh={() => void google.refetch()} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onHide={hideTask} onFocus={setFocusTask} />} />
      <Route path="/projects" element={<ProjectsPage tasks={tasksForToday} projects={projects} goals={goals} />} />
      <Route path="/calendar" element={<CalendarPage tasks={tasks} projects={projects} events={events} />} />
      <Route path="/vault" element={<VaultPage documents={documents} connected={google.connected} onConnect={connect} />} />
      <Route path="/inbox" element={<InboxPage messages={messages} connected={google.connected} loading={googleLoading} error={google.data?.services?.gmail?.error || googleError} onConnect={connect} onArchive={archiveMessage} onCreateTask={createMessageTask} />} />
      <Route path="/assistant" element={<AssistantPage tasks={tasksForToday} onFocus={setFocusTask} />} />
      <Route path="/settings" element={<SettingsPage connected={google.connected} email={google.email} error={googleError} onConnect={connect} onRefresh={() => void google.refetch()} onDisconnect={() => google.disconnect.mutate()} />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes></Suspense>
    <TaskDialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} task={editingTask} projects={projects} goals={goals} tags={tags} taskTags={taskTags} onSaved={google.connected ? syncTaskToGoogle : undefined} onBeforeDelete={google.connected ? removeTaskFromGoogle : undefined} />
    <FocusMode task={focusTask} open={Boolean(focusTask)} onClose={() => setFocusTask(null)} onComplete={(task) => { void toggle(task); setFocusTask(null); }} />
    <RelaxMode open={relaxOpen} onClose={() => setRelaxOpen(false)} />
  </AppShell>;
}

export function App() {
  const { session, loading, isRecovery } = useAuth();
  if (loading) return <LoadingScreen label="Checking your session…" />;
  return <Routes>
    <Route
      path="/"
      element={isRecovery ? <Navigate to="/auth" replace /> : session ? <Navigate to="/today" replace /> : <LandingPage />}
    />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/*" element={session && !isRecovery ? <ProtectedApp /> : <Navigate to={isRecovery ? '/auth' : '/'} replace />} />
  </Routes>;
}
