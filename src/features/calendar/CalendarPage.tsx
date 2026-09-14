import { useMemo, useState } from 'react';
import { Alert, Button, ButtonGroup, Divider, List, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add, ChevronLeft, ChevronRight, OpenInNew, Today } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import { TaskRow } from '../tasks/TaskRow';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarTimeGrid } from './CalendarTimeGrid';
import { dateFromKey, dateKey, daysForView, eventDateKey, eventTime, startOfWeek, type CalendarView } from './calendarDates';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';

type CalendarPageProps = {
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  googleConnected: boolean;
  googleError?: string;
  onGoogleConnect: () => void;
  onAddTask: (date: string) => void;
  onEditTask: (task: FocusTask) => void;
  onToggleTask: (task: FocusTask) => void;
  onHideTask: (task: FocusTask) => void;
  onFocusTask: (task: FocusTask) => void;
};

export function CalendarPage({ tasks, projects, events, googleConnected, googleError, onGoogleConnect, onAddTask, onEditTask, onToggleTask, onHideTask, onFocusTask }: CalendarPageProps) {
  const today = dateKey();
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(today);
  const [cursor, setCursor] = useState(() => dateFromKey(today));
  const selected = dateFromKey(selectedDate);

  const selectedTasks = useMemo(() => tasks
    .filter((task) => task.scheduled_date === selectedDate && task.status !== 'archived')
    .sort((a, b) => String(a.scheduled_time || '99:99').localeCompare(String(b.scheduled_time || '99:99'))), [tasks, selectedDate]);
  const selectedEvents = useMemo(() => events.filter((event) => eventDateKey(event) === selectedDate), [events, selectedDate]);
  const visibleDays = view === 'month' ? [] : daysForView(selectedDate, view);

  const periodLabel = view === 'day'
    ? selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : view === 'week'
      ? `${startOfWeek(selected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${(visibleDays.at(-1) || selected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const move = (amount: number) => {
    const next = new Date(view === 'month' ? cursor : selected);
    if (view === 'month') next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount * (view === 'week' ? 7 : 1));
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    setSelectedDate(dateKey(next));
  };
  const goToday = () => { setSelectedDate(today); setCursor(dateFromKey(today)); };
  const selectDate = (key: string) => { setSelectedDate(key); setCursor(new Date(dateFromKey(key).getFullYear(), dateFromKey(key).getMonth(), 1)); };
  const openEvent = (event: GoogleEvent) => { if (event.link) window.open(event.link, '_blank', 'noopener,noreferrer'); };
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return <>
    <PageHeader
      title="Calendar"
      description="Plan tasks beside your Google Calendar."
      action={<Button variant="contained" startIcon={<Add />} onClick={() => onAddTask(selectedDate)}>Add task</Button>}
    />
    {googleError && <Alert severity="warning" sx={{ mb: 2 }}>{googleError}</Alert>}
    {!googleConnected && <Alert severity="info" action={<Button color="inherit" onClick={onGoogleConnect}>Connect</Button>} sx={{ mb: 2 }}>Connect Google Calendar to include your events.</Alert>}
    <SurfaceCard>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2}>
        <ToggleButtonGroup exclusive fullWidth={false} size="small" value={view} onChange={(_, next: CalendarView | null) => next && setView(next)} aria-label="Calendar view">
          <ToggleButton value="day">Day</ToggleButton><ToggleButton value="week">Week</ToggleButton><ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
        <Button startIcon={<Today />} onClick={goToday}>Today</Button>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2}>
        <ButtonGroup variant="outlined" size="small"><Button onClick={() => move(-1)} aria-label="Previous period"><ChevronLeft /></Button><Button onClick={() => move(1)} aria-label="Next period"><ChevronRight /></Button></ButtonGroup>
        <Typography variant="h6" fontWeight={800} textAlign="right">{periodLabel}</Typography>
      </Stack>
      {view === 'month'
        ? <CalendarMonthView cursor={cursor} selectedDate={selectedDate} tasks={tasks} projects={projects} events={events} onSelectDate={selectDate} onEditTask={onEditTask} onOpenEvent={openEvent} />
        : <CalendarTimeGrid days={visibleDays} tasks={tasks} projects={projects} events={events} onSelectDate={selectDate} onEditTask={onEditTask} onOpenEvent={openEvent} onAddTask={onAddTask} />}
      <Stack direction="row" flexWrap="wrap" gap={2} mt={2}>
        <Typography variant="caption" color="text.secondary">● FocusOS task</Typography>
        <Typography variant="caption" color="secondary.main">● Google Calendar</Typography>
      </Stack>
    </SurfaceCard>
    <SurfaceCard sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={1.5}>
        <Stack minWidth={0}><Typography fontWeight={800}>{selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography><Typography variant="caption" color="text.secondary">{selectedTasks.length + selectedEvents.length} scheduled</Typography></Stack>
        <Button startIcon={<Add />} onClick={() => onAddTask(selectedDate)}>Task</Button>
      </Stack>
      <Divider />
      {selectedTasks.length > 0 && <List disablePadding>{selectedTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onEdit={() => onEditTask(task)} onToggle={() => onToggleTask(task)} onHide={() => onHideTask(task)} onFocus={() => onFocusTask(task)} />)}</List>}
      {selectedEvents.map((event) => <Stack key={event.id} direction="row" alignItems="center" gap={1.5} py={1.5} borderBottom={1} borderColor="divider">
        <GoogleSourceChip service="calendar" />
        <Stack flex={1} minWidth={0}><Typography fontWeight={700} noWrap>{event.title || event.summary || 'Calendar event'}</Typography><Typography variant="caption" color="text.secondary">{eventTime(event)}{event.location ? ` · ${event.location}` : ''}</Typography></Stack>
        {event.link && <Button component="a" href={event.link} target="_blank" rel="noopener" size="small" startIcon={<OpenInNew />}>Open</Button>}
      </Stack>)}
      {!selectedTasks.length && !selectedEvents.length && <Typography color="text.secondary" py={3} textAlign="center">Nothing scheduled. Add a task for this day.</Typography>}
    </SurfaceCard>
  </>;
}
