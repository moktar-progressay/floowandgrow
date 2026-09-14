import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { Archive, AttachFile, AutoAwesome, CheckCircle, Close, Reply, TaskAlt } from '@mui/icons-material';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { GoogleMessage, GoogleMessageDetail } from '../../types/models';

export function EmailReaderDialog({
  open, message, onClose, onLoad, onComplete, onArchive, onCreateTask, onReply, onDraftReply,
}: {
  open: boolean;
  message: GoogleMessage | null;
  onClose: () => void;
  onLoad: (messageId: string) => Promise<GoogleMessageDetail>;
  onComplete: (message: GoogleMessage) => Promise<void>;
  onArchive: (message: GoogleMessage) => Promise<void>;
  onCreateTask: (message: GoogleMessage) => Promise<void>;
  onReply: (message: GoogleMessageDetail, reply: string) => Promise<void>;
  onDraftReply: (message: GoogleMessageDetail) => Promise<string>;
}) {
  const [detail, setDetail] = useState<GoogleMessageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!open || !message) return;
    let active = true;
    setDetail(null);
    setError(null);
    setReplyOpen(false);
    setReply('');
    void onLoad(message.id)
      .then((value) => { if (active) setDetail(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not open this email.'); });
    return () => { active = false; };
  }, [open, message, onLoad]);

  const run = async (action: () => Promise<void>, close = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (close) onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Email action failed.');
    } finally {
      setBusy(false);
    }
  };

  const summary = detail ?? message;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" fullScreen={false} PaperProps={{ sx: { minHeight: { xs: '100dvh', sm: '72vh' }, m: { xs: 0, sm: 2 }, borderRadius: { xs: 0, sm: 3 } } }}>
      <DialogTitle sx={{ pr: 7 }}>
        <Stack gap={1}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <GoogleSourceChip service="gmail" />
            {summary?.unread && <Chip label="Unread" size="small" color="primary" />}
          </Stack>
          <Typography variant="h5" component="h2" fontWeight={850}>{summary?.subject || 'Email'}</Typography>
          <Typography variant="body2" color="text.secondary">{summary?.from}</Typography>
        </Stack>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close email" sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: 3 }}>
        {!detail && !error && <Stack alignItems="center" justifyContent="center" gap={2} minHeight={280}><CircularProgress /><Typography>Opening full email…</Typography></Stack>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {detail && <Stack gap={2.5}>
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">To: {detail.to || 'You'}</Typography>
            {detail.cc && <Typography variant="caption" color="text.secondary">Cc: {detail.cc}</Typography>}
            {detail.date && <Typography variant="caption" color="text.secondary">{detail.date}</Typography>}
          </Stack>
          <Typography component="div" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{detail.text}</Typography>
          {detail.attachments.length > 0 && <Box>
            <Typography fontWeight={750} mb={1}>Attachments</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">{detail.attachments.map((attachment) => <Chip key={attachment.attachmentId} icon={<AttachFile />} label={attachment.filename} variant="outlined" />)}</Stack>
          </Box>}
          {replyOpen && <Stack gap={1.5}>
            <TextField multiline minRows={4} autoFocus label="Your reply" value={reply} onChange={(event) => setReply(event.target.value)} />
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button startIcon={<AutoAwesome />} disabled={busy} onClick={() => void run(async () => setReply(await onDraftReply(detail)))}>Draft with AI</Button>
              <Button variant="contained" startIcon={<Reply />} disabled={!reply.trim() || busy} onClick={() => void run(async () => { await onReply(detail, reply.trim()); setReply(''); setReplyOpen(false); })}>Approve and send</Button>
            </Stack>
          </Stack>}
        </Stack>}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <Button variant="contained" startIcon={<CheckCircle />} disabled={!detail || busy} onClick={() => message && void run(() => onComplete(message), true)}>Complete</Button>
        <Button startIcon={<Reply />} disabled={!detail || busy} onClick={() => setReplyOpen((value) => !value)}>Reply</Button>
        <Button startIcon={<AutoAwesome />} disabled={!detail || busy} onClick={() => detail && void run(async () => { setReplyOpen(true); setReply(await onDraftReply(detail)); })}>Draft with AI</Button>
        <Button startIcon={<TaskAlt />} disabled={!detail || busy} onClick={() => message && void run(() => onCreateTask(message))}>Follow-up task</Button>
        <Button startIcon={<Archive />} disabled={!detail || busy} onClick={() => message && void run(() => onArchive(message), true)}>Archive</Button>
      </DialogActions>
    </Dialog>
  );
}
