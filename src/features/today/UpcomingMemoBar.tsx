import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { Close, EventAvailable } from '@mui/icons-material';
import type { FocusTask, GoogleEvent } from '../../types/models';
import { eventTime } from '../calendar/calendarDates';
import { taskDueAt } from '../tasks/taskReminders';

type MemoItem = { id: string; title: string; when: number; detail: string; allDay?: boolean };
const hiddenKey = 'focusos-upcoming-memo-hidden';

function initialHidden() {
  try { return window.localStorage.getItem(hiddenKey) === 'true'; }
  catch { return false; }
}

function eta(timestamp: number, now: number) {
  const minutes = Math.max(0, Math.ceil((timestamp - now) / 60_000));
  if (minutes < 60) return `In ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return `In ${hours}h${remainder ? ` ${remainder}m` : ''}`;
  return `In ${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function UpcomingMemoBar({ tasks, events }: { tasks: FocusTask[]; events: GoogleEvent[] }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const items = useMemo(() => {
    const horizon = now + 24 * 60 * 60_000;
    const taskItems: MemoItem[] = tasks
      .filter((task) => task.status === 'open' && !task.is_daily_anchor && task.scheduled_date)
      .map((task) => {
        const timestamp = taskDueAt(task)
          ?? new Date(`${task.scheduled_date}T23:59:00`).getTime();
        return { id: `task:${task.id}`, title: task.title, when: timestamp, detail: task.scheduled_time?.slice(0, 5) || 'Today' };
      })
      .filter((item) => item.when >= now && item.when <= horizon);
    const eventItems: MemoItem[] = events
      .map((event) => {
        const start = new Date(event.start).getTime();
        const allDay = /^\d{4}-\d{2}-\d{2}$/.test(event.start);
        const end = event.end ? new Date(event.end).getTime() : null;
        const ongoingAllDay = allDay && end !== null && Number.isFinite(end) && end > now;
        const timestamp = ongoingAllDay ? Math.max(start, now) : start;
        return { id: `event:${event.calendarId || 'calendar'}:${event.id}`, title: event.title || event.summary || 'Calendar event', when: timestamp, detail: allDay ? 'All day' : eventTime(event), allDay };
      })
      .filter((item) => Number.isFinite(item.when) && item.when <= horizon && (item.when >= now || item.allDay));
    return [...taskItems, ...eventItems].sort((a, b) => a.when - b.when).slice(0, 3);
    // Rebuild as time passes even if task and event props remain unchanged.
  }, [events, now, tasks]);

  const setVisibility = (nextHidden: boolean) => {
    setHidden(nextHidden);
    try { window.localStorage.setItem(hiddenKey, String(nextHidden)); }
    catch { /* The memo remains usable when browser storage is unavailable. */ }
  };

  if (!items.length) return null;
  if (hidden) return <Button size="small" variant="text" onClick={() => setVisibility(false)} sx={{ alignSelf: 'flex-start', mb: 1 }}>Show upcoming memo ({items.length})</Button>;

  return <Alert
    icon={<EventAvailable fontSize="small" />}
    severity="info"
    action={<IconButton size="small" aria-label="Hide upcoming memo" onClick={() => setVisibility(true)}><Close fontSize="small" /></IconButton>}
    sx={{ alignItems: 'flex-start', py: 0.75, '& .MuiAlert-message': { width: '100%', minWidth: 0 } }}
  >
    <Stack gap={0.75}>
      <Typography variant="subtitle2" fontWeight={850}>Coming up</Typography>
      {items.map((item) => <Box key={item.id} display="flex" alignItems="baseline" justifyContent="space-between" gap={1.5}>
        <Typography variant="body2" fontWeight={650} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{item.title}</Typography>
        <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{item.detail}{item.allDay ? '' : ` · ${eta(item.when, now)}`}</Typography>
      </Box>)}
    </Stack>
  </Alert>;
}
