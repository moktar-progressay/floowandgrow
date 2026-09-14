import { useEffect, useState } from 'react';
import { Box, Button, Dialog, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Close, Pause, PlayArrow, Refresh } from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';
import type { FocusTask } from '../../types/models';

export function FocusMode({ task, open, onClose, onComplete }: { task: FocusTask | null; open: boolean; onClose: () => void; onComplete: (task: FocusTask) => void }) {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { setRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!open) setRunning(false);
  }, [open]);
  const choose = (next: 'focus' | 'break') => {
    setMode(next); setSeconds(next === 'focus' ? 25 * 60 : 5 * 60); setRunning(false);
  };
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return <Dialog open={open} onClose={onClose} fullScreen>
    <Box minHeight="100dvh" display="grid" sx={{ background: 'radial-gradient(circle at center, rgba(37,185,244,.13), transparent 45%)' }}>
      <IconButton onClick={onClose} aria-label="Exit focus mode" sx={{ position: 'fixed', top: 20, right: 20 }}><Close /></IconButton>
      <Stack alignItems="center" justifyContent="center" textAlign="center" gap={3} p={3}>
        <Typography variant="overline" color="primary.main" letterSpacing={3}>{mode === 'focus' ? 'Focus sprint' : 'Dopamine break'}</Typography>
        <Typography variant="h3" fontWeight={800} maxWidth={720}>{task?.title || 'Take a breath'}</Typography>
        <FocusOrb size="clamp(160px, 35vw, 260px)" />
        <Typography variant="h2" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>{minutes}:{remainder}</Typography>
        <ToggleButtonGroup exclusive value={mode} onChange={(_, next) => next && choose(next)}>
          <ToggleButton value="focus">25 min focus</ToggleButton><ToggleButton value="break">5 min break</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" gap={1.5}>
          <Button variant="contained" startIcon={running ? <Pause /> : <PlayArrow />} onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Start'}</Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => choose(mode)}>Reset</Button>
          {task && <Button color="success" variant="outlined" onClick={() => onComplete(task)}>Complete</Button>}
        </Stack>
      </Stack>
    </Box>
  </Dialog>;
}
