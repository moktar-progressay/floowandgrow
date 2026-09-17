import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { AccessTime, Add, CalendarToday, Flag, Folder, LocalOffer } from '@mui/icons-material';
import type { FocusGoal, FocusProject, FocusTag, FocusTask, TaskDraft, TaskTag } from '../../types/models';
import { useNotice } from '../../app/AppProviders';
import { useOrganisationMutations, useTaskMutations } from '../data/useFocusData';
import { localDate } from './taskDates';
import { activeQuickToken, currentLocalTime, matchingProjects, matchingTags, removeQuickToken } from './taskQuickEntry';

const emptyDraft = (initialDate?: string | null, initialProjectId?: string | null, initialGoalId?: string | null): TaskDraft => ({
  title: '',
  priority: null,
  project_id: initialProjectId || null,
  goal_id: initialGoalId || null,
  scheduled_date: initialDate || localDate(),
  scheduled_time: currentLocalTime(),
  is_daily_anchor: false,
  tag_ids: [],
});

export function TaskDialog({
  open, onClose, task, initialDate, initialProjectId, initialGoalId, projects, goals, tags, taskTags, onSaved, onBeforeDelete,
}: {
  open: boolean;
  onClose: () => void;
  task: FocusTask | null;
  initialDate?: string | null;
  initialProjectId?: string | null;
  initialGoalId?: string | null;
  projects: FocusProject[];
  goals: FocusGoal[];
  tags: FocusTag[];
  taskTags: TaskTag[];
  onSaved?: (taskId: string) => Promise<void>;
  onBeforeDelete?: (taskId: string) => Promise<void>;
}) {
  const { saveTask, deleteTask } = useTaskMutations();
  const { saveTag } = useOrganisationMutations();
  const { notify } = useNotice();
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [tagEntryOpen, setTagEntryOpen] = useState(false);
  const [tagEntry, setTagEntry] = useState('');

  useEffect(() => {
    if (!open) return;
    setTagEntryOpen(false);
    setTagEntry('');
    setDraft(task ? {
      title: task.title,
      priority: task.priority,
      project_id: task.project_id,
      goal_id: task.goal_id,
      scheduled_date: task.scheduled_date,
      scheduled_time: task.scheduled_time?.slice(0, 5) ?? null,
      is_daily_anchor: task.is_daily_anchor,
      tag_ids: taskTags.filter((item) => item.task_id === task.id).map((item) => item.tag_id),
    } : emptyDraft(initialDate, initialProjectId, initialGoalId));
  }, [open, task, initialDate, initialProjectId, initialGoalId, taskTags]);

  const availableGoals = useMemo(
    () => goals.filter((goal) => goal.project_id === draft.project_id),
    [goals, draft.project_id],
  );
  const quickToken = useMemo(() => activeQuickToken(draft.title), [draft.title]);
  const quickProjects = useMemo(
    () => quickToken?.type === 'project' ? matchingProjects(projects, quickToken.query) : [],
    [projects, quickToken],
  );
  const quickTags = useMemo(
    () => quickToken?.type === 'tag' ? matchingTags(tags, quickToken.query) : [],
    [tags, quickToken],
  );
  const selectedTags = tags.filter((tag) => draft.tag_ids.includes(tag.id));

  const selectProject = (project: FocusProject) => {
    if (!quickToken) return;
    setDraft({ ...draft, title: removeQuickToken(draft.title, quickToken), project_id: project.id, goal_id: null });
  };

  const selectTag = (tag: FocusTag, token = quickToken) => {
    setDraft({
      ...draft,
      title: token ? removeQuickToken(draft.title, token) : draft.title,
      tag_ids: draft.tag_ids.includes(tag.id) ? draft.tag_ids : [...draft.tag_ids, tag.id],
    });
    setTagEntry('');
    setTagEntryOpen(false);
  };

  const createAndSelectTag = async (name: string, token = quickToken) => {
    const cleanName = name.trim().replace(/^#/, '');
    if (!cleanName) return;
    const existing = tags.find((tag) => tag.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (existing) { selectTag(existing, token); return; }
    try {
      const tag = await saveTag.mutateAsync({ name: cleanName, colour: '#25b9f4' });
      setDraft((current) => ({
        ...current,
        title: token ? removeQuickToken(current.title, token) : current.title,
        tag_ids: current.tag_ids.includes(tag.id) ? current.tag_ids : [...current.tag_ids, tag.id],
      }));
      setTagEntry('');
      setTagEntryOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Tag could not be created.', 'error');
    }
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!quickToken || !['Enter', 'Tab'].includes(event.key)) return;
    if (quickToken.type === 'project' && quickProjects[0]) {
      event.preventDefault();
      selectProject(quickProjects[0]);
    } else if (quickToken.type === 'tag') {
      event.preventDefault();
      if (quickTags[0]) selectTag(quickTags[0]);
      else void createAndSelectTag(quickToken.query);
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    try {
      const taskId = await saveTask.mutateAsync({ id: task?.id, draft });
      if (onSaved) {
        try { await onSaved(taskId); }
        catch { notify('Task saved in FocusOS, but Google sync needs another try.', 'warning'); onClose(); return; }
      }
      notify(task
        ? onSaved ? 'Task updated and synced.' : 'Task updated.'
        : onSaved ? 'Task added and synced.' : 'Task added.');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Task could not be saved.', 'error');
    }
  }

  async function remove() {
    if (!task || !window.confirm('Delete this task?')) return;
    try {
      let googleRemoved = true;
      if (onBeforeDelete) {
        try { await onBeforeDelete(task.id); }
        catch { googleRemoved = false; }
      }
      await deleteTask.mutateAsync(task.id);
      notify(googleRemoved ? 'Task deleted.' : 'Task deleted from FocusOS. The Google copy may remain.', googleRemoved ? 'success' : 'warning');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Task could not be deleted.', 'error');
    }
  }

  const busy = saveTask.isPending || deleteTask.isPending || saveTag.isPending;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Stack component="form" onSubmit={submit}>
        <DialogTitle>{task ? 'Edit task' : 'Add task'}</DialogTitle>
        <DialogContent>
          <Stack gap={2.25} pt={1}>
            <TextField
              label="Task title"
              placeholder="What needs doing? Use @project or #tag"
              multiline
              minRows={2}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              onKeyDown={handleTitleKeyDown}
              helperText="Shortcut: type @ for a project or # for a tag, then press Enter."
              required
              autoFocus
            />
            {quickToken && (
              <Stack gap={0.75} mt={-1.25} p={1.25} border={1} borderColor="divider" borderRadius={2}>
                <Typography variant="caption" color="text.secondary">
                  {quickToken.type === 'project' ? 'Choose project' : 'Choose or create tag'}
                </Typography>
                <Stack direction="row" gap={0.75} flexWrap="wrap">
                  {quickToken.type === 'project' && quickProjects.map((project) => (
                    <Chip key={project.id} icon={<Folder />} label={project.name} onClick={() => selectProject(project)} />
                  ))}
                  {quickToken.type === 'tag' && quickTags.map((tag) => (
                    <Chip key={tag.id} icon={<LocalOffer />} label={tag.name} onClick={() => selectTag(tag)} />
                  ))}
                  {quickToken.type === 'tag' && quickToken.query && !quickTags.some((tag) => tag.name.toLocaleLowerCase() === quickToken.query.toLocaleLowerCase()) && (
                    <Chip color="primary" icon={<Add />} label={`Create #${quickToken.query}`} onClick={() => void createAndSelectTag(quickToken.query)} />
                  )}
                  {quickToken.type === 'project' && quickProjects.length === 0 && <Typography variant="body2" color="text.secondary">No matching project.</Typography>}
                </Stack>
              </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField select fullWidth label="Priority" value={draft.priority ?? ''} onChange={(event) => setDraft({ ...draft, priority: (event.target.value || null) as TaskDraft['priority'] })} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Flag fontSize="small" /></InputAdornment> } }}>
                <MenuItem value="">Standard</MenuItem><MenuItem value="red">Critical</MenuItem><MenuItem value="yellow">Important</MenuItem><MenuItem value="green">Flexible</MenuItem>
              </TextField>
              <TextField select fullWidth label="Project" value={draft.project_id ?? ''} onChange={(event) => setDraft({ ...draft, project_id: event.target.value || null, goal_id: null })} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Folder fontSize="small" /></InputAdornment> } }}>
                <MenuItem value="">Inbox</MenuItem>
                {projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField select label="Goal" value={draft.goal_id ?? ''} disabled={!draft.project_id} onChange={(event) => setDraft({ ...draft, goal_id: event.target.value || null })}>
              <MenuItem value="">No goal</MenuItem>
              {availableGoals.map((goal) => <MenuItem key={goal.id} value={goal.id}>{goal.title}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField fullWidth label="Date" type="date" slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarToday fontSize="small" /></InputAdornment> } }} value={draft.scheduled_date ?? ''} onChange={(event) => setDraft({ ...draft, scheduled_date: event.target.value || null })} />
              <TextField fullWidth label="Time" type="time" slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><AccessTime fontSize="small" /></InputAdornment> } }} value={draft.scheduled_time ?? ''} onChange={(event) => setDraft({ ...draft, scheduled_time: event.target.value || null })} />
            </Stack>
            <FormControlLabel control={<Checkbox checked={draft.is_daily_anchor} onChange={(event) => setDraft({ ...draft, is_daily_anchor: event.target.checked })} />} label="Daily Anchor" />
            <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
              {selectedTags.map((tag) => (
                <Chip key={tag.id} icon={<LocalOffer />} label={tag.name} onDelete={() => setDraft({ ...draft, tag_ids: draft.tag_ids.filter((id) => id !== tag.id) })} />
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => setTagEntryOpen((value) => !value)}>Tag</Button>
            </Stack>
            {tagEntryOpen && (
              <Stack gap={1}>
                <TextField
                  size="small"
                  label="Add tag"
                  value={tagEntry}
                  onChange={(event) => setTagEntry(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    const match = matchingTags(tags.filter((tag) => !draft.tag_ids.includes(tag.id)), tagEntry)[0];
                    if (match) selectTag(match, null);
                    else void createAndSelectTag(tagEntry, null);
                  }}
                  helperText="Choose an existing tag below, or type a new name and press Enter."
                  autoFocus
                />
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {matchingTags(tags.filter((tag) => !draft.tag_ids.includes(tag.id)), tagEntry).map((tag) => (
                    <Chip key={tag.id} label={tag.name} variant="outlined" onClick={() => selectTag(tag, null)} />
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {task && <Button color="error" onClick={remove} disabled={busy}>Delete</Button>}
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save task'}</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
