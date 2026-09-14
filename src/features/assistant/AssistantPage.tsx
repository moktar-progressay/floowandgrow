import { type FormEvent, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { ArrowUpward, AutoAwesome, Check, Close, PlayArrow } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { FocusOrb } from '../../components/brand/FocusOrb';
import type { FocusTask } from '../../types/models';
import { streamFocusAgent, type AgentProposal, type AgentStreamEvent, type ConversationItem } from './agentClient';

const starters = ['What should I do next?', 'What might I be missing?', 'Help me plan today'];

function toolLabel(name: string) {
  if (name === 'review_task_stream') return 'Checking your task stream';
  if (name === 'inspect_task') return 'Opening task details';
  if (name === 'prepare_task_action') return 'Preparing an action for approval';
  return 'Thinking';
}

function ProposalCard({ proposal, onApprove, onDismiss, disabled }: {
  proposal: AgentProposal;
  onApprove: (proposal: AgentProposal) => Promise<void>;
  onDismiss: () => void;
  disabled: boolean;
}) {
  const verb = proposal.action === 'focus' ? 'Start focus'
    : proposal.action === 'complete' ? 'Complete task'
      : proposal.action === 'create' ? 'Create task' : 'Update task';
  return <SurfaceCard sx={{ p: 2, border: '1px solid', borderColor: 'primary.main' }}>
    <Stack gap={1.5}>
      <Typography variant="overline" color="primary.main">Your approval needed</Typography>
      <Typography fontWeight={800}>{proposal.title || verb}</Typography>
      <Typography variant="body2" color="text.secondary">{proposal.reason}</Typography>
      <Stack direction="row" gap={1}>
        <Button variant="contained" startIcon={proposal.action === 'focus' ? <PlayArrow /> : <Check />} disabled={disabled} onClick={() => void onApprove(proposal)}>{verb}</Button>
        <IconButton aria-label="Dismiss suggestion" disabled={disabled} onClick={onDismiss}><Close /></IconButton>
      </Stack>
    </Stack>
  </SurfaceCard>;
}

export function AssistantPage({ tasks, onApproveProposal }: {
  tasks: FocusTask[];
  onApproveProposal: (proposal: AgentProposal) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setInput('');
    setAnswer('');
    setProposals([]);
    setError('');
    setStatus('Waking the Task Orb…');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';
    try {
      await streamFocusAgent(trimmed, conversation, (event: AgentStreamEvent) => {
        if (event.type === 'status') setStatus(event.message);
        if (event.type === 'tool') setStatus(toolLabel(event.name));
        if (event.type === 'text_delta') {
          streamed += event.delta;
          setAnswer(streamed);
          setStatus('');
        }
        if (event.type === 'proposal') setProposals((current) => [...current, event.proposal]);
        if (event.type === 'error') setError(event.message);
      }, controller.signal);
      setConversation((current) => [
        ...current,
        { role: 'user' as const, content: trimmed },
        ...(streamed ? [{ role: 'assistant' as const, content: streamed }] : []),
      ].slice(-8));
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') setError(caught instanceof Error ? caught.message : 'The Task Orb could not answer.');
    } finally {
      setBusy(false);
      setStatus('');
      abortRef.current = null;
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(input); };
  const approve = async (proposal: AgentProposal) => {
    setApproving(proposal.id);
    setError('');
    try {
      await onApproveProposal(proposal);
      setProposals((current) => current.filter((item) => item.id !== proposal.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That action could not be completed.');
    } finally {
      setApproving('');
    }
  };

  return <>
    <PageHeader title="Task Orb" description="Ask for help. Nothing changes until you approve it." />
    <Stack gap={2} sx={{ maxWidth: 760, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', py: { xs: 1, sm: 2 } }}>
        <Box sx={{ position: 'relative', width: { xs: 150, sm: 190 }, height: { xs: 150, sm: 190 }, display: 'grid', placeItems: 'center' }}>
          {busy && <CircularProgress size="100%" thickness={1.2} sx={{ position: 'absolute', color: 'primary.main', opacity: 0.7 }} />}
          <FocusOrb size={busy ? 132 : 120} activity={busy ? 'active' : 'calm'} />
        </Box>
        <Typography color="text.secondary" sx={{ minHeight: 24, mt: 1 }}>
          {status || (tasks.some((task) => task.status === 'open') ? 'Ready when you are' : 'Your task stream is clear')}
        </Typography>
      </Box>

      {!answer && !busy && <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
        {starters.map((starter) => <Chip key={starter} label={starter} onClick={() => void ask(starter)} sx={{ mb: 1 }} />)}
      </Stack>}

      {answer && <SurfaceCard sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" gap={1} alignItems="center" mb={1.5}><AutoAwesome color="primary" /><Typography fontWeight={800}>Task Orb</Typography></Stack>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{answer}</Typography>
      </SurfaceCard>}

      {proposals.map((proposal) => <ProposalCard
        key={proposal.id}
        proposal={proposal}
        disabled={Boolean(approving)}
        onApprove={approve}
        onDismiss={() => setProposals((current) => current.filter((item) => item.id !== proposal.id))}
      />)}
      {error && <Alert severity="error">{error}</Alert>}

      <SurfaceCard sx={{ p: 1.25, position: 'sticky', bottom: 12, zIndex: 2 }}>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={4} variant="standard" placeholder="Ask the Task Orb…"
            value={input} onChange={(event) => setInput(event.target.value)} disabled={busy}
            slotProps={{ input: { disableUnderline: true, sx: { px: 1, py: 0.75 } }, htmlInput: { maxLength: 3000 } }}
          />
          {busy
            ? <IconButton aria-label="Stop" onClick={() => abortRef.current?.abort()}><Close /></IconButton>
            : <IconButton color="primary" type="submit" aria-label="Ask Task Orb" disabled={!input.trim()} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}><ArrowUpward /></IconButton>}
        </Box>
      </SurfaceCard>
    </Stack>
  </>;
}
