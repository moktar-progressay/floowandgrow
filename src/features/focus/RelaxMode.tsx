import { useEffect, useState } from 'react';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';

const phases = [{ label: 'Breathe in', seconds: 6 }, { label: 'Hold', seconds: 2 }, { label: 'Breathe out', seconds: 6 }];

export function RelaxMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!open) { setActive(false); setPhase(0); }
  }, [open]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setPhase((value) => (value + 1) % phases.length), phases[phase]!.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, phase]);
  return <Dialog open={open} onClose={onClose} fullScreen>
    <Box minHeight="100dvh" display="grid" sx={{ background: 'radial-gradient(circle at center, rgba(119,100,246,.15), transparent 48%)' }}>
      <IconButton onClick={onClose} aria-label="Exit breathing mode" sx={{ position: 'fixed', top: 20, right: 20 }}><Close /></IconButton>
      <Stack alignItems="center" justifyContent="center" textAlign="center" gap={7} p={3}>
        <Typography variant="overline" color="success.main" letterSpacing={4}>Breathe</Typography>
        <Box component="button" onClick={() => setActive((value) => !value)} aria-label={active ? 'Pause guided breathing' : 'Start guided breathing'} sx={{ appearance: 'none', border: 0, background: 'none', cursor: 'pointer' }}><FocusOrb size="clamp(205px, 55vw, 330px)" /></Box>
        <div><Typography variant="h5" color="primary.main" fontWeight={800}>{active ? phases[phase]!.label : 'Tap to begin'}</Typography><Typography color="text.secondary" mt={1}>Nothing else is required.</Typography></div>
      </Stack>
    </Box>
  </Dialog>;
}
