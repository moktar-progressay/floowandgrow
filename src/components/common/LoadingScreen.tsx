import { CircularProgress, Stack, Typography } from '@mui/material';

export function LoadingScreen({ label = 'Loading FocusOS…' }: { label?: string }) {
  return (
    <Stack minHeight="100dvh" alignItems="center" justifyContent="center" gap={2}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
