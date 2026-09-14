import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { BrandMark } from '../components/brand/BrandMark';

const recoveryKey = 'focusos-recovery-attempt';

export function refreshFocusOS() {
  const url = new URL(window.location.href);
  url.searchParams.set('refresh', Date.now().toString());
  window.location.replace(url.toString());
}

export function recoverStaleChunk(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const staleChunk = /chunkloaderror|dynamically imported module|loading chunk|importing a module script/i.test(message);
  if (!staleChunk || sessionStorage.getItem(recoveryKey)) return false;
  sessionStorage.setItem(recoveryKey, '1');
  refreshFocusOS();
  return true;
}

export function markAppLoaded() {
  sessionStorage.removeItem(recoveryKey);
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (recoverStaleChunk(error)) return;
    console.error('FocusOS render error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Box minHeight="100dvh" display="grid" sx={{ placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
        <Stack gap={2.5} alignItems="center" textAlign="center" maxWidth={420}>
          <BrandMark />
          <Typography component="h1" variant="h5" fontWeight={800}>FocusOS needs a quick refresh</Typography>
          <Typography color="text.secondary">Your work is safe. Refresh to load the latest version.</Typography>
          <Button variant="contained" size="large" startIcon={<Refresh />} onClick={refreshFocusOS}>Refresh FocusOS</Button>
        </Stack>
      </Box>
    );
  }
}
