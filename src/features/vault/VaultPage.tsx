import { useMemo, useState, type FormEvent } from 'react';
import {
  Button, CardActionArea, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, CloudOff, DeleteOutline, Description, Edit, Launch, Lightbulb, Search } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useNotice } from '../../app/AppProviders';
import { useNoteMutations } from '../data/useFocusData';
import type { FocusGoal, FocusNote, FocusProject, FocusTag, NoteDraft, NoteTag, VaultDocument } from '../../types/models';

const emptyNote: NoteDraft = { title: '', content: '', project_id: null, goal_id: null, tag_ids: [] };

export function VaultPage({
  documents, notes, projects, goals, tags, noteTags, connected, onConnect,
}: {
  documents: VaultDocument[];
  notes: FocusNote[];
  projects: FocusProject[];
  goals: FocusGoal[];
  tags: FocusTag[];
  noteTags: NoteTag[];
  connected: boolean;
  onConnect: () => void;
}) {
  const [query, setQuery] = useState('');
  const [quickCapture, setQuickCapture] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState<FocusNote | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(emptyNote);
  const { saveNote, deleteNote } = useNoteMutations();
  const { notify } = useNotice();
  const normalisedQuery = query.trim().toLocaleLowerCase();
  const filteredNotes = useMemo(() => notes.filter((note) =>
    `${note.title} ${note.content}`.toLocaleLowerCase().includes(normalisedQuery)), [normalisedQuery, notes]);
  const filteredDocuments = useMemo(() => documents.filter((doc) =>
    doc.name.toLocaleLowerCase().includes(normalisedQuery)), [documents, normalisedQuery]);
  const availableGoals = goals.filter((goal) => goal.project_id === draft.project_id && goal.status !== 'archived');
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);
  const goalFor = (id: string | null) => goals.find((goal) => goal.id === id);

  const openNew = (content = '') => {
    setEditing(null);
    setDraft({ ...emptyNote, content });
    setNoteOpen(true);
  };
  const openEdit = (note: FocusNote) => {
    setEditing(note);
    setDraft({
      title: note.title,
      content: note.content,
      project_id: note.project_id,
      goal_id: note.goal_id,
      tag_ids: noteTags.filter((link) => link.note_id === note.id).map((link) => link.tag_id),
    });
    setNoteOpen(true);
  };
  const saveQuickCapture = async () => {
    const content = quickCapture.trim();
    if (!content) return;
    const firstLine = content.split(/\r?\n/).find(Boolean)?.trim() || 'Quick note';
    try {
      await saveNote.mutateAsync({ draft: { ...emptyNote, title: firstLine.slice(0, 160), content } });
      setQuickCapture('');
      notify('Brain dump saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save the note.', 'error');
    }
  };
  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await saveNote.mutateAsync({ id: editing?.id, draft });
      setNoteOpen(false);
      setDraft(emptyNote);
      setEditing(null);
      notify(editing ? 'Note updated.' : 'Note saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save the note.', 'error');
    }
  };
  const removeNote = async () => {
    if (!editing || !window.confirm(`Delete “${editing.title}”?`)) return;
    try {
      await deleteNote.mutateAsync(editing.id);
      setNoteOpen(false);
      setEditing(null);
      notify('Note deleted.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete the note.', 'error');
    }
  };
  const toggleTag = (tagId: string) => setDraft((current) => ({
    ...current,
    tag_ids: current.tag_ids.includes(tagId)
      ? current.tag_ids.filter((id) => id !== tagId)
      : [...current.tag_ids, tagId],
  }));

  return <>
    <PageHeader eyebrow="Capture" title="Second Brain" description="Save thoughts, notes and useful files before they disappear." action={<Button variant="contained" startIcon={<Add />} onClick={() => openNew()}>New note</Button>} />
    <SurfaceCard sx={{ mb: 2.5, bgcolor: 'rgba(37,185,244,.055)', borderColor: 'rgba(37,185,244,.22)' }}>
      <Stack gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1}><Lightbulb color="primary" /><Typography fontWeight={850}>Brain dump</Typography></Stack>
        <TextField multiline minRows={3} fullWidth placeholder="Write it down now. You can organise it later…" value={quickCapture} onChange={(event) => setQuickCapture(event.target.value)} />
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button onClick={() => { openNew(quickCapture); setQuickCapture(''); }} disabled={!quickCapture.trim()}>Add details</Button>
          <Button variant="contained" onClick={() => void saveQuickCapture()} disabled={!quickCapture.trim() || saveNote.isPending}>Save note</Button>
        </Stack>
      </Stack>
    </SurfaceCard>
    <TextField fullWidth placeholder="Search notes and documents" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ mb: 3 }} />

    <Typography variant="h6" fontWeight={850} mb={1.5}>Notes</Typography>
    {filteredNotes.length ? <Grid container spacing={2} mb={4}>{filteredNotes.map((note) => {
      const linkedTags = noteTags.filter((link) => link.note_id === note.id).map((link) => tags.find((tag) => tag.id === link.tag_id)).filter(Boolean) as FocusTag[];
      return <Grid key={note.id} size={{ xs: 12, md: 6 }}><SurfaceCard sx={{ height: '100%' }}>
        <Stack gap={1.25} height="100%">
          <Stack direction="row" alignItems="flex-start" gap={1}>
            <Lightbulb color="primary" />
            <Stack flex={1} minWidth={0}><Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{note.title}</Typography><Typography variant="caption" color="text.secondary">Updated {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(note.updated_at))}</Typography></Stack>
            <Tooltip title="Edit note"><IconButton size="small" onClick={() => openEdit(note)} aria-label={`Edit ${note.title}`}><Edit fontSize="small" /></IconButton></Tooltip>
          </Stack>
          {note.content && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.content}</Typography>}
          <Stack direction="row" gap={0.75} flexWrap="wrap" mt="auto">
            {projectFor(note.project_id) && <Chip size="small" label={projectFor(note.project_id)?.name} variant="outlined" />}
            {goalFor(note.goal_id) && <Chip size="small" label={goalFor(note.goal_id)?.title} variant="outlined" color="primary" />}
            {linkedTags.map((tag) => <Chip key={tag.id} size="small" label={tag.name} sx={tag.colour ? { borderColor: tag.colour } : undefined} variant="outlined" />)}
          </Stack>
        </Stack>
      </SurfaceCard></Grid>;
    })}</Grid> : <SurfaceCard sx={{ mb: 4 }}><EmptyState icon={<Lightbulb fontSize="large" />} title={notes.length ? 'No matching notes' : 'Your Second Brain is empty'} description={notes.length ? 'Try another search.' : 'Use Brain dump to capture your first thought or note.'} actionLabel={notes.length ? 'Clear search' : 'New note'} onAction={notes.length ? () => setQuery('') : () => openNew()} /></SurfaceCard>}

    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} mb={1.5}>
      <Typography variant="h6" fontWeight={850}>Files</Typography>
      {!connected && <Button onClick={onConnect}>Connect Google Drive</Button>}
    </Stack>
    {filteredDocuments.length ? <Grid container spacing={2}>{filteredDocuments.map((doc) => <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4 }}><SurfaceCard sx={{ height: '100%' }}><CardActionArea onClick={() => doc.link && window.open(doc.link, '_blank', 'noopener,noreferrer')} disabled={!doc.link}><Stack gap={1.5}><Description color="primary" /><Typography fontWeight={700}>{doc.name}</Typography><Typography variant="caption" color="text.secondary">{doc.tag || 'Document'} {doc.date ? `· ${doc.date}` : ''}</Typography>{doc.link && <Launch fontSize="small" />}</Stack></CardActionArea></SurfaceCard></Grid>)}</Grid> : <SurfaceCard><EmptyState icon={connected ? <Description fontSize="large" /> : <CloudOff fontSize="large" />} title={connected ? 'No matching files' : 'Connect Google Drive'} description={connected ? 'Try another search.' : 'Connect Google Workspace to search your Drive files here.'} actionLabel={connected ? undefined : 'Connect'} onAction={connected ? undefined : onConnect} /></SurfaceCard>}

    <Dialog open={noteOpen} onClose={saveNote.isPending ? undefined : () => setNoteOpen(false)} fullWidth maxWidth="sm">
      <Stack component="form" onSubmit={submitNote}>
        <DialogTitle>{editing ? 'Edit note' : 'New note'}</DialogTitle>
        <DialogContent><Stack gap={2} pt={1}>
          <TextField label="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required autoFocus />
          <TextField label="Note" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} multiline minRows={6} />
          <TextField select label="Project" value={draft.project_id ?? ''} onChange={(event) => setDraft({ ...draft, project_id: event.target.value || null, goal_id: null })}>
            <MenuItem value="">No project</MenuItem>{projects.filter((project) => project.name !== 'Daily Anchors').map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
          </TextField>
          <TextField select label="Goal" value={draft.goal_id ?? ''} disabled={!draft.project_id} onChange={(event) => setDraft({ ...draft, goal_id: event.target.value || null })}>
            <MenuItem value="">No goal</MenuItem>{availableGoals.map((goal) => <MenuItem key={goal.id} value={goal.id}>{goal.title}</MenuItem>)}
          </TextField>
          <Stack gap={1}><Typography variant="subtitle2">Tags</Typography><Stack direction="row" gap={0.75} flexWrap="wrap">{tags.map((tag) => <Chip key={tag.id} clickable label={tag.name} color={draft.tag_ids.includes(tag.id) ? 'primary' : 'default'} variant={draft.tag_ids.includes(tag.id) ? 'filled' : 'outlined'} onClick={() => toggleTag(tag.id)} />)}{!tags.length && <Typography variant="body2" color="text.secondary">Create tags from the task form, then reuse them here.</Typography>}</Stack></Stack>
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {editing && <Button color="error" startIcon={<DeleteOutline />} onClick={() => void removeNote()} disabled={deleteNote.isPending}>Delete</Button>}
          <Button onClick={() => setNoteOpen(false)} disabled={saveNote.isPending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saveNote.isPending || !draft.title.trim()}>{saveNote.isPending ? 'Saving…' : 'Save note'}</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  </>;
}
