import { Button, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { Archive, Inbox as InboxIcon, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { GoogleMessage } from '../../types/models';

export function InboxPage({ messages, connected, onConnect, onArchive, onCreateTask }: { messages: GoogleMessage[]; connected: boolean; onConnect: () => void; onArchive: (message: GoogleMessage) => void; onCreateTask: (message: GoogleMessage) => void }) {
  return <>
    <PageHeader title="Inbox" description="Turn messages into clear actions." action={!connected && <Button variant="contained" onClick={onConnect}>Connect Gmail</Button>} />
    <SurfaceCard>
      {messages.length ? <List disablePadding>{messages.map((message) => <ListItem key={message.id} divider alignItems="flex-start" secondaryAction={<Stack direction="row" gap={0.5}><Button size="small" startIcon={<TaskAlt />} onClick={() => onCreateTask(message)}>Task</Button><Button size="small" startIcon={<Archive />} onClick={() => onArchive(message)}>Archive</Button></Stack>}><ListItemText sx={{ pr: 20 }} primary={<Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={message.unread ? 800 : 600}>{message.subject || 'No subject'}</Typography>{message.unread && <Chip label="New" size="small" color="primary" />}</Stack>} secondary={<><Typography variant="caption" color="text.secondary">{message.from}</Typography><Typography variant="body2" color="text.secondary" noWrap>{message.snippet}</Typography></>} /></ListItem>)}</List> : <EmptyState icon={<InboxIcon fontSize="large" />} title={connected ? 'Inbox zero' : 'Gmail is not connected'} description={connected ? 'Nothing needs your attention right now.' : 'Connect Google Workspace to see your inbox.'} actionLabel={connected ? undefined : 'Connect Gmail'} onAction={connected ? undefined : onConnect} />}
    </SurfaceCard>
  </>;
}
