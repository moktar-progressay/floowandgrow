import { useState, type FormEvent } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, List, Stack, TextField, Typography } from '@mui/material';
import { Add, ArrowBack, DeleteOutline, Edit, ExpandMore, Flag, FolderOpen, PlaylistAdd } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { TaskRow } from '../tasks/TaskRow';
import { useOrganisationMutations } from '../data/useFocusData';
import { useNotice } from '../../app/AppProviders';
import type { FocusGoal, FocusProject, FocusTask } from '../../types/models';

type ProjectDetailProps = {
  projects: FocusProject[];
  goals: FocusGoal[];
  tasks: FocusTask[];
  onEdit: (task: FocusTask) => void;
  onToggle: (task: FocusTask) => void;
  onHide: (task: FocusTask) => void;
  onFocus: (task: FocusTask) => void;
};

export function ProjectDetailPage({ projects, goals, tasks, onEdit, onToggle, onHide, onFocus }: ProjectDetailProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = projects.find((item) => item.id === projectId);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [why, setWhy] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectColour, setProjectColour] = useState('#25b9f4');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalWhy, setEditGoalWhy] = useState('');
  const { saveProject, deleteProject, saveGoal, deleteGoal } = useOrganisationMutations();
  const { notify } = useNotice();

  if (!project) {
    return <SurfaceCard><EmptyState icon={<FolderOpen fontSize="large" />} title="Project not found" description="This project may have been removed." actionLabel="Back to projects" onAction={() => navigate('/projects')} /></SurfaceCard>;
  }

  const selectedProject = project;
  const projectGoals = goals.filter((goal) => goal.project_id === project.id && goal.status !== 'archived');
  const projectTasks = tasks.filter((task) => task.project_id === project.id && task.status !== 'archived');
  const completed = projectTasks.filter((task) => task.status === 'completed').length;
  const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
  const unassignedTasks = projectTasks.filter((task) => !task.goal_id || !projectGoals.some((goal) => goal.id === task.goal_id));

  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    try {
      await saveGoal.mutateAsync({ projectId: selectedProject.id, title: goalTitle, why });
      setGoalTitle('');
      setWhy('');
      setGoalOpen(false);
      notify('Goal created.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create goal.', 'error');
    }
  }

  function beginProjectEdit() {
    setProjectName(selectedProject.name);
    setProjectColour(selectedProject.colour || '#25b9f4');
    setEditingProject(true);
  }

  async function updateProject(event: FormEvent) {
    event.preventDefault();
    try {
      await saveProject.mutateAsync({ id: selectedProject.id, name: projectName, colour: projectColour });
      setEditingProject(false);
      notify('Project updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update project.', 'error');
    }
  }

  async function removeProject() {
    if (!window.confirm(`Delete ${selectedProject.name}? Its tasks will move to Inbox and its goals will be deleted.`)) return;
    try {
      await deleteProject.mutateAsync(selectedProject.id);
      notify('Project deleted. Its tasks are now in Inbox.');
      navigate('/projects');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete project.', 'error');
    }
  }

  function beginGoalEdit(goal: FocusGoal) {
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
    setEditGoalWhy(goal.why_this_matters || '');
  }

  async function updateGoal(goal: FocusGoal) {
    try {
      await saveGoal.mutateAsync({ id: goal.id, projectId: selectedProject.id, title: editGoalTitle, why: editGoalWhy });
      setEditingGoalId(null);
      notify('Goal updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update goal.', 'error');
    }
  }

  async function removeGoal(goal: FocusGoal) {
    if (!window.confirm(`Delete ${goal.title}? Its tasks will remain in this project without a goal.`)) return;
    try {
      await deleteGoal.mutateAsync(goal.id);
      setEditingGoalId(null);
      notify('Goal deleted. Its tasks remain in the project.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete goal.', 'error');
    }
  }

  const taskList = (items: FocusTask[]) => items.length ? (
    <List disablePadding>
      {items.map((task) => <TaskRow key={task.id} task={task} project={project} showProject={false} onEdit={() => onEdit(task)} onToggle={() => onToggle(task)} onHide={() => onHide(task)} onFocus={() => onFocus(task)} />)}
    </List>
  ) : <Typography variant="body2" color="text.secondary" py={1}>No tasks linked to this goal.</Typography>;

  return <>
    <PageHeader
      eyebrow="Project"
      title={project.name}
      description={`${completed} of ${projectTasks.length} tasks completed`}
      action={<Stack direction="row" gap={1}><IconButton onClick={() => navigate('/projects')} aria-label="Back to projects"><ArrowBack /></IconButton><Button startIcon={<Edit />} onClick={beginProjectEdit}>Edit</Button><Button variant="contained" startIcon={<Add />} onClick={() => setGoalOpen(true)}>Add goal</Button></Stack>}
    />
    {editingProject && <SurfaceCard sx={{ mb: 2.5 }}>
      <Stack component="form" onSubmit={updateProject} gap={2}>
        <Typography fontWeight={800}>Edit project</Typography>
        <TextField size="small" label="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} required autoFocus />
        <TextField size="small" label="Colour" type="color" value={projectColour} onChange={(event) => setProjectColour(event.target.value)} />
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Button color="error" startIcon={<DeleteOutline />} onClick={removeProject}>Delete project</Button>
          <Stack direction="row" gap={1}><Button onClick={() => setEditingProject(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={saveProject.isPending || !projectName.trim()}>Save</Button></Stack>
        </Stack>
      </Stack>
    </SurfaceCard>}
    <SurfaceCard sx={{ mb: 2.5 }}>
      <Stack gap={1}>
        <Stack direction="row" justifyContent="space-between"><Typography fontWeight={800}>Project progress</Typography><Typography fontWeight={700}>{progress}%</Typography></Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: project.colour || undefined } }} />
      </Stack>
    </SurfaceCard>
    <Stack gap={2}>
      {projectGoals.map((goal) => {
        const goalTasks = projectTasks.filter((task) => task.goal_id === goal.id);
        const goalComplete = goalTasks.filter((task) => task.status === 'completed').length;
        return <Accordion key={goal.id} defaultExpanded sx={{ borderRadius: '16px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" alignItems="center" gap={1.5} width="100%" minWidth={0} mr={1}>
              <Flag sx={{ color: project.colour || 'primary.main' }} />
              <Stack minWidth={0} flex={1}>
                <Typography fontWeight={800} noWrap>{goal.title}</Typography>
                <Typography variant="caption" color="text.secondary">{goalComplete} of {goalTasks.length} tasks completed</Typography>
              </Stack>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {editingGoalId === goal.id ? <Stack gap={2}>
              <TextField size="small" label="Goal" value={editGoalTitle} onChange={(event) => setEditGoalTitle(event.target.value)} required autoFocus />
              <TextField size="small" label="Why this matters" value={editGoalWhy} onChange={(event) => setEditGoalWhy(event.target.value)} multiline minRows={2} />
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Button color="error" startIcon={<DeleteOutline />} onClick={() => removeGoal(goal)}>Delete goal</Button>
                <Stack direction="row" gap={1}><Button onClick={() => setEditingGoalId(null)}>Cancel</Button><Button variant="contained" disabled={saveGoal.isPending || !editGoalTitle.trim()} onClick={() => updateGoal(goal)}>Save</Button></Stack>
              </Stack>
            </Stack> : <>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
                {goal.why_this_matters ? <Typography variant="body2" color="text.secondary">{goal.why_this_matters}</Typography> : <Typography variant="body2" color="text.secondary">No reason added.</Typography>}
                <Button size="small" startIcon={<Edit />} onClick={() => beginGoalEdit(goal)}>Edit</Button>
              </Stack>
              {taskList(goalTasks)}
            </>}
          </AccordionDetails>
        </Accordion>;
      })}
      {!projectGoals.length && <SurfaceCard><EmptyState icon={<Flag fontSize="large" />} title="No goals yet" description="Add a goal, then connect tasks to it." actionLabel="Add goal" onAction={() => setGoalOpen(true)} /></SurfaceCard>}
      {unassignedTasks.length > 0 && <Accordion sx={{ borderRadius: '16px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Stack direction="row" alignItems="center" gap={1.5}><PlaylistAdd color="action" /><Stack><Typography fontWeight={800}>Tasks without a goal</Typography><Typography variant="caption" color="text.secondary">{unassignedTasks.length} to organise</Typography></Stack></Stack>
        </AccordionSummary>
        <AccordionDetails>{taskList(unassignedTasks)}</AccordionDetails>
      </Accordion>}
    </Stack>
    <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} fullWidth maxWidth="sm">
      <Stack component="form" onSubmit={submitGoal}>
        <DialogTitle>New goal</DialogTitle>
        <DialogContent><Stack gap={2} pt={1}><TextField label="Goal" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} required autoFocus /><TextField label="Why this matters" value={why} onChange={(event) => setWhy(event.target.value)} multiline minRows={3} /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setGoalOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save goal</Button></DialogActions>
      </Stack>
    </Dialog>
  </>;
}
