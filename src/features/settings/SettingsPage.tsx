import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { Google, LinkOff, Refresh } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';

export function SettingsPage({ connected, email, error, onConnect, onRefresh, onDisconnect }: { connected: boolean; email?: string; error?: string; onConnect: () => void; onRefresh: () => void; onDisconnect: () => void }) {
  return <>
    <PageHeader title="Connections" description="Control which services FocusOS can access." />
    <SurfaceCard>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
        <Google color="primary" fontSize="large" />
        <div>
          <Typography variant="h6" fontWeight={700}>Google Workspace</Typography>
          <Typography color="text.secondary">Gmail, Calendar, Tasks and Drive</Typography>
          {email && <Typography variant="caption" color="text.secondary">{email}</Typography>}
        </div>
        <Chip label={connected ? 'Connected' : 'Not connected'} color={connected ? 'success' : 'default'} sx={{ ml: { sm: 'auto' } }} />
      </Stack>
      <Alert severity="info" sx={{ mt: 2 }}>Google credentials are encrypted and handled by the Supabase Edge Function. They are not stored in this browser.</Alert>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Stack direction="row" gap={1.5} mt={2}>
        {connected ? <><Button variant="contained" startIcon={<Refresh />} onClick={onRefresh}>Refresh</Button><Button color="error" startIcon={<LinkOff />} onClick={onDisconnect}>Disconnect</Button></> : <Button variant="contained" onClick={onConnect}>Connect Google Workspace</Button>}
      </Stack>
    </SurfaceCard>
  </>;
}
