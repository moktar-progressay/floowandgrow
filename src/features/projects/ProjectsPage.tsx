import { useState, type FormEvent } from 'react';
import { Button, CardActionArea, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { Add, ChevronRight, FolderOpen } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { FocusGoal, FocusProject, FocusTask } from '../../types/models';
import { useOrganisationMutations } from '../data/useFocusData';
import { useNotice } from '../../app/AppProviders';

export function ProjectsPage({ projects, goals, tasks }: { projects: FocusProject[]; goals: FocusGoal[]; tasks: FocusTask[] }) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [name, setName] = useState('');
  const [colour, setColour] = useState('#25b9f4');
  const { saveProject } = useOrganisationMutations();
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

  return <>
    <PageHeader eyebrow="Direction" title="Projects" description="Choose a project to see its goals and tasks." action={<Button variant="contained" startIcon={<Add />} onClick={() => setProjectOpen(true)}>New project</Button>} />
    <Stack gap={2}>
      {projects.length ? projects.map((project) => {
        const projectGoals = goals.filter((goal) => goal.project_id === project.id && goal.status !== 'archived');
        const projectTasks = tasks.filter((task) => task.project_id === project.id && task.status !== 'archived');
        const complete = projectTasks.filter((task) => task.status === 'completed').length;
        const progress = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;

        return <SurfaceCard key={project.id} contentSx={{ p: '0 !important' }}>
          <CardActionArea onClick={() => navigate(`/projects/${project.id}`)} sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <FolderOpen sx={{ color: project.colour || 'primary.main' }} />
              <Stack flex={1} minWidth={0} gap={1}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                  <Typography fontWeight={800} noWrap>{project.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{progress}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: project.colour || undefined } }} />
                <Typography variant="caption" color="text.secondary">
                  {projectGoals.length} {projectGoals.length === 1 ? 'goal' : 'goals'} · {complete} of {projectTasks.length} tasks completed
                </Typography>
              </Stack>
              <ChevronRight color="action" />
            </Stack>
          </CardActionArea>
        </SurfaceCard>;
      }) : <SurfaceCard><EmptyState icon={<FolderOpen fontSize="large" />} title="No projects yet" description="Create a project to organise related tasks and goals." actionLabel="Create project" onAction={() => setProjectOpen(true)} /></SurfaceCard>}
    </Stack>
    <Dialog open={projectOpen} onClose={() => setProjectOpen(false)} fullWidth maxWidth="xs">
      <Stack component="form" onSubmit={submitProject}>
        <DialogTitle>New project</DialogTitle>
        <DialogContent><Stack gap={2} pt={1}><TextField label="Project name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /><TextField label="Colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setProjectOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create</Button></DialogActions>
      </Stack>
    </Dialog>
  </>;
}
