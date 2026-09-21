import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, ButtonBase, Dialog, DialogContent, DialogTitle, LinearProgress, Stack, Typography,
} from '@mui/material';
import { Close, LocalFireDepartment, Star, TaskAlt } from '@mui/icons-material';
import type { FocusTask, GoogleEvent, RewardEvent } from '../../types/models';
import { CalendarEventDialog } from '../../features/calendar/CalendarEventDialog';
import { momentumStreak, progressBounds, summariseProgress } from '../../features/gamification/gamification';
import { UpcomingNotices } from '../../features/today/UpcomingNotices';
import { localDate } from '../../features/tasks/taskDates';

function isAutomaticInboxItem(task: FocusTask) {
  const title = task.title.trim().toLocaleLowerCase();
  return task.source === 'gmail' || task.source === 'google_gmail' || title.startsWith('inbox follow-up:');
}

export function AppStatusControls({ tasks, events, unreadEmails, xp, rewardEvents, onEditTask }: {
  tasks: FocusTask[];
  events: GoogleEvent[];
  unreadEmails: number;
  xp: number;
  rewardEvents: RewardEvent[];
  onEditTask: (task: FocusTask) => void;
}) {
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const today = localDate();
  const todayProgress = useMemo(() => summariseProgress(rewardEvents, progressBounds('day')), [rewardEvents]);
  const remainingTasks = tasks.filter((task) => task.status === 'open' && !isAutomaticInboxItem(task) && (
    task.is_daily_anchor || Boolean(task.scheduled_date && task.scheduled_date <= today)
  )).length;
  const todayTotal = remainingTasks + todayProgress.tasks;
  const focusScore = todayTotal > 0 ? Math.round((todayProgress.tasks / todayTotal) * 100) : 100;
  const streak = momentumStreak(rewardEvents);
  const level = Math.floor(xp / 300) + 1;
  const levelXp = xp % 300;

  return <>
    <Stack direction="row" alignItems="center" gap={{ xs: 0.25, sm: 0.75 }}>
      <ButtonBase
        aria-label={`Open progress stats. Focus score ${focusScore} percent`}
        onClick={() => setProgressOpen(true)}
        sx={{ borderRadius: '50%', p: 0.25 }}
      >
        <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(#25b9f4 ${focusScore}%, rgba(37,185,244,.13) 0)`, p: '3px' }}>
          <Stack width="100%" height="100%" borderRadius="50%" bgcolor="background.paper" alignItems="center" justifyContent="center" lineHeight={1}>
            <Typography fontWeight={900} fontSize="0.76rem">{focusScore}%</Typography>
          </Stack>
        </Box>
      </ButtonBase>
      <UpcomingNotices tasks={tasks} events={events} unreadEmails={unreadEmails} onEditTask={onEditTask} onOpenEvent={setSelectedEvent} />
    </Stack>

    <Dialog open={progressOpen} onClose={() => setProgressOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <span>Today’s progress</span>
          <ButtonBase aria-label="Close progress stats" onClick={() => setProgressOpen(false)} sx={{ borderRadius: '50%', p: 1 }}><Close /></ButtonBase>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack alignItems="center" gap={2.5} pb={2}>
          <Box sx={{ width: 150, height: 150, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(#25b9f4 ${focusScore}%, rgba(37,185,244,.13) 0)`, p: '8px' }}>
            <Stack width="100%" height="100%" borderRadius="50%" bgcolor="background.paper" alignItems="center" justifyContent="center">
              <Typography variant="h3" fontWeight={900}>{focusScore}%</Typography>
              <Typography color="text.secondary">Focus score</Typography>
            </Stack>
          </Box>
          <Stack direction="row" justifyContent="space-around" width="100%" textAlign="center">
            <Stack alignItems="center"><LocalFireDepartment color="warning" /><Typography fontWeight={850}>{streak}</Typography><Typography variant="caption" color="text.secondary">Day streak</Typography></Stack>
            <Stack alignItems="center"><TaskAlt color="success" /><Typography fontWeight={850}>{todayProgress.tasks}/{todayTotal}</Typography><Typography variant="caption" color="text.secondary">Tasks</Typography></Stack>
            <Stack alignItems="center"><Star color="primary" /><Typography fontWeight={850}>{xp}</Typography><Typography variant="caption" color="text.secondary">Total XP</Typography></Stack>
          </Stack>
          <Stack width="100%" gap={0.5}>
            <Stack direction="row" justifyContent="space-between"><Typography fontWeight={750}>Level {level}</Typography><Typography variant="caption" color="text.secondary">{levelXp} of 300 XP</Typography></Stack>
            <LinearProgress variant="determinate" value={(levelXp / 300) * 100} sx={{ height: 7, borderRadius: 5 }} />
          </Stack>
          <Button component={RouterLink} to="/progress" fullWidth variant="contained" onClick={() => setProgressOpen(false)}>Open Progress & Awards</Button>
        </Stack>
      </DialogContent>
    </Dialog>
    <CalendarEventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
  </>;
}
