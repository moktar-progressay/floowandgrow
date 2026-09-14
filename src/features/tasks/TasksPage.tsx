import { useMemo, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, InputAdornment, List, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Add, CloudDone, Refresh, Search, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { TaskRow } from './TaskRow';
import { localDate, overdueTasks } from './taskDates';
import type { FocusProject, FocusTask } from '../../types/models';
import { useSearchParams } from 'react-router-dom';

export function TasksPage({
  tasks, projects, googleConnected, googleEmail, googleLoading, googleError,
  onGoogleConnect, onGoogleRefresh, onEdit, onToggle, onHide, onFocus, onAdd,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  googleConnected: boolean;
  googleEmail?: string;
  googleLoading: boolean;
  googleError?: string;
  onGoogleConnect: () => void;
  onGoogleRefresh: () => void;
  onEdit: (task: FocusTask) => void;
  onToggle: (task: FocusTask) => void;
  onHide: (task: FocusTask) => void;
  onFocus: (task: FocusTask) => void;
  onAdd: () => void;
}) {
  const [params] = useSearchParams();
  const requestedView = params.get('view');
  const initialTab = requestedView === 'overdue' || requestedView === 'completed' || requestedView === 'hidden'
    ? requestedView
    : 'today';
  const [tab, setTab] = useState<'today' | 'overdue' | 'upcoming' | 'active' | 'completed' | 'hidden'>(initialTab);
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [source, setSource] = useState<'all' | 'focusos' | 'google_tasks'>('all');
  const [priority, setPriority] = useState<'all' | 'red' | 'yellow' | 'green' | 'standard'>('all');
  const today = localDate();
  const overdueIds = useMemo(() => new Set(overdueTasks(tasks, today).map((task) => task.id)), [tasks, today]);
  const filtered = useMemo(() => tasks.filter((task) => {
    if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (projectId !== 'all' && (task.project_id ?? 'inbox') !== projectId) return false;
    if (source === 'google_tasks' && task.source !== 'google_tasks') return false;
    if (source === 'focusos' && task.source === 'google_tasks') return false;
    if (priority === 'standard' && task.priority !== null) return false;
    if (priority !== 'all' && priority !== 'standard' && task.priority !== priority) return false;
    if (tab === 'completed') return task.status === 'completed';
    if (tab === 'hidden') return task.status === 'archived';
    if (task.status !== 'open') return false;
    if (tab === 'today') return task.scheduled_date === today || task.is_daily_anchor;
    if (tab === 'overdue') return overdueIds.has(task.id);
    if (tab === 'upcoming') return Boolean(task.scheduled_date && task.scheduled_date > today);
    return true;
  }), [tasks, query, projectId, source, priority, tab, today, overdueIds]);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);
  const googleTaskCount = tasks.filter((task) => task.source === 'google_tasks' && task.status !== 'archived').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const hiddenCount = tasks.filter((task) => task.status === 'archived').length;

  return (
    <>
      <PageHeader
        eyebrow="Organise"
        title="Tasks"
        description="One task list, shown in the way you need."
        action={<Button variant="contained" startIcon={<Add />} onClick={onAdd}>Add task</Button>}
      />
      <SurfaceCard sx={{ mb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            {googleLoading && !googleConnected ? <CircularProgress size={22} /> : <CloudDone color={googleConnected ? 'primary' : 'disabled'} />}
            <Stack>
              <Typography fontWeight={800}>Google Tasks</Typography>
              <Typography variant="body2" color="text.secondary">
                {googleConnected
                  ? `${googleTaskCount} tasks synced${googleEmail ? ` with ${googleEmail}` : ''}.`
                  : googleLoading ? 'Checking your Google connection…' : 'Connect Google so tasks appear here automatically.'}
              </Typography>
            </Stack>
          </Stack>
          {googleConnected
            ? <Stack direction="row" gap={1} alignItems="center"><Chip label="Connected" color="success" size="small" /><Button startIcon={<Refresh />} onClick={onGoogleRefresh} disabled={googleLoading}>Sync now</Button></Stack>
            : !googleLoading && <Button variant="contained" onClick={onGoogleConnect}>Connect Google</Button>}
        </Stack>
        {googleError && <Alert severity="warning" sx={{ mt: 2 }}>{googleError}</Alert>}
      </SurfaceCard>
      <SurfaceCard>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
          <Tab value="today" label="Today" />
          <Tab value="overdue" label="Overdue" />
          <Tab value="upcoming" label="Upcoming" />
          <Tab value="active" label="Active" />
          <Tab value="completed" label={`Completed (${completedCount})`} />
          <Tab value="hidden" label={`Hidden (${hiddenCount})`} />
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
          <TextField select label="Source" value={source} onChange={(event) => setSource(event.target.value as typeof source)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">All sources</MenuItem>
            <MenuItem value="focusos">FocusOS</MenuItem>
            <MenuItem value="google_tasks">Google Tasks</MenuItem>
          </TextField>
          <TextField select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All priorities</MenuItem>
            <MenuItem value="red">Critical</MenuItem>
            <MenuItem value="yellow">Important</MenuItem>
            <MenuItem value="green">Flexible</MenuItem>
            <MenuItem value="standard">Standard</MenuItem>
          </TextField>
        </Stack>
        {filtered.length ? (
          <List disablePadding>{filtered.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} hidden={tab === 'hidden'} onEdit={() => onEdit(task)} onToggle={() => onToggle(task)} onHide={tab === 'completed' ? undefined : () => onHide(task)} onFocus={() => onFocus(task)} />)}</List>
        ) : (
          <EmptyState icon={<TaskAlt fontSize="large" />} title="No matching tasks" description="Try another view or add a task." actionLabel="Add task" onAction={onAdd} />
        )}
      </SurfaceCard>
    </>
  );
}
