import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonBase, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { Add, Anchor, CalendarToday, EmojiEvents, History, LocalFireDepartment, Star, SwapHoriz, TaskAlt, VisibilityOff } from '@mui/icons-material';
import type { DailyCompletion, FocusProject, FocusTask, GoogleEvent, RewardEvent } from '../../types/models';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionAccordion } from '../../components/common/SectionAccordion';
import { CompactDateStrip } from './CompactDateStrip';
import { TaskRow } from '../tasks/TaskRow';
import { localDate, overdueTasks } from '../tasks/taskDates';
import { useAuth } from '../auth/AuthProvider';
import { YesterdayRecap } from '../gamification/YesterdayRecap';
import { eventDateKey, eventTime } from '../calendar/calendarDates';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import { CalendarEventDialog } from '../calendar/CalendarEventDialog';
import { HomeAssistant } from './HomeAssistant';
import { UpcomingNotices } from './UpcomingNotices';
import { useHomePreferences } from './uiPreferences';
import { momentumStreak, progressBounds, summariseProgress } from '../gamification/gamification';

function normalisedTaskTitle(task: FocusTask) {
  return task.title.trim().toLocaleLowerCase();
}

function isAutomaticInboxItem(task: FocusTask) {
  return task.source === 'gmail'
    || task.source === 'google_gmail'
    || normalisedTaskTitle(task).startsWith('inbox follow-up:');
}

