import { useMemo, useState } from 'react';
import { Box, Button, List, Stack, Typography } from '@mui/material';
import { Add, Anchor, CalendarToday } from '@mui/icons-material';
import type { FocusProject, FocusTask } from '../../types/models';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { TaskRow } from '../tasks/TaskRow';
import { useAuth } from '../auth/AuthProvider';

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function TodayPage({
  tasks, projects, onAdd, onEdit, onToggle, onFocus, onRelax,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  onAdd: () => void;
  onEdit: (task: FocusTask) => void;
  onToggle: (task: FocusTask) => void;
  onFocus: (task: FocusTask) => void;
  onRelax: () => void;
}) {
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(localDate());
  const firstName = String(session?.user.user_metadata.first_name || session?.user.user_metadata.full_name || session?.user.email?.split('@')[0] || '').split(' ')[0];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const visible = useMemo(() => tasks.filter((task) => task.status !== 'archived' && (task.scheduled_date === selectedDate || (task.is_daily_anchor && task.recurrence === 'daily'))), [tasks, selectedDate]);
  const anchors = visible.filter((task) => task.is_daily_anchor);
  const agenda = visible.filter((task) => !task.is_daily_anchor);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return (
    <Stack maxWidth={760} mx="auto" gap={2.5}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800}>{greeting}{firstName ? `, ${firstName}` : ''}</Typography>
        <Typography color="text.secondary">Let’s make today feel lighter.</Typography>
      </Box>
      <Button onClick={onRelax} aria-label="Open guided breathing" sx={{ alignSelf: 'center', borderRadius: '50%', my: 5 }}>
        <FocusOrb size="clamp(175px, 42vw, 240px)" />
      </Button>
      <Typography textAlign="center" color="text.secondary" variant="caption" mt={-5}>Tap the orb to relax</Typography>
      <SurfaceCard>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" gap={1}><CalendarToday color="primary" /><Typography fontWeight={700}>Your day</Typography></Stack>
          <input aria-label="Selected date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={{ color: 'inherit', background: 'transparent', border: 0, font: 'inherit' }} />
        </Stack>
      </SurfaceCard>
      <SurfaceCard>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}><Anchor color="secondary" /><Typography variant="h6" fontWeight={700}>Daily Anchors</Typography></Stack>
          <Typography variant="caption" color="text.secondary">{anchors.filter((task) => task.status === 'completed').length} of {anchors.length} done</Typography>
        </Stack>
        {anchors.length ? <List disablePadding sx={{ mt: 1 }}>{anchors.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<Anchor />} title="No Daily Anchors" description="Add the small routines that steady your day." actionLabel="Add anchor" onAction={onAdd} />}
      </SurfaceCard>
      <SurfaceCard>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>Agenda</Typography>
          <Button startIcon={<Add />} onClick={onAdd}>Add task</Button>
        </Stack>
        {agenda.length ? <List disablePadding sx={{ mt: 1 }}>{agenda.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onFocus={() => onFocus(task)} />)}</List> : <EmptyState icon={<CalendarToday />} title="Nothing scheduled" description="Your day is clear. Add something only if it matters." actionLabel="Add task" onAction={onAdd} />}
      </SurfaceCard>
    </Stack>
  );
}
