import { Alert, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Google, LinkOff, Refresh, WhatsApp } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useWhatsAppConnection } from '../integrations/whatsapp';

export function SettingsPage({ connected, email, error, onConnect, onRefresh, onDisconnect }: { connected: boolean; email?: string; error?: string; onConnect: () => void; onRefresh: () => void; onDisconnect: () => void }) {
  const whatsapp = useWhatsAppConnection();
  const whatsappConnected = whatsapp.status.data?.connected ?? false;
  const whatsappBusy = whatsapp.status.isPending || whatsapp.connect.isPending || whatsapp.disconnect.isPending;
  const whatsappError = whatsapp.connect.error || whatsapp.disconnect.error || whatsapp.status.error;
  return <>
    <PageHeader title="Connections" description="Control which services FocusOS can access." />
    <Stack gap={2}>
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

      <SurfaceCard>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <WhatsApp sx={{ color: '#25D366', fontSize: 40 }} />
          <div>
            <Typography variant="h6" fontWeight={700}>WhatsApp Business</Typography>
            <Typography color="text.secondary">Turn new client messages into FocusOS tasks</Typography>
            {whatsapp.status.data?.phoneNumber && <Typography variant="caption" color="text.secondary" display="block">{whatsapp.status.data.verifiedName ? `${whatsapp.status.data.verifiedName} · ` : ''}{whatsapp.status.data.phoneNumber}</Typography>}
          </div>
          {whatsapp.status.isPending
            ? <CircularProgress size={24} sx={{ ml: { sm: 'auto' } }} />
            : <Chip label={whatsappConnected ? 'Connected' : 'Not connected'} color={whatsappConnected ? 'success' : 'default'} sx={{ ml: { sm: 'auto' } }} />}
        </Stack>
        <Alert severity="info" sx={{ mt: 2 }}>Your WhatsApp Business App remains available. Each new inbound message is added to Tasks with a green WhatsApp tag.</Alert>
        {whatsappError && <Alert severity="error" sx={{ mt: 2 }}>{whatsappError instanceof Error ? whatsappError.message : 'WhatsApp could not be connected.'}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mt={2}>
          {whatsappConnected ? <>
            <Button variant="contained" startIcon={<Refresh />} onClick={() => void whatsapp.status.refetch()} disabled={whatsappBusy}>Refresh</Button>
            <Button color="error" startIcon={<LinkOff />} onClick={() => whatsapp.disconnect.mutate()} disabled={whatsappBusy}>Disconnect</Button>
          </> : <Button variant="contained" startIcon={<WhatsApp />} onClick={() => whatsapp.connect.mutate()} disabled={whatsappBusy}>Connect WhatsApp Business</Button>}
        </Stack>
      </SurfaceCard>
    </Stack>
  </>;
}
