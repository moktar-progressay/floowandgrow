import { useMemo, useState, type MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { alpha, Badge, Box, Button, IconButton, ListItemButton, Popover, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { AccessAlarm, CalendarToday, Close, Email, NotificationsNone, PriorityHigh } from '@mui/icons-material';
import type { FocusTask, GoogleEvent } from '../../types/models';
import { eventDateKey, eventTime } from '../calendar/calendarDates';
import { localDate } from '../tasks/taskDates';

type Notice = {
  id: string;
  kind: 'event' | 'task' | 'email';
  title: string;
  detail: string;
  urgency: 'normal' | 'approaching' | 'now';
  event?: GoogleEvent;
  task?: FocusTask;
};

function relativeStart(start: string) {
  const time = new Date(start).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.round((time - Date.now()) / 60_000);
  if (minutes <= 0 && minutes > -60) return 'Happening now';
  if (minutes < 0) return '';
  if (minutes < 60) return `Starts in ${minutes} min${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `Starts in ${hours} hr${hours === 1 ? '' : 's'}${remainder ? ` ${remainder} mins` : ''}`;
}

function eventUrgency(start: string): Notice['urgency'] {
  const minutes = (new Date(start).getTime() - Date.now()) / 60_000;
  if (minutes <= 15) return 'now';
  if (minutes <= 90) return 'approaching';
  return 'normal';
}

export function UpcomingNotices({ tasks, events, unreadEmails = 0, onEditTask, onOpenEvent }: {
  tasks: FocusTask[];
  events: GoogleEvent[];
  unreadEmails?: number;
  onEditTask: (task: FocusTask) => void;
  onOpenEvent: (event: GoogleEvent) => void;
}) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const today = localDate();
  const notices = useMemo(() => {
    const calendarNotices: Notice[] = events
      .filter((event) => eventDateKey(event) === today && !/^inbox follow-up:/i.test(event.title || event.summary || ''))
      .filter((event) => !event.end || new Date(event.end).getTime() > Date.now())
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))
      .map((event) => ({ id: `event:${event.calendarId || 'calendar'}:${event.id}`, kind: 'event', title: event.title || event.summary || 'Calendar event', detail: [eventTime(event), relativeStart(event.start)].filter(Boolean).join(' · '), urgency: eventUrgency(event.start), event }));
    const taskNotices: Notice[] = tasks
      .filter((task) => task.status === 'open' && task.priority === 'red' && !task.is_daily_anchor)
      .filter((task) => task.scheduled_date === today || Boolean(task.scheduled_date && task.scheduled_date < today))
      .filter((task) => !task.source.includes('calendar') && !/^inbox follow-up:/i.test(task.title))
      .map((task) => ({ id: `task:${task.id}`, kind: 'task', title: task.title, detail: task.scheduled_date && task.scheduled_date < today ? 'High priority · overdue' : ['High priority', task.scheduled_time?.slice(0, 5)].filter(Boolean).join(' · '), urgency: task.scheduled_date && task.scheduled_date < today ? 'now' : 'approaching', task }));
    const emailNotices: Notice[] = unreadEmails > 0 ? [{ id: 'email:unread', kind: 'email', title: `${unreadEmails} unread email${unreadEmails === 1 ? '' : 's'}`, detail: 'Review when you have a clear moment', urgency: 'normal' }] : [];
    return [...calendarNotices, ...taskNotices, ...emailNotices]
      .filter((notice) => !dismissed.includes(notice.id))
      .sort((a, b) => ({ now: 0, approaching: 1, normal: 2 }[a.urgency] - { now: 0, approaching: 1, normal: 2 }[b.urgency]))
      .slice(0, 3);
  }, [dismissed, events, tasks, today, unreadEmails]);

  const open = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const dismiss = (id: string) => setDismissed((current) => [...current, id]);
  const colourFor = (urgency: Notice['urgency']) => urgency === 'now' ? 'error.main' : urgency === 'approaching' ? 'warning.main' : 'primary.main';

  return <>
    <IconButton aria-label={`Upcoming notices${notices.length ? `, ${notices.length}` : ''}`} onClick={open} sx={{ bgcolor: 'background.paper', boxShadow: '0 8px 28px rgba(27,62,125,.10)', border: 1, borderColor: 'divider' }}>
      <Badge badgeContent={notices.length} color="error"><NotificationsNone /></Badge>
    </IconButton>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { width: mobile ? 'calc(100vw - 32px)' : 350, maxHeight: '70vh', mt: 1, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none', bgcolor: alpha(theme.palette.background.paper, 0.94), backdropFilter: 'blur(18px)', boxShadow: '0 22px 60px rgba(28,55,105,.18)' } } }}>
      <Stack p={2} gap={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography fontWeight={850}>Upcoming</Typography><IconButton size="small" aria-label="Close upcoming notices" onClick={() => setAnchor(null)}><Close fontSize="small" /></IconButton></Stack>
        {!notices.length && <Typography color="text.secondary" variant="body2" py={2}>Nothing urgent needs your attention.</Typography>}
        {notices.map((notice) => <Box key={notice.id} borderRadius={2.5} bgcolor={notice.urgency === 'now' ? 'rgba(255,76,105,.08)' : notice.urgency === 'approaching' ? 'rgba(255,176,32,.09)' : 'action.hover'} overflow="hidden">
          <ListItemButton onClick={() => { if (notice.event) onOpenEvent(notice.event); else if (notice.task) onEditTask(notice.task); }} sx={{ alignItems: 'flex-start', gap: 1.25, py: 1.25 }}>
            <Box color={colourFor(notice.urgency)} mt={0.25}>{notice.kind === 'event' ? <CalendarToday /> : notice.kind === 'task' ? <PriorityHigh /> : <Email />}</Box>
            <Box flex={1} minWidth={0}><Typography fontWeight={800} variant="body2">{notice.title}</Typography><Typography variant="caption" color="text.secondary">{notice.detail}</Typography></Box>
          </ListItemButton>
          {notice.urgency !== 'normal' && <Stack direction="row" gap={0.5} px={1.25} pb={1}>
            <Button size="small" startIcon={<AccessAlarm />} onClick={() => dismiss(notice.id)}>Got it</Button>
          </Stack>}
        </Box>)}
        <Button component={RouterLink} to="/calendar" onClick={() => setAnchor(null)}>View all</Button>
      </Stack>
    </Popover>
  </>;
}
