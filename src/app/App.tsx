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
  const { toggleTask, saveTask } = useTaskMutations();
  const { notify } = useNotice();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FocusTask | null>(null);
  const [focusTask, setFocusTask] = useState<FocusTask | null>(null);
  const [relaxOpen, setRelaxOpen] = useState(false);
  if (focus.isLoading) return <LoadingScreen label="Loading your workspace…" />;
  if (focus.error || !focus.data) return <LoadingScreen label={focus.error instanceof Error ? focus.error.message : 'Could not load FocusOS.'} />;
  const { state, tasks, projects, goals, tags, taskTags } = focus.data;
  const openAdd = () => { setEditingTask(null); setTaskDialogOpen(true); };
  const openEdit = (task: FocusTask) => { setEditingTask(task); setTaskDialogOpen(true); };
  const toggle = async (task: FocusTask) => {
    try { await toggleTask.mutateAsync(task); notify(task.status === 'completed' ? 'Task reopened.' : 'Task completed.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update task.', 'error'); }
  };
  const connect = () => google.connect.mutate();
  const messages = google.data?.gmail?.messages ?? [];
  const events = google.data?.calendar?.events ?? [];
  const documents = [...mapDriveFiles(google.data), ...(state.docs ?? [])];
  const createMessageTask = async (message: GoogleMessage) => {
    const draft: TaskDraft = { title: message.subject || 'Follow up email', priority: null, project_id: null, goal_id: null, scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: null, is_daily_anchor: false, tag_ids: [] };
    try { await saveTask.mutateAsync({ draft }); notify('Email added as a task.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not create task.', 'error'); }
  };
  const archiveMessage = async (message: GoogleMessage) => {
    try { await google.action('/gmail-action', { messageId: message.id, action: 'archive' }); await google.refetch(); notify('Email archived.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not archive email.', 'error'); }
  };
  return <AppShell xp={state.xp} onAddTask={openAdd}>
    <Suspense fallback={<LoadingScreen label="Opening page…" />}><Routes>
      <Route path="/today" element={<TodayPage tasks={tasks} projects={projects} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onFocus={setFocusTask} onRelax={() => setRelaxOpen(true)} />} />
      <Route path="/tasks" element={<TasksPage tasks={tasks} projects={projects} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onFocus={setFocusTask} />} />
      <Route path="/projects" element={<ProjectsPage tasks={tasks} projects={projects} goals={goals} />} />
      <Route path="/calendar" element={<CalendarPage tasks={tasks} projects={projects} events={events} />} />
      <Route path="/vault" element={<VaultPage documents={documents} connected={Boolean(google.data?.connected)} onConnect={connect} />} />
      <Route path="/inbox" element={<InboxPage messages={messages} connected={Boolean(google.data?.connected)} onConnect={connect} onArchive={archiveMessage} onCreateTask={createMessageTask} />} />
      <Route path="/assistant" element={<AssistantPage tasks={tasks} onFocus={setFocusTask} />} />
      <Route path="/settings" element={<SettingsPage connected={Boolean(google.data?.connected)} email={google.data?.email} error={google.error instanceof Error ? google.error.message : undefined} onConnect={connect} onRefresh={() => void google.refetch()} onDisconnect={() => google.disconnect.mutate()} />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes></Suspense>
    <TaskDialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} task={editingTask} projects={projects} goals={goals} tags={tags} taskTags={taskTags} />
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
