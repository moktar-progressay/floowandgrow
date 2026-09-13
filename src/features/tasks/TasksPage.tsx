import { useMemo, useState } from 'react';
import { Button, InputAdornment, List, MenuItem, Stack, Tab, Tabs, TextField } from '@mui/material';
import { Add, Search, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { TaskRow } from './TaskRow';
import type { FocusProject, FocusTask } from '../../types/models';

export function TasksPage({
  tasks, projects, onEdit, onToggle, onFocus, onAdd,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  onEdit: (task: FocusTask) => void;
  onToggle: (task: FocusTask) => void;
  onFocus: (task: FocusTask) => void;
  onAdd: () => void;
}) {
  const [tab, setTab] = useState<'today' | 'upcoming' | 'all'>('today');
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => tasks.filter((task) => {
    if (task.status === 'archived') return false;
    if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (projectId !== 'all' && (task.project_id ?? 'inbox') !== projectId) return false;
    if (tab === 'today') return task.scheduled_date === today || task.is_daily_anchor;
    if (tab === 'upcoming') return Boolean(task.scheduled_date && task.scheduled_date > today);
    return true;
  }), [tasks, query, projectId, tab, today]);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  return (
    <>
      <PageHeader
        eyebrow="Organise"
        title="Tasks"
        description="One task list, shown in the way you need."
        action={<Button variant="contained" startIcon={<Add />} onClick={onAdd}>Add task</Button>}
      />
      <SurfaceCard>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab value="today" label="Today" />
          <Tab value="upcoming" label="Upcoming" />
          <Tab value="all" label="All" />
        </Tabs>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
          <TextField
            fullWidth
            placeholder="Search tasks"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
          />
          <TextField select label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">All projects</MenuItem>
            <MenuItem value="inbox">Inbox</MenuItem>
            {projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
          </TextField>
        </Stack>
        {filtered.length ? (
          <List disablePadding>{filtered.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} onEdit={() => onEdit(task)} onToggle={() => onToggle(task)} onFocus={() => onFocus(task)} />)}</List>
        ) : (
          <EmptyState icon={<TaskAlt fontSize="large" />} title="No matching tasks" description="Try another view or add a task." actionLabel="Add task" onAction={onAdd} />
        )}
      </SurfaceCard>
    </>
  );
}