export function TodayPage({
  tasks, projects, events, noticeEvents, unreadEmails, xp, dailyCompletions, rewardEvents, onAdd, onEdit, onToggle, onHide, onFocus, onRelax,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  noticeEvents: GoogleEvent[];
  unreadEmails: number;
  xp: number;
  dailyCompletions: DailyCompletion[];
  rewardEvents: RewardEvent[];
  onAdd: () => void;
  onEdit: (task: FocusTask) => void;
  onToggle: (task: FocusTask, completionDate?: string) => void;
  onHide: (task: FocusTask) => void;
  onFocus: (task: FocusTask) => void;
  onRelax: () => void;
}) {
  const { session } = useAuth();
  const preferences = useHomePreferences();
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [focusTaskId, setFocusTaskId] = useState(() => window.localStorage.getItem('focusos-selected-focus-task'));
  const [switchFocusOpen, setSwitchFocusOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const firstName = String(session?.user.user_metadata.first_name || session?.user.user_metadata.full_name || session?.user.email?.split('@')[0] || '').split(' ')[0];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const completedAnchorIds = useMemo(
    () => new Set(
      dailyCompletions
        .filter((completion) => completion.completion_date === selectedDate)
        .map((completion) => completion.task_id),
    ),
    [dailyCompletions, selectedDate],
  );
  const visible = useMemo(
    () => tasks.filter((task) =>
      task.status === 'open' && !isAutomaticInboxItem(task) && (
        task.scheduled_date === selectedDate ||
        (task.is_daily_anchor && task.recurrence === 'daily' && (!task.scheduled_date || task.scheduled_date <= selectedDate))
      )),
    [tasks, selectedDate],
  );
  const anchors = visible.filter((task) => task.is_daily_anchor);
  const activeAnchors = anchors.filter((task) => !completedAnchorIds.has(task.id));
  const anchorTitles = new Set(anchors.map(normalisedTaskTitle));
  const agenda = visible.filter((task) => !task.is_daily_anchor && !anchorTitles.has(normalisedTaskTitle(task)));
  const calendarEvents = useMemo(
    () => events
      .filter((event) => eventDateKey(event) === selectedDate)
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || ''))),
    [events, selectedDate],
  );
  const allCarriedForward = useMemo(
    () => overdueTasks(tasks, selectedDate).filter((task) => task.source !== 'google_tasks' && !isAutomaticInboxItem(task)),
    [tasks, selectedDate],
  );
  const carriedForward = allCarriedForward.slice(0, 5);
  const automaticNextTask = [...agenda].sort((a, b) => (a.scheduled_time ?? '99:99').localeCompare(b.scheduled_time ?? '99:99'))[0]
    ?? carriedForward[0]
    ?? activeAnchors[0];
  const focusCandidates = useMemo(() => {
    const unique = new Map<string, FocusTask>();
    [...agenda, ...allCarriedForward, ...activeAnchors].forEach((task) => unique.set(task.id, task));
    return [...unique.values()];
  }, [activeAnchors, agenda, allCarriedForward]);
  const nextTask = focusCandidates.find((task) => task.id === focusTaskId) ?? automaticNextTask;
  useEffect(() => {
    if (!nextTask) {
      setFocusTaskId(null);
      window.localStorage.removeItem('focusos-selected-focus-task');
      return;
    }
    if (focusTaskId !== nextTask.id) {
      setFocusTaskId(nextTask.id);
      window.localStorage.setItem('focusos-selected-focus-task', nextTask.id);
    }
  }, [focusTaskId, nextTask]);
  const agendaTasks = agenda.filter((task) => task.id !== nextTask?.id);
  const anchorTasks = activeAnchors.filter((task) => task.id !== nextTask?.id);
  const carriedForwardTasks = carriedForward.filter((task) => task.id !== nextTask?.id);
  const visibleTaskCount = agenda.length + allCarriedForward.length + activeAnchors.length;
  const formatShortDate = (date: string | null) => date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`))
    : '';
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);
  const selectedDateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${selectedDate}T12:00:00`));
  const selectedDayTasks = tasks.filter((task) => task.status !== 'archived' && !task.is_daily_anchor && !isAutomaticInboxItem(task) && task.scheduled_date === selectedDate);
  const completedAgendaCount = selectedDayTasks.filter((task) => task.status === 'completed').length;
  const todayProgress = summariseProgress(rewardEvents, progressBounds('day'));
  const todayTotal = visibleTaskCount + todayProgress.tasks;
  const streak = momentumStreak(rewardEvents);

  return (
    <Stack
      width="100%"
      maxWidth={980}
      mx="auto"
      gap={{ xs: 3, md: 4 }}
      pb={{ xs: 16, sm: 14, md: 16 }}
      position="relative"
      sx={{ overflowX: 'clip' }}
    >
      <Box position="absolute" top={0} right={0}><UpcomingNotices tasks={tasks} events={noticeEvents} unreadEmails={unreadEmails} onEditTask={onEdit} onOpenEvent={setSelectedEvent} /></Box>
      <Box textAlign="center" px={{ xs: 6, sm: 0 }}>
        <Typography variant="caption" color="text.secondary">{new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</Typography>
        <Typography variant="h4" component="h1" fontWeight={850}>{greeting}{firstName ? `, ${firstName}` : ''}</Typography>
        <Typography color="text.secondary">Small steps. Big progress.</Typography>
      </Box>
      {preferences.progressVisible ? (
        <Stack alignItems="center" gap={0.75}>
          <Stack direction="row" justifyContent="center" gap={{ xs: 1.5, sm: 3 }} flexWrap="wrap" color="text.secondary">
            <Stack direction="row" gap={0.5} alignItems="center"><LocalFireDepartment color="warning" fontSize="small" /><Typography variant="caption">{streak} day streak</Typography></Stack>
            <Stack direction="row" gap={0.5} alignItems="center"><TaskAlt color="success" fontSize="small" /><Typography variant="caption">{todayProgress.tasks} of {todayTotal} today</Typography></Stack>
            <Stack direction="row" gap={0.5} alignItems="center"><Star color="primary" fontSize="small" /><Typography variant="caption">{xp} XP</Typography></Stack>
          </Stack>
          <Button size="small" color="inherit" startIcon={<VisibilityOff fontSize="small" />} onClick={() => preferences.setProgressVisible(false)} sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>Hide progress</Button>
        </Stack>
      ) : (
        <Button size="small" color="inherit" startIcon={<EmojiEvents fontSize="small" />} onClick={() => preferences.setProgressVisible(true)} sx={{ alignSelf: 'center', color: 'text.secondary' }}>Show progress</Button>
      )}
      <Stack alignItems="center" gap={1} mb={{ xs: 2, sm: 3 }} minWidth={0}>
        <Button onClick={() => preferences.setAssistantExpanded(!preferences.assistantExpanded)} aria-label="Open Focus Assistant quick entry" sx={{ borderRadius: '50%', p: 0.5 }}>
          <FocusOrb size="clamp(112px, 28vw, 145px)" />
        </Button>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography color="text.secondary" variant="caption">Ready when you are</Typography>
          <Button size="small" color="inherit" onClick={onRelax} sx={{ minWidth: 0, px: 1 }}>Breathe</Button>
        </Stack>
        <HomeAssistant expanded={preferences.assistantExpanded} onExpandedChange={preferences.setAssistantExpanded} />
      </Stack>
      <CompactDateStrip selectedDate={selectedDate} onChange={setSelectedDate} />
      <YesterdayRecap events={rewardEvents} />
      <SectionAccordion
        title="Focus task"
        icon={<CalendarToday color="primary" />}
        meta={<Typography variant="caption" color="text.secondary">{nextTask ? '0 of 1' : '0 of 0'}</Typography>}
        action={focusCandidates.length > 1 ? <Button size="small" startIcon={<SwapHoriz />} onClick={() => setSwitchFocusOpen(true)}>Switch</Button> : undefined}
        appearance="plain"
        expanded={preferences.sections.focusTask}
        onExpandedChange={(expanded) => preferences.setSection('focusTask', expanded)}
      >
          {nextTask ? (
            <List disablePadding>
              <TaskRow
                task={nextTask}
                project={projectFor(nextTask.project_id)}
                contextLabel={nextTask.scheduled_date && nextTask.scheduled_date < selectedDate ? `Due ${formatShortDate(nextTask.scheduled_date)}` : undefined}
                onToggle={() => onToggle(nextTask, nextTask.is_daily_anchor ? selectedDate : undefined)}
                onEdit={() => onEdit(nextTask)}
                onHide={() => onHide(nextTask)}
                onFocus={() => onFocus(nextTask)}
              />
            </List>
          ) : <EmptyState icon={<CalendarToday />} title="You are clear" description="There is nothing else asking for your attention." actionLabel="Add task" onAction={onAdd} />}
      </SectionAccordion>
      {visibleTaskCount > 1 && (
        <Button
          size="small"
          variant="text"
          onClick={() => preferences.setTaskMode(preferences.taskMode === 'all' ? 'one' : 'all')}
          sx={{ alignSelf: 'center' }}
        >
          {preferences.taskMode === 'all' ? 'Show focus task only' : `Show all tasks (${visibleTaskCount})`}
        </Button>
      )}
      {preferences.taskMode === 'all' && <>
      <SectionAccordion title="Agenda" icon={<CalendarToday color="primary" />} meta={<Typography variant="caption" color="text.secondary">{completedAgendaCount} of {selectedDayTasks.length + calendarEvents.length}</Typography>} action={<Button size="small" startIcon={<Add />} onClick={onAdd}>Add</Button>} appearance="plain" expanded={preferences.sections.agenda} onExpandedChange={(expanded) => preferences.setSection('agenda', expanded)}>
        <Typography variant="caption" color="text.secondary">{selectedDateLabel}</Typography>
        {agendaTasks.length > 0 && <List disablePadding sx={{ mt: 1 }}>{agendaTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List>}
        {calendarEvents.map((event) => <ButtonBase key={event.id} onClick={() => setSelectedEvent(event)} sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: '54px minmax(0, 1fr)', sm: '72px minmax(0, 1fr)' }, gap: 1.25, py: 0.75, textAlign: 'left', alignItems: 'stretch' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={750} pt={1.25} textAlign="right">{eventTime(event)}</Typography>
          <Stack minWidth={0} gap={0.5} px={1.5} py={1.1} bgcolor="action.hover" borderLeft={4} borderColor="secondary.main" borderRadius={1.5}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"><Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{event.title || event.summary || 'Calendar event'}</Typography><GoogleSourceChip service="calendar" /></Stack>
            {(event.location || event.calendarName) && <Typography variant="caption" color="text.secondary" noWrap>{event.location || event.calendarName}</Typography>}
          </Stack>
        </ButtonBase>)}
        {!agendaTasks.length && !calendarEvents.length && <EmptyState icon={<CalendarToday />} title="Nothing else scheduled" description={nextTask ? 'Your focus task is the only item scheduled for this day.' : 'There are no tasks or Google Calendar events for this day.'} actionLabel="Add task" onAction={onAdd} />}
      </SectionAccordion>
      <SectionAccordion
        title="Daily Anchors"
        icon={<Anchor color="secondary" />}
        meta={<Typography variant="caption" color="text.secondary">{anchors.filter((task) => completedAnchorIds.has(task.id)).length} of {anchors.length}</Typography>}
        appearance="plain"
        expanded={preferences.sections.anchors}
        onExpandedChange={(expanded) => preferences.setSection('anchors', expanded)}
      >
        <Typography variant="body2" color="text.secondary" mb={1}>
          Daily Anchors are small routines that repeat each day. Tick one off today and it returns unchecked tomorrow.
        </Typography>
        {anchorTasks.length ? <List disablePadding sx={{ mt: 1 }}>{anchorTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task, selectedDate)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<Anchor />} title={anchors.length ? 'Anchors complete' : 'No Daily Anchors'} description={anchors.length ? 'Today’s anchors are safely recorded.' : 'Add the small routines that steady your day.'} actionLabel={anchors.length ? undefined : 'Add anchor'} onAction={anchors.length ? undefined : onAdd} />}
      </SectionAccordion>
      {carriedForwardTasks.length > 0 && (
        <SectionAccordion
          title="Carried forward"
          icon={<History color="warning" />}
          meta={<Typography variant="caption" color="text.secondary">{allCarriedForward.length} unfinished</Typography>}
          appearance="plain"
          expanded={preferences.sections.carriedForward}
          onExpandedChange={(expanded) => preferences.setSection('carriedForward', expanded)}
        >
          <Typography variant="body2" color="text.secondary" mt={0.75}>
            These remain visible until you complete or reschedule them.
          </Typography>
          <List disablePadding sx={{ mt: 1 }}>
            {carriedForwardTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={projectFor(task.project_id)}
                contextLabel={`Due ${formatShortDate(task.scheduled_date)}`}
                onToggle={() => onToggle(task)}
                onEdit={() => onEdit(task)}
                onHide={() => onHide(task)}
                onFocus={() => onFocus(task)}
              />
            ))}
          </List>
          <Button component={RouterLink} to="/tasks?view=overdue" sx={{ mt: 1 }}>
            Review all overdue tasks
          </Button>
        </SectionAccordion>
      )}
      </>}
      <CalendarEventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <Dialog open={switchFocusOpen} onClose={() => setSwitchFocusOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Switch focus task</DialogTitle>
        <DialogContent sx={{ px: 1.5, pb: 2 }}>
          <List disablePadding>
            {focusCandidates.map((task) => (
              <ListItemButton
                key={task.id}
                selected={task.id === nextTask?.id}
                onClick={() => {
                  setFocusTaskId(task.id);
                  window.localStorage.setItem('focusos-selected-focus-task', task.id);
                  setSwitchFocusOpen(false);
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemText
                  primary={task.title}
                  secondary={[projectFor(task.project_id)?.name, task.scheduled_time?.slice(0, 5)].filter(Boolean).join(' · ')}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
