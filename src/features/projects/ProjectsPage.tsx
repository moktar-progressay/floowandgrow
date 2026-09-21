import { useState, type FormEvent } from 'react';
import { Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Add, ChevronRight, DeleteOutline, Edit, Flag, FolderOpen, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { FocusGoal, FocusProject, FocusTask } from '../../types/models';
import { useOrganisationMutations } from '../data/useFocusData';
import { useNotice } from '../../app/AppProviders';
import { FilterButton, FilterDrawer } from '../../components/common/FilterDrawer';

export function ProjectsPage({ projects, goals, tasks }: { projects: FocusProject[]; goals: FocusGoal[]; tasks: FocusTask[] }) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [name, setName] = useState('');
  const [colour, setColour] = useState('#25b9f4');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'complete'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { saveProject, deleteProject } = useOrganisationMutations();
  const { notify } = useNotice();
  const navigate = useNavigate();

  async function submitProject(event: FormEvent) {
    event.preventDefault();
    try {
      await saveProject.mutateAsync({ name, colour });
      setName('');
      setProjectOpen(false);
      notify('Project created.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create project.', 'error');
    }
  }

  async function updateProject(project: FocusProject, nextName: string, nextColour: string) {
    try {
      await saveProject.mutateAsync({ id: project.id, name: nextName, colour: nextColour });
      notify('Project updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update project.', 'error');
      throw error;
    }
  }

  async function removeProject(project: FocusProject) {
    if (!window.confirm(`Delete ${project.name}? Its tasks will move to Inbox and its goals will be deleted.`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
      notify('Project deleted. Its tasks are now in Inbox.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete project.', 'error');
    }
  }

  const summaries = projects.map((project) => {
    const projectGoals = goals.filter((goal) => goal.project_id === project.id && goal.status !== 'archived');
    const projectTasks = tasks.filter((task) => task.project_id === project.id && task.status !== 'archived');
    const complete = projectTasks.filter((task) => task.status === 'completed').length;
    const progress = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;
    return { project, projectGoals, projectTasks, complete, progress };
  }).filter(({ project, progress }) => project.name.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || (status === 'complete' ? progress === 100 : progress < 100)));

  return <>
    <PageHeader eyebrow="Direction" title="Projects" description="Choose a project to see its goals and tasks." action={<Button variant="contained" startIcon={<Add />} onClick={() => setProjectOpen(true)}>New project</Button>} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} mb={2.5}>
      <TextField placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ flex: 1 }} />
      <FilterButton activeCount={status === 'all' ? 0 : 1} onClick={() => setFiltersOpen(true)} />
    </Stack>
    {summaries.length ? <Grid container spacing={{ xs: 1.5, md: 2 }}>{summaries.map(({ project, projectGoals, projectTasks, complete, progress }) => <Grid key={project.id} size={{ xs: 12, md: 6, xl: 4 }}><EditableProjectCard project={project} goals={projectGoals} tasks={projectTasks} progress={progress} summary={`${projectGoals.length} ${projectGoals.length === 1 ? 'goal' : 'goals'} · ${complete} of ${projectTasks.length} tasks completed`} onOpen={() => navigate(`/projects/${project.id}`)} onSave={(nextName, nextColour) => updateProject(project, nextName, nextColour)} onDelete={() => removeProject(project)} /></Grid>)}</Grid> : <SurfaceCard><EmptyState icon={<FolderOpen fontSize="large" />} title={projects.length ? 'No matching projects' : 'No projects yet'} description={projects.length ? 'Try another search or filter.' : 'Create a project to organise related tasks and goals.'} actionLabel={projects.length ? 'Clear search' : 'Create project'} onAction={projects.length ? () => { setQuery(''); setStatus('all'); } : () => setProjectOpen(true)} /></SurfaceCard>}
    <FilterDrawer open={filtersOpen} activeCount={status === 'all' ? 0 : 1} onClose={() => setFiltersOpen(false)} onClear={() => setStatus('all')} title="Project filters">
      <TextField select label="Progress" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><MenuItem value="all">All projects</MenuItem><MenuItem value="active">In progress</MenuItem><MenuItem value="complete">Complete</MenuItem></TextField>
    </FilterDrawer>
    <Dialog open={projectOpen} onClose={() => setProjectOpen(false)} fullWidth maxWidth="xs">
      <Stack component="form" onSubmit={submitProject}>
        <DialogTitle>New project</DialogTitle>
        <DialogContent><Stack gap={2} pt={1}><TextField label="Project name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /><TextField label="Colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setProjectOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create</Button></DialogActions>
      </Stack>
    </Dialog>
  </>;
}

