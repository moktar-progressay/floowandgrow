import { useEffect, useRef, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, CircularProgress,
  Dialog, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { AddTask, Check, Close, Edit, ExpandMore, Pause, PlayArrow, Refresh } from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';
import type { FocusTask } from '../../types/models';

type FocusModeProps = {
  task: FocusTask | null;
  open: boolean;
  onClose: () => void;
  onComplete: (task: FocusTask) => void;
  onAddTask: () => void;
  onRename?: (task: FocusTask, title: string) => Promise<void>;
  onSprintComplete?: (task: FocusTask, minutes: number, sessionId: string) => void;
};

export function FocusMode({ task, open, onClose, onComplete, onAddTask, onRename, onSprintComplete }: FocusModeProps) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTimer, setEditingTimer] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const sessionId = useRef<string | null>(null);
  const rewardedSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      return;
    }
    setTitle(task?.title || 'Take a breath');
    setNotes(task ? window.localStorage.getItem(`focusos-notes:${task.id}`) || '' : '');
    setDurationMinutes(25);
    setSeconds(25 * 60);
    setRunning(false);
    setEditingTitle(false);
    setEditingTimer(false);
    sessionId.current = null;
    rewardedSessionId.current = null;
  }, [open, task?.id, task?.title]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) {
        setRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || !task || !sessionId.current || rewardedSessionId.current === sessionId.current) return;
    rewardedSessionId.current = sessionId.current;
    onSprintComplete?.(task, durationMinutes, sessionId.current);
  }, [durationMinutes, onSprintComplete, seconds, task]);

  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds ? Math.min(100, Math.max(0, ((totalSeconds - seconds) / totalSeconds) * 100)) : 0;
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');

  const reset = (minutesValue = durationMinutes) => {
    setDurationMinutes(minutesValue);
    setSeconds(minutesValue * 60);
    setRunning(false);
    sessionId.current = null;
    rewardedSessionId.current = null;
  };

  const saveTitle = async () => {
    const next = title.trim();
    if (!next || !task || !onRename || next === task.title) {
      setTitle(next || task?.title || 'Take a breath');
      setEditingTitle(false);
      return;
    }
    await onRename(task, next);
    setEditingTitle(false);
  };

  const saveTimer = () => {
    const next = Math.min(120, Math.max(1, Math.round(durationMinutes || 25)));
    reset(next);
    setEditingTimer(false);
  };

  const saveNotes = (value: string) => {
    setNotes(value);
    if (task) window.localStorage.setItem(`focusos-notes:${task.id}`, value);
  };

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} fullScreen PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
      <Box
        minHeight="100dvh"
        width="100%"
        overflow="hidden"
        display="grid"
        sx={{
          bgcolor: 'background.default',
          backgroundImage: 'radial-gradient(circle at 50% 52%, rgba(37,185,244,.16), transparent 38%)',
          px: { xs: 2, sm: 4 },
          pt: 'max(24px, env(safe-area-inset-top))',
          pb: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <IconButton
          onClick={onClose}
          disabled={running}
          aria-label="Exit focus mode"
          sx={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', right: 12, zIndex: 2 }}
        >
          <Close />
        </IconButton>

        <Stack alignItems="center" justifyContent="center" textAlign="center" gap={{ xs: 2, sm: 2.5 }} width="100%" maxWidth={720} mx="auto">
          <Typography variant="overline" color="primary.main" letterSpacing={{ xs: 2, sm: 3 }} fontSize={{ xs: '.68rem', sm: '.78rem' }}>
            Focus sprint
          </Typography>

          {editingTitle ? (
            <Stack direction="row" alignItems="center" gap={0.5} width="100%" maxWidth={620}>
              <TextField autoFocus fullWidth multiline maxRows={3} value={title} onChange={(event) => setTitle(event.target.value)} inputProps={{ 'aria-label': 'Task title' }} />
              <IconButton aria-label="Save task title" onClick={() => void saveTitle()}><Check /></IconButton>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="flex-start" justifyContent="center" gap={0.25} width="100%" minWidth={0}>
              <Typography
                component="h1"
                fontWeight={850}
                sx={{
                  fontSize: 'clamp(1.55rem, 6.5vw, 3rem)',
                  lineHeight: 1.12,
                  maxWidth: 'min(100%, 620px)',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {title || task?.title || 'Take a breath'}
              </Typography>
              {task && onRename && <IconButton size="small" aria-label="Edit task title" onClick={() => setEditingTitle(true)} sx={{ mt: -.5, flexShrink: 0 }}><Edit fontSize="small" /></IconButton>}
            </Stack>
          )}

          <Box position="relative" display="grid" sx={{ width: 'clamp(168px, 50vw, 270px)', height: 'clamp(168px, 50vw, 270px)', placeItems: 'center' }}>
            <CircularProgress variant="determinate" value={100} size="100%" thickness={1.5} sx={{ position: 'absolute', color: 'rgba(143,164,194,.18)' }} />
            <CircularProgress variant="determinate" value={progress} size="100%" thickness={2.2} aria-label="Focus progress" sx={{ position: 'absolute', color: 'primary.main', filter: 'drop-shadow(0 0 8px rgba(37,185,244,.6))' }} />
            <FocusOrb size="clamp(138px, 42vw, 230px)" activity={running ? 'active' : 'calm'} />
          </Box>

          {editingTimer ? (
            <Stack direction="row" alignItems="center" gap={0.5}>
              <TextField autoFocus type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} inputProps={{ min: 1, max: 120, 'aria-label': 'Focus minutes' }} sx={{ width: 110 }} />
              <IconButton aria-label="Save focus timer" onClick={saveTimer}><Check /></IconButton>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" gap={0.25}>
              <Typography fontWeight={800} sx={{ fontSize: 'clamp(1.65rem, 8vw, 2.6rem)', fontVariantNumeric: 'tabular-nums' }}>{minutes}:{remainder}</Typography>
              <IconButton size="small" aria-label="Edit focus timer" onClick={() => { setRunning(false); setEditingTimer(true); }}><Edit fontSize="small" /></IconButton>
            </Stack>
          )}

          <Button fullWidth variant="contained" size="large" startIcon={running ? <Pause /> : <PlayArrow />} onClick={() => {
            if (!running && !sessionId.current) sessionId.current = crypto.randomUUID();
            setRunning((value) => !value);
          }} sx={{ maxWidth: 340, minHeight: 54, fontSize: '1.05rem' }}>
            {running ? 'Pause' : seconds === totalSeconds ? 'Start' : 'Continue'}
          </Button>

          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5} flexWrap="wrap">
            <Button size="small" color="inherit" startIcon={<Refresh />} onClick={() => reset()}>Reset</Button>
            {task && <Button size="small" color="success" onClick={() => onComplete(task)}>Complete</Button>}
            <Button size="small" startIcon={<AddTask />} onClick={onAddTask}>Add task</Button>
          </Stack>

          {task && (
            <Accordion disableGutters elevation={0} sx={{ width: '100%', maxWidth: 520, bgcolor: 'transparent', '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />} aria-controls="focus-notes-content">
                <Typography variant="body2" color="text.secondary">Notes</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <TextField fullWidth multiline minRows={3} label="Notes" value={notes} onChange={(event) => saveNotes(event.target.value)} />
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
