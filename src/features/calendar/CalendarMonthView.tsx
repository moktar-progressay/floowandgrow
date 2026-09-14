import { Box, ButtonBase, Chip, Grid, Stack, Typography } from '@mui/material';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';
import { dateKey, eventDateKey, monthGrid } from './calendarDates';

export function CalendarMonthView({ cursor, selectedDate, tasks, projects, events, onSelectDate, onEditTask, onOpenEvent }: {
  cursor: Date;
  selectedDate: string;
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  onSelectDate: (date: string) => void;
  onEditTask: (task: FocusTask) => void;
  onOpenEvent: (event: GoogleEvent) => void;
}) {
  const days = monthGrid(cursor);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return <Grid container columns={7} spacing={{ xs: 0.35, sm: 0.75 }}>
    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => <Grid size={1} key={label}><Typography textAlign="center" variant="caption" color="text.secondary">{label}</Typography></Grid>)}
    {days.map((day) => {
      const key = dateKey(day);
      const dayTasks = tasks.filter((task) => task.scheduled_date === key && task.status !== 'archived');
      const dayEvents = events.filter((event) => eventDateKey(event) === key);
      const outside = day.getMonth() !== cursor.getMonth();
      const selected = key === selectedDate;
      return <Grid size={1} key={key}>
        <Box minHeight={{ xs: 64, sm: 116 }} p={{ xs: 0.35, sm: 0.75 }} border={1} borderColor={selected ? 'primary.main' : key === dateKey() ? 'secondary.main' : 'divider'} borderRadius={2} sx={{ opacity: outside ? 0.45 : 1, overflow: 'hidden', boxShadow: selected ? '0 0 0 1px currentColor' : 'none' }}>
          <ButtonBase onClick={() => onSelectDate(key)} aria-label={`Show ${day.toLocaleDateString('en-GB')}`} sx={{ minWidth: 30, minHeight: 30, borderRadius: 1.5 }}>
            <Typography variant="caption" fontWeight={key === dateKey() || selected ? 800 : 500}>{day.getDate()}</Typography>
          </ButtonBase>
          <Stack direction={{ xs: 'row', sm: 'column' }} flexWrap={{ xs: 'wrap', sm: 'nowrap' }} gap={0.4} mt={0.25}>
            {dayTasks.slice(0, 2).map((task) => <Chip key={task.id} size="small" onClick={() => onEditTask(task)} label={task.title} title={task.title} sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'flex-start', bgcolor: projectFor(task.project_id)?.colour || undefined, color: projectFor(task.project_id)?.colour ? '#fff' : undefined, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />)}
            {dayEvents.slice(0, 2).map((event) => <Chip key={event.id} size="small" variant="outlined" color="secondary" onClick={() => onOpenEvent(event)} label={event.title || event.summary || 'Calendar event'} title={`Google Calendar: ${event.title || event.summary || 'Calendar event'}`} sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'flex-start', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />)}
            <Stack direction="row" gap={0.35} display={{ xs: 'flex', sm: 'none' }}>
              {dayTasks.slice(0, 3).map((task) => <Box key={task.id} component="span" width={6} height={6} borderRadius="50%" bgcolor={projectFor(task.project_id)?.colour || 'primary.main'} />)}
              {dayEvents.slice(0, 3).map((event) => <Box key={event.id} component="span" width={6} height={6} borderRadius="50%" bgcolor="secondary.main" />)}
            </Stack>
            {dayTasks.length + dayEvents.length > 4 && <Typography variant="caption" color="text.secondary">+{dayTasks.length + dayEvents.length - 4}</Typography>}
          </Stack>
        </Box>
      </Grid>;
    })}
  </Grid>;
}
