import { useMemo, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, InputAdornment, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Archive, Inbox as InboxIcon, MarkEmailRead, Refresh, Search, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { GoogleMessage } from '../../types/models';
import { FilterButton, FilterDrawer } from '../../components/common/FilterDrawer';

export function InboxPage({ messages, connected, loading, error, onConnect, onRefresh, onOpen, onArchive, onCreateTask }: { messages: GoogleMessage[]; connected: boolean; loading: boolean; error?: string; onConnect: () => void; onRefresh: () => void; onOpen: (message: GoogleMessage) => void; onArchive: (message: GoogleMessage) => void; onCreateTask: (message: GoogleMessage) => void }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'unread'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = useMemo(() => messages.filter((message) => {
    if (view === 'unread' && !message.unread) return false;
    return `${message.subject || ''} ${message.from || ''} ${message.snippet || message.preview || ''}`.toLowerCase().includes(query.toLowerCase());
  }), [messages, query, view]);
  return <>
    <PageHeader title="Inbox" description="Turn messages into clear actions." action={!connected && !loading && <Button variant="contained" onClick={onConnect}>Connect Gmail</Button>} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} mb={2.5}>
      <TextField placeholder="Search emails" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ flex: 1 }} />
      <FilterButton activeCount={view === 'all' ? 0 : 1} onClick={() => setFiltersOpen(true)} />
    </Stack>
    <SurfaceCard>
      {error && <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRefresh}>Retry</Button>} sx={{ mb: 2 }}>Gmail could not load. {error}</Alert>}
      {filtered.length > 0 && <List disablePadding>{filtered.map((message) => <ListItem key={message.id} divider alignItems="flex-start" sx={{ flexDirection: { xs: 'column', md: 'row' }, gap: 1.25, py: 1.5 }}><ListItemText sx={{ m: 0, minWidth: 0, width: '100%', cursor: 'pointer' }} onClick={() => onOpen(message)} primary={<Stack direction="row" flexWrap="wrap" gap={1} alignItems="center"><Typography fontWeight={message.unread ? 800 : 600} sx={{ overflowWrap: 'anywhere' }}>{message.subject || 'No subject'}</Typography><GoogleSourceChip service="gmail" />{message.unread && <Chip label="New" size="small" color="primary" />}</Stack>} secondary={<><Typography variant="caption" color="text.secondary">{message.from}{message.date || message.time ? ` · ${message.date || message.time}` : ''}</Typography><Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{message.snippet || message.preview}</Typography></>} /><Stack direction="row" gap={0.5} flexWrap="wrap" flexShrink={0} alignSelf={{ xs: 'stretch', md: 'center' }} sx={{ '& .MuiButton-root': { flex: { xs: 1, sm: 'initial' } } }}><Button size="small" startIcon={<MarkEmailRead />} onClick={() => onOpen(message)}>Read</Button><Button size="small" startIcon={<TaskAlt />} onClick={() => onCreateTask(message)}>Task</Button><Button size="small" startIcon={<Archive />} onClick={() => onArchive(message)}>Archive</Button></Stack></ListItem>)}</List>}
      {!messages.length && loading && <Stack alignItems="center" gap={2} py={6}><CircularProgress /><Typography fontWeight={700}>{connected ? 'Loading your inbox…' : 'Checking your Google connection…'}</Typography></Stack>}
      {!filtered.length && !loading && !error && <EmptyState icon={<InboxIcon fontSize="large" />} title={messages.length ? 'No matching emails' : connected ? 'Inbox zero' : 'Gmail is not connected'} description={messages.length ? 'Try another search or filter.' : connected ? 'No messages were found in your recent inbox.' : 'Connect Google Workspace to see your inbox.'} actionLabel={messages.length ? 'Clear search' : connected ? 'Refresh inbox' : 'Connect Gmail'} onAction={messages.length ? () => { setQuery(''); setView('all'); } : connected ? onRefresh : onConnect} />}
    </SurfaceCard>
    <FilterDrawer open={filtersOpen} activeCount={view === 'all' ? 0 : 1} onClose={() => setFiltersOpen(false)} onClear={() => setView('all')} title="Email filters"><TextField select label="Show" value={view} onChange={(event) => setView(event.target.value as typeof view)}><MenuItem value="all">All emails</MenuItem><MenuItem value="unread">Unread only</MenuItem></TextField></FilterDrawer>
  </>;
}