function EditableProjectCard({ project, goals, tasks, progress, summary, onOpen, onSave, onDelete }: { project: FocusProject; goals: FocusGoal[]; tasks: FocusTask[]; progress: number; summary: string; onOpen: () => void; onSave: (name: string, colour: string) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editColour, setEditColour] = useState(project.colour || '#25b9f4');
  const [saving, setSaving] = useState(false);

  if (editing) return <SurfaceCard>
    <Stack gap={2}>
      <TextField size="small" label="Project name" value={editName} onChange={(event) => setEditName(event.target.value)} required autoFocus />
      <TextField size="small" label="Colour" type="color" value={editColour} onChange={(event) => setEditColour(event.target.value)} />
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Button color="error" startIcon={<DeleteOutline />} onClick={onDelete}>Delete</Button>
        <Stack direction="row" gap={1}><Button onClick={() => { setEditName(project.name); setEditColour(project.colour || '#25b9f4'); setEditing(false); }}>Cancel</Button><Button variant="contained" disabled={saving || !editName.trim()} onClick={async () => { setSaving(true); try { await onSave(editName, editColour); setEditing(false); } finally { setSaving(false); } }}>Save</Button></Stack>
      </Stack>
    </Stack>
  </SurfaceCard>;

  return <SurfaceCard sx={{ height: '100%' }} contentSx={{ p: '0 !important', height: '100%' }}>
    <Stack>
      <Stack direction="row" alignItems="stretch">
      <ButtonBase onClick={onOpen} sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 2.5 }, textAlign: 'left', justifyContent: 'stretch' }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <FolderOpen sx={{ color: project.colour || 'primary.main' }} />
              <Stack flex={1} minWidth={0} gap={1}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                  <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{project.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{progress}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: project.colour || undefined } }} />
                <Typography variant="caption" color="text.secondary">
                  {summary}
                </Typography>
              </Stack>
              <ChevronRight color="action" />
            </Stack>
      </ButtonBase>
      <Tooltip title="Edit project"><IconButton onClick={() => setEditing(true)} aria-label={`Edit ${project.name}`} sx={{ alignSelf: 'center', mr: 1 }}><Edit /></IconButton></Tooltip>
      </Stack>
      {goals.length > 0 && <Stack borderTop={1} borderColor="divider" px={{ xs: 2, sm: 2.5 }} py={1.25} gap={0.5}>
        {goals.map((goal) => {
          const goalTasks = tasks.filter((task) => task.goal_id === goal.id);
          const completed = goalTasks.filter((task) => task.status === 'completed').length;
          return <ButtonBase key={goal.id} onClick={onOpen} sx={{ borderRadius: 2, px: 1, py: 0.75, ml: 2, textAlign: 'left', justifyContent: 'stretch', '&:hover': { bgcolor: 'action.hover' } }}>
            <Flag fontSize="small" sx={{ color: project.colour || 'primary.main', mr: 1 }} />
            <Stack flex={1} minWidth={0}>
              <Typography variant="body2" fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{goal.title}</Typography>
              <Typography variant="caption" color="text.secondary">{completed} of {goalTasks.length} tasks completed</Typography>
            </Stack>
            <ChevronRight fontSize="small" color="action" />
          </ButtonBase>;
        })}
      </Stack>}
    </Stack>
  </SurfaceCard>;
}
