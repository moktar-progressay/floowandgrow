import { useEffect, useState } from 'react';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';

const phases = [
  { label: 'Breathe in', seconds: 4 },
  { label: 'Hold', seconds: 1 },
  { label: 'Breathe out', seconds: 5 },
] as const;

export function RelaxMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setPhase((value) => (value + 1) % phases.length), phases[phase]!.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [open, phase]);
  return <Dialog open={open} onClose={onClose} fullScreen>
    <Box minHeight="100dvh" display="grid" sx={{ color: '#f4f7ff', background: 'radial-gradient(circle at center, rgba(49,104,218,.24), transparent 46%), #182338' }}>
      <IconButton onClick={onClose} aria-label="Exit breathing mode" sx={{ position: 'fixed', top: 20, right: 20, color: 'rgba(255,255,255,.88)' }}><Close /></IconButton>
      <Stack alignItems="center" justifyContent="center" textAlign="center" gap={{ xs: 3, sm: 4 }} p={3}>
        <Typography variant="overline" color="success.main" letterSpacing={4}>Breathe</Typography>
        <FocusOrb size="clamp(205px, 55vw, 330px)" activity="breathing" />
        <Stack alignItems="center" gap={1} aria-live="polite">
          <Typography variant="h5" color="#31b8ff" fontWeight={800}>{phases[phase]!.label}</Typography>
          <Typography color="rgba(225,232,247,.72)">Nothing else is required.</Typography>
          <Typography variant="body2" color="rgba(225,232,247,.56)">4 sec in · 1 sec hold · 5 sec out</Typography>
          <Stack direction="row" gap={{ xs: 1.5, sm: 3 }} mt={1.5} flexWrap="wrap" justifyContent="center">
            {phases.map((item, index) => (
              <Stack key={item.label} direction="row" alignItems="center" gap={0.75} color={index === phase ? '#31b8ff' : 'rgba(225,232,247,.48)'}>
                <Box width={7} height={7} borderRadius="50%" bgcolor="currentColor" boxShadow={index === phase ? '0 0 12px currentColor' : 'none'} />
                <Typography variant="caption" fontWeight={index === phase ? 700 : 500}>{item.label} {item.seconds}s</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  </Dialog>;
}
