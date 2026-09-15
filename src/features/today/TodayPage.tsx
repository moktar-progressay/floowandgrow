import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, List, Stack, Typography } from '@mui/material';
import { Add, Anchor, CalendarToday, History } from '@mui/icons-material';
import type { DailyCompletion, FocusProject, FocusTask, RewardEvent } from '../../types/models';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionAccordion } from '../../components/common/SectionAccordion';
import { CompactDateStrip } from './CompactDateStrip';
import { TaskRow } from '../tasks/TaskRow';
import { localDate, overdueTasks } from '../tasks/taskDates';
import { useAuth } from '../auth/AuthProvider';
import { YesterdayRecap } from '../gamification/YesterdayRecap';

export function TodayPage({
  tasks, projects, dailyCompletions, rewardEvents, onAdd, onEdit, onToggle, onHide, onFocus, onRelax,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
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
  const allCarriedForward = useMemo(
    () => overdueTasks(tasks, selectedDate).filter((task) => task.source !== 'google_tasks'),
    [tasks, selectedDate],
  );
  const carriedForward = allCarriedForward.slice(0, 5);
  const nextTask = [...agenda].sort((a, b) => (a.scheduled_time ?? '99:99').localeCompare(b.scheduled_time ?? '99:99'))[0]
    ?? carriedForward[0]
    ?? activeAnchors[0];
  const visibleTaskCount = agenda.length + allCarriedForward.length + activeAnchors.length;
  const formatShortDate = (date: string | null) => date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`))
    : '';
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return (
    <Stack maxWidth={760} mx="auto" gap={2.5}>
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
      {!showAllTasks && (
        <SectionAccordion title="Next task" icon={<CalendarToday color="primary" />} defaultExpanded sx={{ borderColor: 'primary.main' }}>
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
      )}
      {visibleTaskCount > 1 && (
        <Button onClick={() => setShowAllTasks((value) => !value)}>
          {showAllTasks ? 'Show only next task' : `Show more tasks (${visibleTaskCount - 1})`}
        </Button>
      )}
      {showAllTasks && <>
      <SectionAccordion
        title="Daily Anchors"
        icon={<Anchor color="secondary" />}
        meta={<Typography variant="caption" color="text.secondary">{anchors.filter((task) => completedAnchorIds.has(task.id)).length} of {anchors.length} done</Typography>}
        defaultExpanded
      >
        {activeAnchors.length ? <List disablePadding sx={{ mt: 1 }}>{activeAnchors.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task, selectedDate)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<Anchor />} title={anchors.length ? 'Anchors complete' : 'No Daily Anchors'} description={anchors.length ? 'Today’s anchors are safely recorded.' : 'Add the small routines that steady your day.'} actionLabel={anchors.length ? undefined : 'Add anchor'} onAction={anchors.length ? undefined : onAdd} />}
      </SectionAccordion>
      {carriedForward.length > 0 && (
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
            {carriedForward.map((task) => (
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
      <SectionAccordion title="Agenda" action={<Button size="small" startIcon={<Add />} onClick={onAdd}>Add</Button>}>
        {agenda.length ? <List disablePadding sx={{ mt: 1 }}>{agenda.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<CalendarToday />} title="Nothing scheduled" description="Your day is clear. Add something only if it matters." actionLabel="Add task" onAction={onAdd} />}
      </SectionAccordion>
      </>}
    </Stack>
  );
}
