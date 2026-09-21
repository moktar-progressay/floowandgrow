import { useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  CircularProgress, Dialog, DialogContent, DialogTitle, InputAdornment, List,
  ListItemButton, ListItemText, MenuItem, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  Add, CalendarMonth, CloudDone, ExpandMore, FormatListBulleted, Google,
  Refresh, Search, SportsEsports, SwapHoriz, TaskAlt,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterButton, FilterDrawer } from '../../components/common/FilterDrawer';
import type { FocusProject, FocusTask, GoogleEvent } from '../../types/models';
import { TaskRow } from './TaskRow';
import { TaskTown } from './TaskTown';
import { CalendarPage } from '../calendar/CalendarPage';
import { localDate, matchesDueDate, overdueTasks, sortTasksChronologically, type DueDateFilter } from './taskDates';

type TaskView = 'today' | 'overdue' | 'upcoming' | 'active' | 'completed' | 'hidden';
type TaskSource = 'all' | 'focusos' | 'daily_anchors' | 'google_tasks' | 'google_calendar' | 'gmail';

export function TasksPage({
  tasks, projects, events, xp, streak, googleConnected, googleEmail, googleLoading, googleError,
  onGoogleConnect, onGoogleRefresh, onEdit, onToggle, onHide, onFocus, onChallenge, onAdd, onAddOnDate,
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
  onAddOnDate: (date: string) => void;
}) {
  const [params] = useSearchParams();
  const requestedView = params.get('view');
  const requestedLayout = params.get('layout');
  const initialTab: TaskView = ['today', 'overdue', 'upcoming', 'active', 'completed', 'hidden'].includes(String(requestedView))
    ? requestedView as TaskView
    : requestedLayout === 'calendar' ? 'active' : 'today';
  const [tab, setTab] = useState<TaskView>(initialTab);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [focusPickerOpen, setFocusPickerOpen] = useState(false);
  const [focusQuery, setFocusQuery] = useState('');
  const [selectedFocusId, setSelectedFocusId] = useState('');
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [source, setSource] = useState<TaskSource>('all');
  const [dueDate, setDueDate] = useState<DueDateFilter>('all');
  const [priority, setPriority] = useState<'all' | 'red' | 'yellow' | 'green' | 'standard'>('all');
  const [layout, setLayout] = useState<'list' | 'calendar' | 'town'>(() => requestedLayout === 'calendar' ? 'calendar' : requestedLayout === 'town' ? 'town' : 'list');
  const today = localDate();
  const overdueIds = useMemo(() => new Set(overdueTasks(tasks, today).map((task) => task.id)), [tasks, today]);
  const projectFor = (id: string | null) => projects.find((project) => project.id === id);

  const focusCandidates = useMemo(() => tasks
    .filter((task) => task.status === 'open')
    .sort((a, b) => {
      const rank = (task: FocusTask) => task.scheduled_date === today ? 0 : task.scheduled_date && task.scheduled_date < today ? 1 : task.is_daily_anchor ? 2 : 3;
      return rank(a) - rank(b)
        || String(a.scheduled_date || '9999-12-31').localeCompare(String(b.scheduled_date || '9999-12-31'))
        || String(a.scheduled_time || '99:99').localeCompare(String(b.scheduled_time || '99:99'));
    }), [tasks, today]);
  const focusTask = focusCandidates.find((task) => task.id === selectedFocusId) ?? focusCandidates[0] ?? null;
  const pickerTasks = focusCandidates.filter((task) => `${task.title} ${projectFor(task.project_id)?.name || ''}`.toLowerCase().includes(focusQuery.trim().toLowerCase())).slice(0, 60);

  const filtered = useMemo(() => sortTasksChronologically(tasks.filter((task) => {
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
  })), [tasks, query, projectId, source, dueDate, priority, tab, today, overdueIds]);
  const otherTasks = filtered.filter((task) => task.id !== focusTask?.id);
  const googleTaskCount = tasks.filter((task) => task.source === 'google_tasks' && task.status !== 'archived').length;
  const googleCalendarCount = tasks.filter((task) => task.source === 'google_calendar' && task.status !== 'archived').length;
  const gmailCount = tasks.filter((task) => (task.source === 'gmail' || task.source === 'google_gmail') && task.status !== 'archived').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const hiddenCount = tasks.filter((task) => task.status === 'archived').length;
  const viewLabels: Record<TaskView, string> = {
    today: 'Agenda', overdue: 'Carried forward', upcoming: 'Upcoming', active: 'All active',
    completed: `Completed (${completedCount})`, hidden: `Hidden (${hiddenCount})`,
  };
  const activeFilterCount = Number(tab !== 'today') + Number(projectId !== 'all') + Number(source !== 'all') + Number(dueDate !== 'all') + Number(priority !== 'all');
  const clearFilters = () => { setTab('today'); setProjectId('all'); setSource('all'); setDueDate('all'); setPriority('all'); };

  return <>
    <PageHeader eyebrow="Organise" title="Tasks" description="Choose one thing. Keep everything else nearby, but quiet." action={<Button variant="contained" startIcon={<Add />} onClick={onAdd}>Add task</Button>} />
    <Stack gap={{ xs: 2, md: 2.5 }}>
      <ToggleButtonGroup
        exclusive value={layout} size="small" aria-label="Task view"
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' }, px: { xs: 1, sm: 2 } } }}
        onChange={(_, value: 'list' | 'town' | 'calendar' | null) => {
          if (value) {
            setLayout(value);
            if (value === 'calendar' && tab === 'today') setTab('active');
          }
        }}
      >
        <ToggleButton value="list"><FormatListBulleted sx={{ mr: .75 }} />List</ToggleButton>
        <ToggleButton value="calendar"><CalendarMonth sx={{ mr: .75 }} />Calendar</ToggleButton>
        <ToggleButton value="town"><SportsEsports sx={{ mr: .75 }} />Task Town</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems="stretch">
        <TextField placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ flex: 1 }} />
        <Stack direction="row" gap={1} sx={{ '& > *': { flex: { xs: 1, sm: 'initial' } } }}>
          <FilterButton activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
          <Button variant="outlined" startIcon={<Google />} onClick={() => setGoogleOpen(true)}>Google</Button>
        </Stack>
      </Stack>

      {layout === 'town' ? <TaskTown tasks={filtered} events={events} xp={xp} streak={streak} onChallenge={onChallenge} /> : layout === 'calendar' ? <CalendarPage
        embedded
        tasks={filtered}
        projects={projects}
        events={events}
        googleConnected={googleConnected}
        googleError={googleError}
        onGoogleConnect={onGoogleConnect}
        onAddTask={onAddOnDate}
        onEditTask={onEdit}
        onToggleTask={onToggle}
        onHideTask={onHide}
        onFocusTask={onFocus}
      /> : <>
        <SurfaceCard sx={{ bgcolor: 'rgba(37,185,244,.055)', borderColor: 'rgba(37,185,244,.22)' }}>
          <Stack gap={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography color="primary.main" fontWeight={850}>Focus task</Typography>
              {focusTask && <Button size="small" startIcon={<SwapHoriz />} onClick={() => setFocusPickerOpen(true)}>Change</Button>}
            </Stack>
            {focusTask ? <>
              <Box minWidth={0}>
                <Typography component="h2" fontWeight={850} sx={{ fontSize: { xs: '1.35rem', md: '1.7rem' }, overflowWrap: 'anywhere' }}>{focusTask.title}</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                  <Chip size="small" label={projectFor(focusTask.project_id)?.name ?? 'Inbox'} variant="outlined" />
                  {focusTask.scheduled_time && <Chip size="small" label={focusTask.scheduled_time.slice(0, 5)} variant="outlined" />}
                  {focusTask.scheduled_date && <Chip size="small" label={focusTask.scheduled_date === today ? 'Today' : focusTask.scheduled_date} variant="outlined" />}
                </Stack>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <Button variant="contained" size="large" startIcon={<TaskAlt />} onClick={() => onFocus(focusTask)}>Start focus</Button>
                <Button onClick={() => onEdit(focusTask)}>Open task</Button>
                <Button color="success" onClick={() => onToggle(focusTask)}>Complete</Button>
              </Stack>
            </> : <EmptyState icon={<TaskAlt />} title="Nothing needs your attention" description="Add a task when you are ready." actionLabel="Add task" onAction={onAdd} />}
          </Stack>
        </SurfaceCard>

        <Accordion defaultExpanded={false} disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" minWidth={0} mr={1}>
              <Stack minWidth={0}><Typography fontWeight={850}>{viewLabels[tab]}</Typography><Typography variant="caption" color="text.secondary">{otherTasks.length} other {otherTasks.length === 1 ? 'task' : 'tasks'}</Typography></Stack>
              {activeFilterCount > 0 && <Chip size="small" label={`${activeFilterCount} filtered`} color="primary" variant="outlined" />}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {otherTasks.length ? <List disablePadding>{otherTasks.map((task) => <TaskRow key={task.id} task={task} project={projectFor(task.project_id)} hidden={tab === 'hidden'} onEdit={() => onEdit(task)} onToggle={() => onToggle(task)} onHide={tab === 'completed' ? undefined : () => onHide(task)} onFocus={() => onFocus(task)} />)}</List>
              : <EmptyState icon={<TaskAlt />} title="No matching tasks" description="Try another search or filter." actionLabel="Clear filters" onAction={() => { setQuery(''); clearFilters(); }} />}
          </AccordionDetails>
        </Accordion>
      </>}
    </Stack>

    <FilterDrawer open={filtersOpen} activeCount={activeFilterCount} onClose={() => setFiltersOpen(false)} onClear={clearFilters} title="Task filters">
      <Stack gap={2.5}>
        <TextField select label="View" value={tab} onChange={(event) => setTab(event.target.value as TaskView)}>
          <MenuItem value="today">Agenda: today</MenuItem><MenuItem value="overdue">Carried forward</MenuItem><MenuItem value="upcoming">Upcoming</MenuItem><MenuItem value="active">All active</MenuItem><MenuItem value="completed">Completed ({completedCount})</MenuItem><MenuItem value="hidden">Hidden ({hiddenCount})</MenuItem>
        </TextField>
        <TextField select label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <MenuItem value="all">All projects</MenuItem><MenuItem value="inbox">Inbox</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
        </TextField>
        <TextField select label="Source" value={source} onChange={(event) => setSource(event.target.value as TaskSource)}>
          <MenuItem value="all">All sources</MenuItem><MenuItem value="focusos">FocusOS</MenuItem><MenuItem value="daily_anchors">Daily Anchors</MenuItem><MenuItem value="google_tasks">Google Tasks</MenuItem><MenuItem value="google_calendar">Google Calendar</MenuItem><MenuItem value="gmail">Google Gmail</MenuItem>
        </TextField>
        <TextField select label="Due date" value={dueDate} onChange={(event) => setDueDate(event.target.value as DueDateFilter)}>
          <MenuItem value="all">Any due date</MenuItem><MenuItem value="overdue">Overdue</MenuItem><MenuItem value="today">Today</MenuItem><MenuItem value="tomorrow">Tomorrow</MenuItem><MenuItem value="next_7_days">Next 7 days</MenuItem><MenuItem value="no_date">No due date</MenuItem>
        </TextField>
        <TextField select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
          <MenuItem value="all">All priorities</MenuItem><MenuItem value="red">Critical</MenuItem><MenuItem value="yellow">Important</MenuItem><MenuItem value="green">Flexible</MenuItem><MenuItem value="standard">Standard</MenuItem>
        </TextField>
      </Stack>
    </FilterDrawer>

    <Dialog open={focusPickerOpen} onClose={() => setFocusPickerOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Choose your focus task</DialogTitle>
      <DialogContent><Stack gap={2} pt={1}>
        <TextField autoFocus placeholder="Search open tasks" value={focusQuery} onChange={(event) => setFocusQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} />
        <List disablePadding sx={{ maxHeight: '58dvh', overflowY: 'auto' }}>
          {pickerTasks.map((task) => <ListItemButton key={task.id} selected={task.id === focusTask?.id} onClick={() => { setSelectedFocusId(task.id); setFocusPickerOpen(false); setFocusQuery(''); }} sx={{ borderRadius: 3, mb: .5 }}><ListItemText primary={task.title} secondary={projectFor(task.project_id)?.name ?? 'Inbox'} /></ListItemButton>)}
        </List>
        {!pickerTasks.length && <Typography color="text.secondary" textAlign="center" py={3}>No open task matches that search.</Typography>}
      </Stack></DialogContent>
    </Dialog>

    <Dialog open={googleOpen} onClose={() => setGoogleOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Google Workspace</DialogTitle>
      <DialogContent><Stack gap={2} pt={1}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          {googleLoading && !googleConnected ? <CircularProgress size={24} /> : <CloudDone color={googleConnected ? 'primary' : 'disabled'} />}
          <Box flex={1} minWidth={0}><Typography fontWeight={850}>{googleConnected ? 'Connected' : 'Not connected'}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{googleConnected ? googleEmail : 'Connect to sync Google Tasks, Gmail and Calendar.'}</Typography></Box>
        </Stack>
        {googleConnected && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>{[`${googleTaskCount} tasks`, `${gmailCount} emails`, `${googleCalendarCount} events`].map((label) => <Chip key={label} label={label} variant="outlined" />)}</Stack>}
        {googleError && <Alert severity="warning">{googleError}</Alert>}
        {googleConnected ? <Button variant="contained" startIcon={<Refresh />} onClick={onGoogleRefresh} disabled={googleLoading}>Sync now</Button> : <Button variant="contained" startIcon={<Google />} onClick={onGoogleConnect} disabled={googleLoading}>Connect Google</Button>}
      </Stack></DialogContent>
    </Dialog>
  </>;
}
