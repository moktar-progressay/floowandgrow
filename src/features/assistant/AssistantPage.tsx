import { useMemo, useState } from 'react';
import { Alert, Button, Grid, Stack, TextField, Typography } from '@mui/material';
import { AutoAwesome, ContentCopy, PlayArrow } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { FocusTask } from '../../types/models';

function cleanMessage(raw: string) {
  const body = raw.trim().replace(/\bu\b/gi, 'you').replace(/\basap\b/gi, 'as soon as possible');
  if (!body) return '';
  return `Hi there,\n\n${body.charAt(0).toUpperCase() + body.slice(1)}${/[.!?]$/.test(body) ? '' : '.'}\n\nPlease let me know if you have any questions.\n\nBest regards`;
}

export function AssistantPage({ tasks, onFocus }: { tasks: FocusTask[]; onFocus: (task: FocusTask) => void }) {
  const next = useMemo(() => tasks.find((task) => task.status === 'open') || null, [tasks]);
  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState('');
  return <>
    <PageHeader title="Focus assistant" description="Useful shortcuts based only on your real tasks." />
    <Stack gap={2}>
      <SurfaceCard>
        <Typography variant="overline" color="primary.main">Suggested next action</Typography>
        {next ? <Stack gap={2} mt={1}><Typography variant="h5" fontWeight={800}>{next.title}</Typography><Button variant="contained" startIcon={<PlayArrow />} onClick={() => onFocus(next)} sx={{ alignSelf: 'flex-start' }}>Start focus</Button></Stack> : <Typography color="text.secondary" mt={1}>No open tasks.</Typography>}
      </SurfaceCard>
      <SurfaceCard>
        <Stack direction="row" gap={1} alignItems="center" mb={2}><AutoAwesome color="primary" /><Typography variant="h6" fontWeight={700}>Clean up a message</Typography></Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><Stack gap={1.5}><TextField multiline minRows={8} label="Rough message" value={raw} onChange={(event) => setRaw(event.target.value)} /><Button variant="contained" onClick={() => setDraft(cleanMessage(raw))}>Optimise draft</Button></Stack></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Alert severity="info" icon={false} sx={{ minHeight: 210, whiteSpace: 'pre-wrap' }}>{draft || 'Your clearer draft will appear here.'}</Alert>{draft && <Button startIcon={<ContentCopy />} onClick={() => void navigator.clipboard.writeText(draft)} sx={{ mt: 1 }}>Copy</Button>}</Grid>
        </Grid>
      </SurfaceCard>
    </Stack>
  </>;
}
