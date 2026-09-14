import { Alert, Button, Chip, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { Archive, Inbox as InboxIcon, MarkEmailRead, Refresh, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { GoogleMessage } from '../../types/models';

export function InboxPage({ messages, connected, loading, error, onConnect, onRefresh, onOpen, onArchive, onCreateTask }: { messages: GoogleMessage[]; connected: boolean; loading: boolean; error?: string; onConnect: () => void; onRefresh: () => void; onOpen: (message: GoogleMessage) => void; onArchive: (message: GoogleMessage) => void; onCreateTask: (message: GoogleMessage) => void }) {
  return <>
    <PageHeader title="Inbox" description="Turn messages into clear actions." action={!connected && !loading && <Button variant="contained" onClick={onConnect}>Connect Gmail</Button>} />
    <SurfaceCard>
      {error && <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRefresh}>Retry</Button>} sx={{ mb: 2 }}>Gmail could not load. {error}</Alert>}
      {messages.length > 0 && <List disablePadding>{messages.map((message) => <ListItem key={message.id} divider alignItems="flex-start" sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}><ListItemText sx={{ m: 0, minWidth: 0, width: '100%', cursor: 'pointer' }} onClick={() => onOpen(message)} primary={<Stack direction="row" flexWrap="wrap" gap={1} alignItems="center"><Typography fontWeight={message.unread ? 800 : 600}>{message.subject || 'No subject'}</Typography><GoogleSourceChip service="gmail" />{message.unread && <Chip label="New" size="small" color="primary" />}</Stack>} secondary={<><Typography variant="caption" color="text.secondary">{message.from}{message.date || message.time ? ` · ${message.date || message.time}` : ''}</Typography><Typography variant="body2" color="text.secondary" noWrap>{message.snippet || message.preview}</Typography></>} /><Stack direction="row" gap={0.5} flexWrap="wrap" flexShrink={0} alignSelf={{ xs: 'flex-end', sm: 'center' }}><Button size="small" startIcon={<MarkEmailRead />} onClick={() => onOpen(message)}>Read</Button><Button size="small" startIcon={<TaskAlt />} onClick={() => onCreateTask(message)}>Task</Button><Button size="small" startIcon={<Archive />} onClick={() => onArchive(message)}>Archive</Button></Stack></ListItem>)}</List>}
      {!messages.length && loading && <Stack alignItems="center" gap={2} py={6}><CircularProgress /><Typography fontWeight={700}>{connected ? 'Loading your inbox…' : 'Checking your Google connection…'}</Typography></Stack>}
      {!messages.length && !loading && !error && <EmptyState icon={<InboxIcon fontSize="large" />} title={connected ? 'Inbox zero' : 'Gmail is not connected'} description={connected ? 'No messages were found in your recent inbox.' : 'Connect Google Workspace to see your inbox.'} actionLabel={connected ? 'Refresh inbox' : 'Connect Gmail'} onAction={connected ? onRefresh : onConnect} />}
    </SurfaceCard>
  </>;
}
