import { useMemo, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, InputAdornment, List, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add, CalendarMonth, CloudDone, FormatListBulleted, Refresh, Search, SportsEsports, TaskAlt } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterButton, FilterDrawer } from '../../components/common/FilterDrawer';
import { TaskRow } from './TaskRow';
import { localDate, matchesDueDate, overdueTasks, type DueDateFilter } from './taskDates';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskTown } from './TaskTown';

export function TasksPage({
  tasks, projects, events, xp, streak, googleConnected, googleEmail, googleLoading, googleError,
  onGoogleConnect, onGoogleRefresh, onEdit, onToggle, onHide, onFocus, onChallenge, onAdd,
}: {
  tasks: FocusTask[];
  projects: FocusProject[];
  events: GoogleEvent[];
  xp: number;
  streak: number;
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
  onChallenge: (task: FocusTask) => void;
  onAdd: () => void;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedView = params.get('view');
  const initialTab = requestedView === 'overdue' || requestedView === 'completed' || requestedView === 'hidden'
    ? requestedView
    : 'today';
  const [tab, setTab] = useState<'today' | 'overdue' | 'upcoming' | 'active' | 'completed' | 'hidden'>(initialTab);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [source, setSource] = useState<'all' | 'focusos' | 'daily_anchors' | 'google_tasks' | 'google_calendar' | 'gmail'>('all');
  const [dueDate, setDueDate] = useState<DueDateFilter>('all');
  const [priority, setPriority] = useState<'all' | 'red' | 'yellow' | 'green' | 'standard'>('all');
  const [layout, setLayout] = useState<'list' | 'town'>('list');
  const today = localDate();
  const overdueIds = useMemo(() => new Set(overdueTasks(tasks, today).map((task) => task.id)), [tasks, today]);
  const filtered = useMemo(() => tasks.filter((task) => {
    if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (projectId !== 'all' && (task.project_id ?? 'inbox') !== projectId) return false;
    if (source === 'google_tasks' && task.source !== 'google_tasks') return false;
    if (source === 'google_calendar' && task.source !== 'google_calendar') return false;
    if (source === 'gmail' && task.source !== 'gmail' && task.source !== 'google_gmail') return false;
    if (source === 'daily_anchors' && !task.is_daily_anchor) return false;
    if (source === 'focusos' && (task.is_daily_anchor || ['google_tasks', 'google_calendar', 'gmail', 'google_gmail'].includes(task.source))) return false;
    if (!matchesDueDate(task, dueDate, today)) return false;
    if (priority === 'standard' && task.priority !== null) return false;
    if (priority !== 'all' && priority !== 'standard' && task.priority !== priority) return false;
    if (tab === 'completed') return task.status === 'completed';
    if (tab === 'hidden') return task.status === 'archived';
    if (task.status !== 'open') return false;
    if (tab === 'today') return task.scheduled_date === today || task.is_daily_anchor;
    if (tab === 'overdue') return overdueIds.has(task.id);
    if (tab === 'upcoming') return Boolean(task.scheduled_date && task.scheduled_date > today);
    return true;
  }), [tasks, query, projectId, source, dueDate, priority, tab, today, overdueIds]);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);
  const googleTaskCount = tasks.filter((task) => task.source === 'google_tasks' && task.status !== 'archived').length;
  const googleCalendarCount = tasks.filter((task) => task.source === 'google_calendar' && task.status !== 'archived').length;
  const gmailCount = tasks.filter((task) => (task.source === 'gmail' || task.source === 'google_gmail') && task.status !== 'archived').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const hiddenCount = tasks.filter((task) => task.status === 'archived').length;
  const viewLabels = {
    today: 'Today',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
    active: 'Active',
    completed: `Completed (${completedCount})`,
    hidden: `Hidden (${hiddenCount})`,
  } as const;
  const activeFilterCount = Number(tab !== 'today')
    + Number(Boolean(query))
    + Number(projectId !== 'all')
    + Number(source !== 'all')
    + Number(dueDate !== 'all')
    + Number(priority !== 'all');
  const clearFilters = () => {
    setTab('today');
    setQuery('');
    setProjectId('all');
    setSource('all');
    setDueDate('all');
    setPriority('all');
  };

  return (
    <>
      <PageHeader
        eyebrow="Organise"
        title="Tasks"
        description="One task list, shown in the way you need."
        action={<Button variant="contained" startIcon={<Add />} onClick={onAdd}>Add task</Button>}
      />
      <ToggleButtonGroup
        exclusive
        value={layout}
        size="small"
        aria-label="Task view"
        sx={{ mb: 2.5, width: { xs: '100%', sm: 'auto' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' } } }}
        onChange={(_, value: 'list' | 'town' | 'calendar' | null) => {
          if (value === 'calendar') navigate('/calendar');
          else if (value) setLayout(value);
        }}
      >
        <ToggleButton value="list"><FormatListBulleted sx={{ mr: .75 }} />List</ToggleButton>
        <ToggleButton value="calendar"><CalendarMonth sx={{ mr: .75 }} />Calendar</ToggleButton>
        <ToggleButton value="town"><SportsEsports sx={{ mr: .75 }} />Task Town</ToggleButton>
      </ToggleButtonGroup>
      {layout === 'town' ? (
        <TaskTown tasks={tasks} events={events} xp={xp} streak={streak} onChallenge={onChallenge} />
      ) : <>
      <SurfaceCard sx={{ mb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            {googleLoading && !googleConnected ? <CircularProgress size={22} /> : <CloudDone color={googleConnected ? 'primary' : 'disabled'} />}
            <Stack>
              <Typography fontWeight={800}>Google Workspace</Typography>
              <Typography variant="body2" color="text.secondary">
                {googleConnected
                  ? `${googleTaskCount} tasks, ${gmailCount} emails and ${googleCalendarCount} events synced${googleEmail ? ` with ${googleEmail}` : ''}.`
                  : googleLoading ? 'Checking your Google connection…' : 'Connect Google so tasks, emails and events appear here automatically.'}
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
          <Stack minWidth={0}>
            <Typography variant="h6" fontWeight={800} noWrap>{viewLabels[tab]}</Typography>
            <Typography variant="caption" color="text.secondary">{filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}</Typography>
          </Stack>
          <FilterButton activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
        </Stack>
        <FilterDrawer
          open={filtersOpen}
          activeCount={activeFilterCount}
          onClose={() => setFiltersOpen(false)}
          onClear={clearFilters}
          title="Task filters"
        >
          <Stack gap={2.5}>
            <TextField select fullWidth label="View" value={tab} onChange={(event) => setTab(event.target.value as typeof tab)}>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed ({completedCount})</MenuItem>
              <MenuItem value="hidden">Hidden ({hiddenCount})</MenuItem>
            </TextField>
            <TextField
              fullWidth
              placeholder="Search tasks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
            />
            <TextField select fullWidth label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <MenuItem value="all">All projects</MenuItem>
              <MenuItem value="inbox">Inbox</MenuItem>
              {projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Source" value={source} onChange={(event) => setSource(event.target.value as typeof source)}>
              <MenuItem value="all">All sources</MenuItem>
              <MenuItem value="focusos">FocusOS</MenuItem>
              <MenuItem value="daily_anchors">Daily Anchors</MenuItem>
              <MenuItem value="google_tasks">Google Tasks</MenuItem>
              <MenuItem value="google_calendar">Google Calendar</MenuItem>
              <MenuItem value="gmail">Google Gmail</MenuItem>
            </TextField>
            <TextField select fullWidth label="Due date" value={dueDate} onChange={(event) => setDueDate(event.target.value as DueDateFilter)}>
              <MenuItem value="all">Any due date</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="tomorrow">Tomorrow</MenuItem>
              <MenuItem value="next_7_days">Next 7 days</MenuItem>
              <MenuItem value="no_date">No due date</MenuItem>
            </TextField>
            <TextField select fullWidth label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
              <MenuItem value="all">All priorities</MenuItem>
              <MenuItem value="red">Critical</MenuItem>
              <MenuItem value="yellow">Important</MenuItem>
              <MenuItem value="green">Flexible</MenuItem>
              <MenuItem value="standard">Standard</MenuItem>
            </TextField>
          </Stack>
        </FilterDrawer>
        {filtered.length ? (
          <List disablePadding>{filtered.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} hidden={tab === 'hidden'} onEdit={() => onEdit(task)} onToggle={() => onToggle(task)} onHide={tab === 'completed' ? undefined : () => onHide(task)} onFocus={() => onFocus(task)} />)}</List>
        ) : (
          <EmptyState icon={<TaskAlt fontSize="large" />} title="No matching tasks" description="Try another view or add a task." actionLabel="Add task" onAction={onAdd} />
        )}
      </SurfaceCard>
      </>
      }
    </>
  );
}
