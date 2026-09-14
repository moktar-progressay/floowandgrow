import { useState, type FormEvent } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { Add, ExpandMore, Flag, FolderOpen } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { FocusGoal, FocusProject, FocusTask } from '../../types/models';
import { useOrganisationMutations } from '../data/useFocusData';
import { useNotice } from '../../app/AppProviders';

export function ProjectsPage({ projects, goals, tasks }: { projects: FocusProject[]; goals: FocusGoal[]; tasks: FocusTask[] }) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [goalProject, setGoalProject] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [colour, setColour] = useState('#25b9f4');
  const [goalTitle, setGoalTitle] = useState('');
  const [why, setWhy] = useState('');
  const { saveProject, saveGoal } = useOrganisationMutations();
  const { notify } = useNotice();

  async function submitProject(event: FormEvent) {
    event.preventDefault();
    try {
      await saveProject.mutateAsync({ name, colour });
      setName(''); setProjectOpen(false); notify('Project created.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not create project.', 'error'); }
  }
  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    if (!goalProject) return;
    try {
      await saveGoal.mutateAsync({ projectId: goalProject, title: goalTitle, why });
      setGoalTitle(''); setWhy(''); setGoalProject(null); notify('Goal created.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not create goal.', 'error'); }
  }

  return <>
    <PageHeader eyebrow="Direction" title="Projects" description="Connect daily actions to goals that matter." action={<Button variant="contained" startIcon={<Add />} onClick={() => setProjectOpen(true)}>New project</Button>} />
    <Stack gap={2}>
      {projects.length ? projects.map((project) => {
        const projectGoals = goals.filter((goal) => goal.project_id === project.id);
        const projectTasks = tasks.filter((task) => task.project_id === project.id && task.status !== 'archived');
        const complete = projectTasks.filter((task) => task.status === 'completed').length;
        const progress = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;
        return <Accordion key={project.id} defaultExpanded sx={{ borderRadius: '16px !important', overflow: 'hidden' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack width="100%" mr={2} gap={1}>
              <Stack direction="row" alignItems="center" gap={1.5}><FolderOpen sx={{ color: project.colour || 'primary.main' }} /><Typography fontWeight={800}>{project.name}</Typography><Typography variant="caption" color="text.secondary" ml="auto">{progress}%</Typography></Stack>
              <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: project.colour || undefined } }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack gap={1.5}>
              {projectGoals.map((goal) => <SurfaceCard key={goal.id} sx={{ bgcolor: 'background.default' }}><Stack direction="row" gap={1.5}><Flag color="primary" /><div><Typography fontWeight={700}>{goal.title}</Typography>{goal.why_this_matters && <Typography variant="body2" color="text.secondary">{goal.why_this_matters}</Typography>}</div></Stack></SurfaceCard>)}
              {!projectGoals.length && <Typography color="text.secondary">No goals yet.</Typography>}
              <Button startIcon={<Add />} onClick={() => setGoalProject(project.id)} sx={{ alignSelf: 'flex-start' }}>Add goal</Button>
              <Typography variant="caption" color="text.secondary">{complete} of {projectTasks.length} tasks completed</Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>;
      }) : <SurfaceCard><EmptyState icon={<FolderOpen fontSize="large" />} title="No projects yet" description="Create a project to organise related tasks and goals." actionLabel="Create project" onAction={() => setProjectOpen(true)} /></SurfaceCard>}
    </Stack>
    <Dialog open={projectOpen} onClose={() => setProjectOpen(false)} fullWidth maxWidth="xs"><Stack component="form" onSubmit={submitProject}><DialogTitle>New project</DialogTitle><DialogContent><Stack gap={2} pt={1}><TextField label="Project name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /><TextField label="Colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setProjectOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create</Button></DialogActions></Stack></Dialog>
    <Dialog open={Boolean(goalProject)} onClose={() => setGoalProject(null)} fullWidth maxWidth="sm"><Stack component="form" onSubmit={submitGoal}><DialogTitle>New goal</DialogTitle><DialogContent><Stack gap={2} pt={1}><TextField label="Goal" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} required autoFocus /><TextField label="Why this matters" value={why} onChange={(event) => setWhy(event.target.value)} multiline minRows={3} /></Stack></DialogContent><DialogActions><Button onClick={() => setGoalProject(null)}>Cancel</Button><Button type="submit" variant="contained">Save goal</Button></DialogActions></Stack></Dialog>
  </>;
}
