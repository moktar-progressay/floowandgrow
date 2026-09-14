import { useMemo, useState } from 'react';
import { Button, CardActionArea, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { CloudOff, Description, Launch, Search } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { VaultDocument } from '../../types/models';

export function VaultPage({ documents, connected, onConnect }: { documents: VaultDocument[]; connected: boolean; onConnect: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => documents.filter((doc) => doc.name.toLowerCase().includes(query.toLowerCase())), [documents, query]);
  return <>
    <PageHeader title="Second Brain Vault" description="Your files and Google Drive, in one search." action={!connected && <Button variant="contained" onClick={onConnect}>Connect Google Drive</Button>} />
    <TextField fullWidth placeholder="Search documents" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ mb: 3 }} />
    {filtered.length ? <Grid container spacing={2}>{filtered.map((doc) => <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4 }}><SurfaceCard sx={{ height: '100%' }}><CardActionArea onClick={() => doc.link && window.open(doc.link, '_blank', 'noopener,noreferrer')} disabled={!doc.link}><Stack gap={1.5}><Description color="primary" /><Typography fontWeight={700}>{doc.name}</Typography><Typography variant="caption" color="text.secondary">{doc.tag || 'Document'} {doc.date ? `· ${doc.date}` : ''}</Typography>{doc.link && <Launch fontSize="small" />}</Stack></CardActionArea></SurfaceCard></Grid>)}</Grid> : <SurfaceCard><EmptyState icon={connected ? <Description fontSize="large" /> : <CloudOff fontSize="large" />} title={connected ? 'No matching documents' : 'Connect Google Drive'} description={connected ? 'Try another search.' : 'Connect Google Workspace to search your real Drive files.'} actionLabel={connected ? undefined : 'Connect'} onAction={connected ? undefined : onConnect} /></SurfaceCard>}
  </>;
}
