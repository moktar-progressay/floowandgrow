import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';

const keyFor = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export function CalendarPage({
  tasks, projects, events, googleConnected, googleError, onGoogleConnect,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  googleConnected: boolean;
  googleError?: string;
  onGoogleConnect: () => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index); return day;
    });
  }, [year, month]);
  const move = (amount: number) => setCursor(new Date(year, month + amount, 1));
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return <>
    <PageHeader
      title="Calendar"
      description="Your tasks and connected Google Calendar in one view."
      action={googleConnected
        ? <GoogleSourceChip service="calendar" color="success" />
        : <Button variant="contained" onClick={onGoogleConnect}>Connect Google Calendar</Button>}
    />
    {googleError && <Alert severity="warning" sx={{ mb: 2 }}>{googleError}</Alert>}
    <SurfaceCard>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Button onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft /></Button>
        <Typography variant="h6" fontWeight={800}>{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Typography>
        <Button onClick={() => move(1)} aria-label="Next month"><ChevronRight /></Button>
      </Stack>
      <Grid container columns={7} spacing={0.75}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => <Grid size={1} key={label}><Typography textAlign="center" variant="caption" color="text.secondary">{label}</Typography></Grid>)}
        {days.map((day) => {
          const key = keyFor(day);
          const dayTasks = tasks.filter((task) => task.scheduled_date === key && task.status !== 'archived');
          const dayEvents = events.filter((event) => event.start?.slice(0, 10) === key);
          const outside = day.getMonth() !== month;
          return <Grid size={1} key={key}>
            <Box minHeight={{ xs: 74, sm: 110 }} p={0.75} border={1} borderColor={key === keyFor() ? 'primary.main' : 'divider'} borderRadius={2} sx={{ opacity: outside ? 0.45 : 1, overflow: 'hidden' }}>
              <Typography variant="caption" fontWeight={key === keyFor() ? 800 : 500}>{day.getDate()}</Typography>
              <Stack gap={0.5} mt={0.5}>
                {dayTasks.slice(0, 2).map((task) => <Chip key={task.id} size="small" label={task.source === 'google_tasks' ? `Google • ${task.title}` : task.title} title={task.source === 'google_tasks' ? `Google Tasks: ${task.title}` : task.title} sx={{ justifyContent: 'flex-start', bgcolor: projectFor(task.project_id)?.colour || undefined, color: projectFor(task.project_id)?.colour ? '#fff' : undefined, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />)}
                {dayEvents.slice(0, 1).map((event) => <Chip key={event.id} size="small" variant="outlined" color="secondary" label={`Google • ${event.title || event.summary || 'Calendar event'}`} title={`Google Calendar: ${event.title || event.summary || 'Calendar event'}`} />)}
                {dayTasks.length + dayEvents.length > 3 && <Typography variant="caption" color="text.secondary">+{dayTasks.length + dayEvents.length - 3}</Typography>}
              </Stack>
            </Box>
          </Grid>;
        })}
      </Grid>
    </SurfaceCard>
  </>;
}
