import { Button, Stack, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';

export function LoadFailureScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack minHeight="100dvh" alignItems="center" justifyContent="center" gap={2} px={3} textAlign="center">
      <Typography component="h1" variant="h5" fontWeight={850}>FocusOS could not load</Typography>
      <Typography color="text.secondary" maxWidth={460}>{message}</Typography>
      <Button variant="contained" startIcon={<Refresh />} onClick={onRetry}>Try again</Button>
    </Stack>
  );
}
