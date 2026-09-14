import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import type { FocusGoal, FocusProject, FocusTag, FocusTask, TaskDraft, TaskTag } from '../../types/models';
import { useNotice } from '../../app/AppProviders';
import { useTaskMutations } from '../data/useFocusData';

const emptyDraft = (): TaskDraft => ({
  title: '',
  priority: null,
  project_id: null,
  goal_id: null,
  scheduled_date: new Date().toISOString().slice(0, 10),
  scheduled_time: null,
  is_daily_anchor: false,
  tag_ids: [],
});

export function TaskDialog({
  open, onClose, task, projects, goals, tags, taskTags, onSaved, onBeforeDelete,
}: {
  open: boolean;
  onClose: () => void;
  task: FocusTask | null;
  projects: FocusProject[];
  goals: FocusGoal[];
  tags: FocusTag[];
  taskTags: TaskTag[];
  onSaved?: (taskId: string) => Promise<void>;
  onBeforeDelete?: (taskId: string) => Promise<void>;
}) {
  const { saveTask, deleteTask } = useTaskMutations();
  const { notify } = useNotice();
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(task ? {
      title: task.title,
      priority: task.priority,
      project_id: task.project_id,
      goal_id: task.goal_id,
      scheduled_date: task.scheduled_date,
      scheduled_time: task.scheduled_time?.slice(0, 5) ?? null,
      is_daily_anchor: task.is_daily_anchor,
      tag_ids: taskTags.filter((item) => item.task_id === task.id).map((item) => item.tag_id),
    } : emptyDraft());
  }, [open, task, taskTags]);

  const availableGoals = useMemo(
    () => goals.filter((goal) => goal.project_id === draft.project_id),
    [goals, draft.project_id],
  );

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

  const busy = saveTask.isPending || deleteTask.isPending;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Stack component="form" onSubmit={submit}>
        <DialogTitle>{task ? 'Edit task' : 'Add task'}</DialogTitle>
        <DialogContent>
          <Stack gap={2.25} pt={1}>
            <TextField label="Task title" multiline minRows={2} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required autoFocus />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField select fullWidth label="Priority" value={draft.priority ?? ''} onChange={(event) => setDraft({ ...draft, priority: (event.target.value || null) as TaskDraft['priority'] })}>
                <MenuItem value="">Standard</MenuItem><MenuItem value="red">Critical</MenuItem><MenuItem value="yellow">Important</MenuItem><MenuItem value="green">Flexible</MenuItem>
              </TextField>
              <TextField select fullWidth label="Project" value={draft.project_id ?? ''} onChange={(event) => setDraft({ ...draft, project_id: event.target.value || null, goal_id: null })}>
                <MenuItem value="">Inbox</MenuItem>
                {projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField select label="Goal" value={draft.goal_id ?? ''} disabled={!draft.project_id} onChange={(event) => setDraft({ ...draft, goal_id: event.target.value || null })}>
              <MenuItem value="">No goal</MenuItem>
              {availableGoals.map((goal) => <MenuItem key={goal.id} value={goal.id}>{goal.title}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField fullWidth label="Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={draft.scheduled_date ?? ''} onChange={(event) => setDraft({ ...draft, scheduled_date: event.target.value || null })} />
              <TextField fullWidth label="Time" type="time" slotProps={{ inputLabel: { shrink: true } }} value={draft.scheduled_time ?? ''} onChange={(event) => setDraft({ ...draft, scheduled_time: event.target.value || null })} />
            </Stack>
            <FormControlLabel control={<Checkbox checked={draft.is_daily_anchor} onChange={(event) => setDraft({ ...draft, is_daily_anchor: event.target.checked })} />} label="Daily Anchor" />
            {tags.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary" width="100%">Tags</Typography>
                {tags.map((tag) => {
                  const selected = draft.tag_ids.includes(tag.id);
                  return <Chip key={tag.id} label={tag.name} variant={selected ? 'filled' : 'outlined'} color={selected ? 'primary' : 'default'} onClick={() => setDraft({ ...draft, tag_ids: selected ? draft.tag_ids.filter((id) => id !== tag.id) : [...draft.tag_ids, tag.id] })} />;
                })}
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
