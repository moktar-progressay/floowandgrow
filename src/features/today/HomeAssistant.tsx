import { type FormEvent, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Collapse, IconButton, Stack, TextField, Typography } from '@mui/material';
import { ArrowForward, AutoAwesome, Close, OpenInNew } from '@mui/icons-material';
import { streamFocusAgent, type AgentStreamEvent, type ConversationItem } from '../assistant/agentClient';

const starters = ['What next?', 'Plan today', 'What am I missing?'];

export function HomeAssistant({ expanded, onExpandedChange }: { expanded: boolean; onExpandedChange: (value: boolean) => void }) {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setInput('');
    setAnswer('');
    setError('');
    setBusy(true);
    onExpandedChange(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';
    try {
      await streamFocusAgent(trimmed, conversation, (event: AgentStreamEvent) => {
        if (event.type === 'text_delta') { streamed += event.delta; setAnswer(streamed); }
        if (event.type === 'error') setError(event.message);
      }, controller.signal);
      setConversation((current) => [...current, { role: 'user' as const, content: trimmed }, ...(streamed ? [{ role: 'assistant' as const, content: streamed }] : [])].slice(-8));
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') setError(caught instanceof Error ? caught.message : 'The Focus Assistant could not answer.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(input); };

  return <Stack width="100%" maxWidth={640} mx="auto" gap={1.25}>
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, border: 1, borderColor: 'divider', borderRadius: 999, bgcolor: 'background.paper', boxShadow: '0 10px 30px rgba(32,84,170,.06)' }}>
      <AutoAwesome color="primary" fontSize="small" />
      <TextField fullWidth variant="standard" placeholder="Ask what I should do next…" value={input} onFocus={() => onExpandedChange(true)} onChange={(event) => setInput(event.target.value)} disabled={busy} slotProps={{ input: { disableUnderline: true }, htmlInput: { maxLength: 3000, 'aria-label': 'Ask the Focus Assistant' } }} />
      {busy
        ? <IconButton aria-label="Stop assistant" onClick={() => abortRef.current?.abort()}><Close /></IconButton>
        : <IconButton type="submit" aria-label="Ask Focus Assistant" disabled={!input.trim()} sx={{ bgcolor: 'action.hover' }}><ArrowForward /></IconButton>}
    </Box>
    <Collapse in={expanded}>
      <Stack gap={1.25} alignItems="center" pt={0.5}>
        <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center">
          {starters.map((starter) => <Chip key={starter} size="small" label={starter} onClick={() => void ask(starter)} />)}
        </Stack>
        {busy && <Stack direction="row" gap={1} alignItems="center"><CircularProgress size={15} /><Typography variant="caption" color="text.secondary">Thinking calmly…</Typography></Stack>}
        {answer && <Box width="100%" px={{ xs: 1, sm: 2 }} py={1.5} borderLeft={3} borderColor="primary.main"><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{answer}</Typography></Box>}
        {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
        <Stack direction="row" gap={1}>
          <Button component={RouterLink} to="/assistant" size="small" endIcon={<OpenInNew />}>Open Focus Assistant</Button>
          <Button size="small" color="inherit" onClick={() => onExpandedChange(false)}>Collapse</Button>
        </Stack>
      </Stack>
    </Collapse>
  </Stack>;
}
