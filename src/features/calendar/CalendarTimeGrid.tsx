import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';
import { dateKey, eventDateKey, eventTime } from './calendarDates';

const startHour = 6;
const endHour = 23;
const hourHeight = 64;

export function CalendarTimeGrid({ days, tasks, projects, events, onSelectDate, onEditTask, onOpenEvent, onAddTask }: {
  days: Date[];
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  onSelectDate: (date: string) => void;
  onEditTask: (task: FocusTask) => void;
  onOpenEvent: (event: GoogleEvent) => void;
  onAddTask: (date: string) => void;
}) {
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);
  const columns = `52px repeat(${days.length}, minmax(0, 1fr))`;
  const blocks = days.flatMap((day, dayIndex) => {
    const key = dateKey(day);
    const taskBlocks = tasks.filter((task) => task.status !== 'archived' && task.scheduled_date === key && task.scheduled_time).map((task) => {
      const [hour = startHour, minute = 0] = task.scheduled_time!.slice(0, 5).split(':').map(Number);
      return { key: `task-${task.id}`, title: task.title, time: task.scheduled_time!.slice(0, 5), dayIndex, minutes: (hour - startHour) * 60 + minute, duration: 55, colour: projectFor(task.project_id)?.colour || '#25b9f4', onClick: () => onEditTask(task) };
    });
    const eventBlocks = events.filter((event) => eventDateKey(event) === key && eventTime(event) !== 'All day').map((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60_000);
      return { key: `event-${event.id}`, title: event.title || event.summary || 'Calendar event', time: eventTime(event), dayIndex, minutes: (start.getHours() - startHour) * 60 + start.getMinutes(), duration: Math.max(30, (end.getTime() - start.getTime()) / 60_000), colour: '#7c5cff', onClick: () => onOpenEvent(event) };
    });
    return [...taskBlocks, ...eventBlocks].filter((block) => block.minutes >= 0 && block.minutes < (endHour - startHour) * 60);
  });

  return <Box sx={{ overflow: 'auto', maxHeight: '64dvh', border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <Box minWidth={days.length === 1 ? 0 : 760}>
      <Box display="grid" gridTemplateColumns={columns} position="sticky" top={0} zIndex={3} bgcolor="background.paper" borderBottom={1} borderColor="divider">
        <Box />
        {days.map((day) => <ButtonBase key={dateKey(day)} onClick={() => onSelectDate(dateKey(day))} sx={{ py: 1 }}><Stack><Typography variant="caption" color="text.secondary">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</Typography><Typography fontWeight={dateKey(day) === dateKey() ? 800 : 600}>{day.getDate()}</Typography></Stack></ButtonBase>)}
      </Box>
      <Box position="relative" height={(endHour - startHour) * hourHeight}>
        {Array.from({ length: endHour - startHour }, (_, index) => <Box key={index} display="grid" gridTemplateColumns={columns} height={hourHeight}>
          <Typography variant="caption" color="text.secondary" textAlign="right" pr={1} pt={0.5} borderRight={1} borderBottom={1} borderColor="divider">{String(startHour + index).padStart(2, '0')}:00</Typography>
          {days.map((day) => <ButtonBase key={dateKey(day)} onClick={() => onAddTask(dateKey(day))} aria-label={`Add task on ${day.toLocaleDateString('en-GB')} at ${startHour + index}:00`} sx={{ display: 'block', borderRight: 1, borderBottom: 1, borderColor: 'divider' }} />)}
        </Box>)}
        {blocks.map((block) => <ButtonBase key={block.key} onClick={block.onClick} sx={{ position: 'absolute', left: `calc(52px + ((100% - 52px) / ${days.length}) * ${block.dayIndex} + 3px)`, width: `calc((100% - 52px) / ${days.length} - 6px)`, top: block.minutes / 60 * hourHeight, height: Math.max(38, block.duration / 60 * hourHeight), display: 'block', overflow: 'hidden', textAlign: 'left', borderLeft: 4, borderColor: block.colour, borderRadius: 1.5, px: 0.75, py: 0.5, bgcolor: 'action.hover', zIndex: 2 }}>
          <Typography variant="caption" fontWeight={800} display="block" noWrap>{block.title}</Typography><Typography variant="caption" color="text.secondary">{block.time}</Typography>
        </ButtonBase>)}
      </Box>
    </Box>
  </Box>;
}
