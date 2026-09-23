import { useMemo, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, InputAdornment, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Archive, Inbox as InboxIcon, MarkEmailRead, OpenInNew, Refresh, Search, TaskAlt, WhatsApp } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { GoogleMessage } from '../../types/models';
import { FilterButton, FilterDrawer } from '../../components/common/FilterDrawer';
import { useWhatsAppConnection, type WhatsAppMessage } from '../integrations/whatsapp';

export function InboxPage({ messages, connected, loading, error, onConnect, onRefresh, onOpen, onArchive, onCreateTask }: { messages: GoogleMessage[]; connected: boolean; loading: boolean; error?: string; onConnect: () => void; onRefresh: () => void; onOpen: (message: GoogleMessage) => void; onArchive: (message: GoogleMessage) => void; onCreateTask: (message: GoogleMessage) => void }) {
  const whatsapp = useWhatsAppConnection();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'unread'>('all');
  const [source, setSource] = useState<'all' | 'gmail' | 'whatsapp'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const whatsappMessages = whatsapp.chats.data?.messages ?? [];
  const filteredEmails = useMemo(() => messages.filter((message) => {
    if (source === 'whatsapp') return false;
    if (view === 'unread' && !message.unread) return false;
    return `${message.subject || ''} ${message.from || ''} ${message.snippet || message.preview || ''}`.toLowerCase().includes(query.toLowerCase());
  }), [messages, query, source, view]);
  const filteredWhatsApp = useMemo(() => whatsappMessages.filter((message) => {
    if (source === 'gmail' || view === 'unread') return false;
    return `${message.contact_name || ''} ${message.from_phone || ''} ${message.to_phone || ''} ${message.message_text || ''}`.toLowerCase().includes(query.toLowerCase());
  }), [query, source, view, whatsappMessages]);
  const combined = useMemo(() => [
    ...filteredEmails.map((message) => ({ source: 'gmail' as const, timestamp: message.date || message.time || '', message })),
    ...filteredWhatsApp.map((message) => ({ source: 'whatsapp' as const, timestamp: message.message_timestamp || message.created_at, message })),
  ].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))), [filteredEmails, filteredWhatsApp]);
  const contactPhone = (message: WhatsAppMessage) => message.direction === 'inbound' ? message.from_phone : message.to_phone;
  const openWhatsApp = (message: WhatsAppMessage) => {
    const phone = String(contactPhone(message) || '').replace(/\D/g, '');
    if (phone) window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
  };
  const activeFilterCount = (view === 'all' ? 0 : 1) + (source === 'all' ? 0 : 1);
  return <>
    <PageHeader title="Inbox" description="Turn messages into clear actions." action={!connected && !loading && <Button variant="contained" onClick={onConnect}>Connect Gmail</Button>} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} mb={2.5}>
      <TextField placeholder="Search messages" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ flex: 1 }} />
      <FilterButton activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
    </Stack>
    <SurfaceCard>
      {error && <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRefresh}>Retry</Button>} sx={{ mb: 2 }}>Gmail could not load. {error}</Alert>}
      {whatsapp.createTask.isSuccess && <Alert severity="success" sx={{ mb: 2 }}>WhatsApp message added to Tasks.</Alert>}
      {whatsapp.createTask.error && <Alert severity="error" sx={{ mb: 2 }}>{whatsapp.createTask.error instanceof Error ? whatsapp.createTask.error.message : 'Could not create the WhatsApp task.'}</Alert>}
      {combined.length > 0 && <List disablePadding>{combined.map((item) => item.source === 'gmail' ? (() => { const message = item.message as GoogleMessage; return <ListItem key={`gmail:${message.id}`} divider alignItems="flex-start" sx={{ flexDirection: { xs: 'column', md: 'row' }, gap: 1.25, py: 1.5 }}><ListItemText sx={{ m: 0, minWidth: 0, width: '100%', cursor: 'pointer' }} onClick={() => onOpen(message)} primary={<Stack direction="row" flexWrap="wrap" gap={1} alignItems="center"><Typography fontWeight={message.unread ? 800 : 600} sx={{ overflowWrap: 'anywhere' }}>{message.subject || 'No subject'}</Typography><GoogleSourceChip service="gmail" />{message.unread && <Chip label="New" size="small" color="primary" />}</Stack>} secondary={<><Typography variant="caption" color="text.secondary">{message.from}{message.date || message.time ? ` · ${message.date || message.time}` : ''}</Typography><Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{message.snippet || message.preview}</Typography></>} /><Stack direction="row" gap={0.5} flexWrap="wrap" flexShrink={0} alignSelf={{ xs: 'stretch', md: 'center' }} sx={{ '& .MuiButton-root': { flex: { xs: 1, sm: 'initial' } } }}><Button size="small" startIcon={<MarkEmailRead />} onClick={() => onOpen(message)}>Read</Button><Button size="small" startIcon={<TaskAlt />} onClick={() => onCreateTask(message)}>Task</Button><Button size="small" startIcon={<Archive />} onClick={() => onArchive(message)}>Archive</Button></Stack></ListItem>; })() : (() => { const message = item.message as WhatsAppMessage; const phone = contactPhone(message); return <ListItem key={`whatsapp:${message.meta_message_id}`} divider alignItems="flex-start" sx={{ flexDirection: { xs: 'column', md: 'row' }, gap: 1.25, py: 1.5 }}><ListItemText sx={{ m: 0, minWidth: 0, width: '100%', cursor: 'pointer' }} onClick={() => openWhatsApp(message)} primary={<Stack direction="row" flexWrap="wrap" gap={1} alignItems="center"><Typography fontWeight={message.direction === 'inbound' ? 800 : 600} sx={{ overflowWrap: 'anywhere' }}>{message.contact_name || phone || 'WhatsApp contact'}</Typography><Chip size="small" icon={<WhatsApp />} label={message.direction === 'inbound' ? 'WhatsApp received' : 'WhatsApp sent'} sx={{ color: '#087b38', borderColor: '#25D366', bgcolor: 'rgba(37, 211, 102, .08)' }} variant="outlined" /></Stack>} secondary={<><Typography variant="caption" color="text.secondary">{message.message_timestamp ? new Date(message.message_timestamp).toLocaleString('en-GB') : ''}</Typography><Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{message.message_text || `${message.message_type} message`}</Typography></>} /><Stack direction="row" gap={0.5} flexWrap="wrap" flexShrink={0} alignSelf={{ xs: 'stretch', md: 'center' }} sx={{ '& .MuiButton-root': { flex: { xs: 1, sm: 'initial' } } }}><Button size="small" startIcon={<OpenInNew />} onClick={() => openWhatsApp(message)}>Open</Button><Button size="small" startIcon={<TaskAlt />} onClick={() => whatsapp.createTask.mutate(message.meta_message_id)} disabled={whatsapp.createTask.isPending}>Task</Button></Stack></ListItem>; })())}</List>}
      {!messages.length && loading && <Stack alignItems="center" gap={2} py={6}><CircularProgress /><Typography fontWeight={700}>{connected ? 'Loading your inbox…' : 'Checking your Google connection…'}</Typography></Stack>}
      {!combined.length && !loading && !whatsapp.chats.isPending && !error && <EmptyState icon={<InboxIcon fontSize="large" />} title={(messages.length || whatsappMessages.length) ? 'No matching messages' : connected ? 'Inbox zero' : 'No inbox connected'} description={(messages.length || whatsappMessages.length) ? 'Try another search or filter.' : 'Connect Gmail or WhatsApp to see messages here.'} actionLabel={(messages.length || whatsappMessages.length) ? 'Clear search' : connected ? 'Refresh inbox' : 'Connect Gmail'} onAction={(messages.length || whatsappMessages.length) ? () => { setQuery(''); setView('all'); setSource('all'); } : connected ? onRefresh : onConnect} />}
    </SurfaceCard>
    <FilterDrawer open={filtersOpen} activeCount={activeFilterCount} onClose={() => setFiltersOpen(false)} onClear={() => { setView('all'); setSource('all'); }} title="Inbox filters"><TextField select label="Source" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><MenuItem value="all">Gmail and WhatsApp</MenuItem><MenuItem value="gmail">Gmail</MenuItem><MenuItem value="whatsapp">WhatsApp</MenuItem></TextField><TextField select label="Show" value={view} onChange={(event) => setView(event.target.value as typeof view)}><MenuItem value="all">All messages</MenuItem><MenuItem value="unread">Unread Gmail only</MenuItem></TextField></FilterDrawer>
  </>;
}
