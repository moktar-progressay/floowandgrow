import { Checkbox, Chip, IconButton, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from '@mui/material';
import { PlayArrow, Visibility, VisibilityOff } from '@mui/icons-material';
import type { FocusProject, FocusTask } from '../../types/models';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';

export function TaskRow({
  task, project, completed, contextLabel, hidden = false, showProject = true, onToggle, onEdit, onFocus, onHide,
}: {
  task: FocusTask;
  project?: FocusProject;
  completed?: boolean;
  contextLabel?: string;
  hidden?: boolean;
  showProject?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onHide?: () => void;
}) {
  const complete = completed ?? task.status === 'completed';
  return (
    <ListItem disablePadding>
      {!hidden && <Checkbox checked={complete} onChange={onToggle} inputProps={{ 'aria-label': `${complete ? 'Reopen' : 'Complete'} ${task.title}` }} />}
      <ListItemButton onClick={onEdit} sx={{ minWidth: 0, px: 1, py: 1.5 }}>
        <ListItemText
          primary={task.title}
          secondary={
            <Stack component="span" direction="row" alignItems="center" flexWrap="wrap" gap={1} mt={0.5}>
              {showProject && <Chip component="span" size="small" label={project?.name ?? 'Inbox'} sx={project?.colour ? { borderColor: project.colour } : undefined} variant="outlined" />}
              {task.source === 'google_tasks' && <GoogleSourceChip component="span" service="tasks" />}
              {task.source === 'google_calendar' && <GoogleSourceChip component="span" service="calendar" />}
              {(task.source === 'gmail' || task.source === 'google_gmail') && <GoogleSourceChip component="span" service="gmail" />}
              {task.is_daily_anchor && <Chip component="span" size="small" label="Daily Anchor" color="secondary" variant="outlined" />}
              {task.scheduled_time && <span>{task.scheduled_time.slice(0, 5)}</span>}
              {contextLabel && <span>{contextLabel}</span>}
            </Stack>
          }
          primaryTypographyProps={{ sx: complete ? { textDecoration: 'line-through', color: 'text.disabled' } : undefined }}
        />
      </ListItemButton>
      <Stack direction="row" flexShrink={0} pr={0.5}>
        {onHide && <Tooltip title={hidden ? 'Show task' : 'Hide task'}><IconButton onClick={onHide} aria-label={`${hidden ? 'Show' : 'Hide'} ${task.title}`}>{hidden ? <Visibility /> : <VisibilityOff />}</IconButton></Tooltip>}
        {!complete && !hidden && <Tooltip title="Start focus"><IconButton onClick={onFocus} aria-label={`Start focus on ${task.title}`}><PlayArrow /></IconButton></Tooltip>}
      </Stack>
    </ListItem>
  );
}
