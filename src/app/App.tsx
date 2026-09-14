import { lazy, Suspense, useCallback, useState, type ComponentType } from 'react';
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
import { EmailReaderDialog } from '../features/inbox/EmailReaderDialog';
import { localDate } from '../features/tasks/taskDates';
import type { FocusTask, GoogleMessage, GoogleMessageDetail, TaskDraft } from '../types/models';
import { useNotice } from './AppProviders';
import type { AgentProposal } from '../features/assistant/agentClient';
import { draftReply } from '../features/assistant/agentClient';
import { supabase } from '../services/supabase/client';
import { markAppLoaded, recoverStaleChunk } from './AppErrorBoundary';

function lazyWithRecovery<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const loaded = await load();
      markAppLoaded();
      return loaded;
    } catch (error) {
      if (recoverStaleChunk(error)) return new Promise<{ default: T }>(() => undefined);
      throw error;
    }
  });
}

const TodayPage = lazyWithRecovery(() => import('../features/today/TodayPage').then((module) => ({ default: module.TodayPage })));
const TasksPage = lazyWithRecovery(() => import('../features/tasks/TasksPage').then((module) => ({ default: module.TasksPage })));
const ProjectsPage = lazyWithRecovery(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailPage = lazyWithRecovery(() => import('../features/projects/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })));
const CalendarPage = lazyWithRecovery(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const VaultPage = lazyWithRecovery(() => import('../features/vault/VaultPage').then((module) => ({ default: module.VaultPage })));
const InboxPage = lazyWithRecovery(() => import('../features/inbox/InboxPage').then((module) => ({ default: module.InboxPage })));
const AssistantPage = lazyWithRecovery(() => import('../features/assistant/AssistantPage').then((module) => ({ default: module.AssistantPage })));
const SettingsPage = lazyWithRecovery(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const MorePage = lazyWithRecovery(() => import('../features/more/MorePage').then((module) => ({ default: module.MorePage })));

export function ProtectedApp() {
  const focus = useFocusData();
  const google = useGoogleWorkspace();
  const { toggleTask, saveTask, setTaskHidden } = useTaskMutations();
  const { notify } = useNotice();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FocusTask | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null);
  const [focusTask, setFocusTask] = useState<FocusTask | null>(null);
  const [relaxOpen, setRelaxOpen] = useState(false);
  const [emailReader, setEmailReader] = useState<{ message: GoogleMessage; task: FocusTask | null } | null>(null);
  const loadEmail = useCallback((messageId: string) => google.action<GoogleMessageDetail>('/gmail-message', { messageId }), [google.action]);
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
  const openAdd = () => { setEditingTask(null); setNewTaskDate(null); setNewTaskProjectId(null); setNewTaskGoalId(null); setTaskDialogOpen(true); };
  const openAddOnDate = (date: string) => { setEditingTask(null); setNewTaskDate(date); setNewTaskProjectId(null); setNewTaskGoalId(null); setTaskDialogOpen(true); };
  const openAddForGoal = (projectId: string, goalId: string) => {
    setEditingTask(null);
    setNewTaskDate(null);
    setNewTaskProjectId(projectId);
    setNewTaskGoalId(goalId);
    setTaskDialogOpen(true);
  };
  const openEdit = async (task: FocusTask) => {
    if (task.source === 'gmail' || task.source === 'google_gmail') {
      let messageId = task.legacy_key?.startsWith('gmail:') ? task.legacy_key.slice('gmail:'.length) : '';
      if (!messageId) {
        const { data } = await supabase
          .from('focusos_external_links')
          .select('external_id')
          .eq('task_id', task.id)
          .eq('provider', 'gmail')
          .maybeSingle();
        messageId = data?.external_id || '';
      }
      if (!messageId) { notify('This email is missing its Google reference.', 'error'); return; }
      setEmailReader({ task, message: { id: messageId, subject: task.title.replace(/^Read email:\s*/i, ''), from: '', unread: task.status === 'open' } });
      return;
    }
    setEditingTask(task);
    setTaskDialogOpen(true);
  };
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
  const messages = google.gmail?.messages ?? [];
  const events = google.data?.calendar?.events ?? [];
  const documents = [...mapDriveFiles(google.data), ...(state.docs ?? [])];
  const createMessageTask = async (message: GoogleMessage) => {
    const draft: TaskDraft = { title: `Follow up: ${message.subject || 'Email'}`, priority: null, project_id: null, goal_id: null, scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: null, is_daily_anchor: false, tag_ids: [] };
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
  const completeEmail = async (message: GoogleMessage) => {
    if (emailReader?.task && emailReader.task.status !== 'completed') {
      await toggleTask.mutateAsync({ task: emailReader.task, completed: false });
      await google.action('/sync-focus-task', { taskId: emailReader.task.id });
    } else {
      await google.action('/gmail-action', { messageId: message.id, action: 'read' });
    }
    await google.refetch();
    notify('Email marked as read and completed.');
  };
  const archiveEmailFromReader = async (message: GoogleMessage) => {
    await google.action('/gmail-action', { messageId: message.id, action: 'archive' });
    await google.refetch();
    notify('Email archived and task completed.');
  };
  const replyToEmail = async (message: GoogleMessageDetail, reply: string) => {
    const subject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;
    await google.action('/gmail-reply', { to: message.replyTo || message.from, subject, message: reply, threadId: message.threadId, confirm: true });
    notify('Reply sent.');
  };
  const draftEmailReply = (message: GoogleMessageDetail) => draftReply({
    channel: 'email',
    subject: message.subject,
    sender: message.from,
    text: message.text,
  });
  const approveAgentProposal = async (proposal: AgentProposal) => {
    if (proposal.action === 'create') {
      const taskId = await saveTask.mutateAsync({ draft: {
        title: proposal.title || 'New task',
        priority: proposal.priority ?? null,
        project_id: null,
        goal_id: null,
        scheduled_date: proposal.scheduledDate ?? null,
        scheduled_time: proposal.scheduledTime ?? null,
        is_daily_anchor: false,
        tag_ids: [],
      } });
      if (google.connected) await syncTaskToGoogle(taskId);
      notify('Approved. Task created.');
      return;
    }
    const task = tasksForToday.find((item) => item.id === proposal.taskId);
    if (!task) throw new Error('That task is no longer available.');
    if (proposal.action === 'focus') {
      setFocusTask(task);
      notify('Approved. Focus Mode opened.');
      return;
    }
    if (proposal.action === 'complete') {
      await toggle(task);
      return;
    }
    await saveTask.mutateAsync({ id: task.id, draft: {
      title: proposal.title || task.title,
      priority: proposal.priority === undefined ? task.priority : proposal.priority,
      project_id: task.project_id,
      goal_id: task.goal_id,
      scheduled_date: proposal.scheduledDate === undefined ? task.scheduled_date : proposal.scheduledDate,
      scheduled_time: proposal.scheduledTime === undefined ? task.scheduled_time : proposal.scheduledTime,
      is_daily_anchor: task.is_daily_anchor,
      tag_ids: taskTags.filter((link) => link.task_id === task.id).map((link) => link.tag_id),
    } });
    if (google.connected) await syncTaskToGoogle(task.id);
    notify('Approved. Task updated.');
  };
  return <AppShell xp={state.xp} onAddTask={openAdd}>
    <Suspense fallback={<LoadingScreen label="Opening page…" />}><Routes>
      <Route path="/today" element={<TodayPage tasks={tasks} projects={projects} dailyCompletions={dailyCompletions} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onHide={hideTask} onFocus={setFocusTask} onRelax={() => setRelaxOpen(true)} />} />
      <Route path="/tasks" element={<TasksPage tasks={tasksForToday} projects={projects} googleConnected={google.connected} googleEmail={google.email} googleLoading={googleLoading} googleError={google.data?.services?.tasks?.error || google.data?.services?.calendar?.error || google.data?.services?.gmail?.error || googleError} onGoogleConnect={connect} onGoogleRefresh={() => void google.refetch()} onAdd={openAdd} onEdit={openEdit} onToggle={toggle} onHide={hideTask} onFocus={setFocusTask} />} />
      <Route path="/projects" element={<ProjectsPage tasks={tasksForToday} projects={projects} goals={goals} />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage tasks={tasksForToday} projects={projects} goals={goals} onAddTask={openAddForGoal} onEdit={openEdit} onToggle={toggle} onHide={hideTask} onFocus={setFocusTask} />} />
      <Route path="/calendar" element={<CalendarPage tasks={tasks} projects={projects} events={events} googleConnected={google.connected} googleError={google.data?.services?.calendar?.error || googleError} onGoogleConnect={connect} onAddTask={openAddOnDate} onEditTask={openEdit} onToggleTask={toggle} onHideTask={hideTask} onFocusTask={setFocusTask} />} />
      <Route path="/vault" element={<VaultPage documents={documents} connected={google.connected} onConnect={connect} />} />
      <Route path="/inbox" element={<InboxPage messages={messages} connected={google.connected} loading={google.gmailLoading} error={google.gmailError instanceof Error ? google.gmailError.message : google.data?.services?.gmail?.error || googleError} onConnect={connect} onRefresh={() => void google.refetchGmail()} onOpen={(message) => setEmailReader({ message, task: null })} onArchive={archiveMessage} onCreateTask={createMessageTask} />} />
      <Route path="/assistant" element={<AssistantPage tasks={tasksForToday} onApproveProposal={approveAgentProposal} />} />
      <Route path="/settings" element={<SettingsPage connected={google.connected} email={google.email} error={googleError} onConnect={connect} onRefresh={() => void google.refetch()} onDisconnect={() => google.disconnect.mutate()} />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes></Suspense>
    <TaskDialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} task={editingTask} initialDate={newTaskDate} initialProjectId={newTaskProjectId} initialGoalId={newTaskGoalId} projects={projects} goals={goals} tags={tags} taskTags={taskTags} onSaved={google.connected ? syncTaskToGoogle : undefined} onBeforeDelete={google.connected ? removeTaskFromGoogle : undefined} />
    <FocusMode task={focusTask} open={Boolean(focusTask)} onClose={() => setFocusTask(null)} onComplete={(task) => { void toggle(task); setFocusTask(null); }} />
    <RelaxMode open={relaxOpen} onClose={() => setRelaxOpen(false)} />
    <EmailReaderDialog open={Boolean(emailReader)} message={emailReader?.message ?? null} onClose={() => setEmailReader(null)} onLoad={loadEmail} onComplete={completeEmail} onArchive={archiveEmailFromReader} onCreateTask={createMessageTask} onReply={replyToEmail} onDraftReply={draftEmailReply} />
  </AppShell>;
}

export function App() {
  const { session, loading, isRecovery, recoveryError } = useAuth();
  if (loading) return <LoadingScreen label="Checking your session…" />;
  return <Routes>
    <Route
      path="/"
      element={isRecovery || recoveryError ? <Navigate to="/auth" replace /> : session ? <Navigate to="/today" replace /> : <LandingPage />}
    />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/*" element={session && !isRecovery ? <ProtectedApp /> : <Navigate to={isRecovery ? '/auth' : '/'} replace />} />
  </Routes>;
}
