import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, IconButton, LinearProgress, Stack, Typography,
} from '@mui/material';
import { AccessTime, Close, Email, LocalFireDepartment, Star, TaskAlt } from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { RewardEvent } from '../../types/models';
import { momentumStreak, progressBounds, summariseProgress } from './gamification';

function yesterdayDate(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  return date;
}
function focusLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder ? `${remainder}m` : ''}`.trim() : `${minutes}m`;
}

export function YesterdayRecap({ events, autoOpen = false, showLauncher = false }: { events: RewardEvent[]; autoOpen?: boolean; showLauncher?: boolean }) {
  const date = useMemo(() => yesterdayDate(), []);
  const dateKey = date.toISOString().slice(0, 10);
  const summary = useMemo(() => summariseProgress(events, progressBounds('day', date)), [events, date]);
  const [open, setOpen] = useState(false);
  const hasProgress = summary.events.length > 0;

  useEffect(() => {
    if (autoOpen && hasProgress && window.localStorage.getItem(`focusos-recap-seen:${dateKey}`) !== 'yes') setOpen(true);
  }, [autoOpen, dateKey, hasProgress]);

  const close = () => {
    window.localStorage.setItem(`focusos-recap-seen:${dateKey}`, 'yes');
    setOpen(false);
  };

  if (!hasProgress) return null;
  const rows = [
    { label: 'Tasks completed', value: String(summary.tasks), icon: <TaskAlt color="primary" /> },
    { label: 'Emails processed', value: String(summary.emails), icon: <Email color="secondary" /> },
    { label: 'Focus time', value: focusLabel(summary.focusMinutes), icon: <AccessTime color="success" /> },
    { label: 'XP earned', value: `${summary.xp} XP`, icon: <Star color="secondary" /> },
    { label: 'Momentum streak', value: `${momentumStreak(events)} days`, icon: <LocalFireDepartment color="warning" /> },
  ];

  return <>
    {showLauncher && <Button fullWidth onClick={() => setOpen(true)} sx={{ justifyContent: 'space-between', px: 1, py: 1.25 }}>
        <Stack direction="row" alignItems="center" gap={1}><Star /><span>Yesterday recap</span></Stack>
        <Chip size="small" label={`+${summary.xp} XP`} color="success" />
      </Button>}
    <Dialog open={open} onClose={close} fullScreen>
      <DialogContent sx={{ p: { xs: 2, sm: 4 }, background: 'radial-gradient(circle at 50% 20%, rgba(37,185,244,.16), transparent 35%)' }}>
        <IconButton aria-label="Close recap" onClick={close} sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton>
        <Stack maxWidth={560} mx="auto" alignItems="center" textAlign="center" gap={2} pt={4}>
          <Typography component="h1" variant="h4" fontWeight={850}>Yesterday Recap</Typography>
          <Box position="relative" display="grid" sx={{ width: 190, height: 190, placeItems: 'center' }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(#25b9f4 ${Math.min(100, summary.xp / 3)}%, rgba(37,185,244,.12) 0)`, p: '7px' }}>
              <Box sx={{ width: '100%', height: '100%', borderRadius: '50%', bgcolor: 'background.default' }} />
            </Box>
            <FocusOrb size={145} activity="active" />
          </Box>
          <Stack gap={.25}>
            <Typography variant="h4" fontWeight={850}>You moved things forward.</Typography>
            <Typography color="text.secondary">Small wins still count.</Typography>
          </Stack>
          <Stack width="100%" gap={1}>
            {rows.map((row) => <SurfaceCard key={row.label} sx={{ py: 1.25 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                {row.icon}
                <Typography color="text.secondary" flex={1} textAlign="left">{row.label}</Typography>
                <Typography fontWeight={850}>{row.value}</Typography>
              </Stack>
            </SurfaceCard>)}
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(100, summary.xp / 3)} sx={{ width: '100%', height: 7, borderRadius: 9 }} />
          <Button fullWidth variant="contained" size="large" onClick={close} sx={{ minHeight: 54 }}>Continue</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  </>;
}
