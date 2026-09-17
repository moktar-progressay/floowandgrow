import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { Add, Anchor, CalendarToday, History, OpenInNew, SwapHoriz } from '@mui/icons-material';
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

export function TodayPage({
  tasks, projects, events, dailyCompletions, rewardEvents, onAdd, onEdit, onToggle, onHide, onFocus, onRelax,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
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
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(() => window.localStorage.getItem('focusos-selected-focus-task'));
  const [switchFocusOpen, setSwitchFocusOpen] = useState(false);
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
      task.status === 'open' && (
        task.scheduled_date === selectedDate ||
        (task.is_daily_anchor && task.recurrence === 'daily' && (!task.scheduled_date || task.scheduled_date <= selectedDate))
      )),
    [tasks, selectedDate],
  );
  const anchors = visible.filter((task) => task.is_daily_anchor);
  const activeAnchors = anchors.filter((task) => !completedAnchorIds.has(task.id));
  const agenda = visible.filter((task) => !task.is_daily_anchor);
  const calendarEvents = useMemo(
    () => events
      .filter((event) => eventDateKey(event) === selectedDate)
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || ''))),
    [events, selectedDate],
  );
  const allCarriedForward = useMemo(
    () => overdueTasks(tasks, selectedDate).filter((task) => task.source !== 'google_tasks'),
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

  return (
    <Stack width="100%" maxWidth={980} mx="auto" gap={2.5}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800}>{greeting}{firstName ? `, ${firstName}` : ''}</Typography>
        <Typography color="text.secondary">Let’s make today feel lighter.</Typography>
      </Box>
      <Button onClick={onRelax} aria-label="Open guided breathing" sx={{ alignSelf: 'center', borderRadius: '50%', my: 3 }}>
        <FocusOrb size="clamp(145px, 38vw, 195px)" />
      </Button>
      <Typography textAlign="center" color="text.secondary" variant="caption" mt={-5}>Tap the orb to relax</Typography>
      <CompactDateStrip selectedDate={selectedDate} onChange={setSelectedDate} />
      <YesterdayRecap events={rewardEvents} />
      <SectionAccordion
        title="Focus task"
        icon={<CalendarToday color="primary" />}
        action={focusCandidates.length > 1 ? <Button size="small" startIcon={<SwapHoriz />} onClick={() => setSwitchFocusOpen(true)}>Switch</Button> : undefined}
        defaultExpanded
        sx={{ borderColor: 'primary.main' }}
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
        <Button onClick={() => setShowAllTasks((value) => !value)}>
          {showAllTasks ? 'Show only next task' : `Show more tasks (${visibleTaskCount - 1})`}
        </Button>
      )}
      {showAllTasks && <>
      <SectionAccordion title="Agenda" icon={<CalendarToday color="primary" />} meta={<Typography variant="caption" color="text.secondary">{selectedDateLabel} · {agendaTasks.length + calendarEvents.length} items</Typography>} action={<Button size="small" startIcon={<Add />} onClick={onAdd}>Add</Button>} defaultExpanded>
        {agendaTasks.length > 0 && <List disablePadding sx={{ mt: 1 }}>{agendaTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List>}
        {calendarEvents.map((event) => (
          <Stack key={event.id} direction="row" alignItems="center" gap={1.25} py={1.5} borderBottom={1} borderColor="divider" minWidth={0}>
            <GoogleSourceChip service="calendar" sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0 }} />
            <Stack flex={1} minWidth={0}>
              <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{event.title || event.summary || 'Calendar event'}</Typography>
              <Typography variant="caption" color="text.secondary">{eventTime(event)}{event.location ? ` · ${event.location}` : ''}</Typography>
            </Stack>
            {event.link && <Button component="a" href={event.link} target="_blank" rel="noopener" size="small" startIcon={<OpenInNew />} sx={{ flexShrink: 0 }}>Open</Button>}
          </Stack>
        ))}
        {!agendaTasks.length && !calendarEvents.length && <EmptyState icon={<CalendarToday />} title="Nothing else scheduled" description={nextTask ? 'Your focus task is the only item scheduled for this day.' : 'There are no tasks or Google Calendar events for this day.'} actionLabel="Add task" onAction={onAdd} />}
      </SectionAccordion>
      <SectionAccordion
        title="Daily Anchors"
        icon={<Anchor color="secondary" />}
        meta={<Typography variant="caption" color="text.secondary">{anchors.filter((task) => completedAnchorIds.has(task.id)).length} of {anchors.length} done</Typography>}
        defaultExpanded
      >
        {anchorTasks.length ? <List disablePadding sx={{ mt: 1 }}>{anchorTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task, selectedDate)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<Anchor />} title={anchors.length ? 'Anchors complete' : 'No Daily Anchors'} description={anchors.length ? 'Today’s anchors are safely recorded.' : 'Add the small routines that steady your day.'} actionLabel={anchors.length ? undefined : 'Add anchor'} onAction={anchors.length ? undefined : onAdd} />}
      </SectionAccordion>
      {carriedForwardTasks.length > 0 && (
        <SectionAccordion
          title="Carried forward"
          icon={<History color="warning" />}
          meta={<Typography variant="caption" color="text.secondary">{allCarriedForward.length} unfinished</Typography>}
          sx={{ borderColor: 'warning.main' }}
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
