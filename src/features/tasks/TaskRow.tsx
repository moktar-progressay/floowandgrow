import { Checkbox, Chip, IconButton, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from '@mui/material';
import { PlayArrow, Visibility, VisibilityOff } from '@mui/icons-material';
import type { FocusProject, FocusTask } from '../../types/models';

export function TaskRow({
  task, project, completed, contextLabel, hidden = false, onToggle, onEdit, onFocus, onHide,
}: {
  task: FocusTask;
  project?: FocusProject;
  completed?: boolean;
  contextLabel?: string;
  hidden?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onHide?: () => void;
}) {
  const complete = completed ?? task.status === 'completed';
  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Stack direction="row">
          {onHide && <Tooltip title={hidden ? 'Show task' : 'Hide task'}><IconButton onClick={onHide} aria-label={`${hidden ? 'Show' : 'Hide'} ${task.title}`}>{hidden ? <Visibility /> : <VisibilityOff />}</IconButton></Tooltip>}
          {!complete && !hidden && <Tooltip title="Start focus"><IconButton onClick={onFocus} aria-label={`Start focus on ${task.title}`}><PlayArrow /></IconButton></Tooltip>}
        </Stack>
      }
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      {!hidden && <Checkbox checked={complete} onChange={onToggle} inputProps={{ 'aria-label': `${complete ? 'Reopen' : 'Complete'} ${task.title}` }} />}
      <ListItemButton onClick={onEdit} sx={{ pr: 7, py: 1.5 }}>
        <ListItemText
          primary={task.title}
          secondary={
            <Stack component="span" direction="row" alignItems="center" flexWrap="wrap" gap={1} mt={0.5}>
              <Chip component="span" size="small" label={project?.name ?? 'Inbox'} sx={project?.colour ? { borderColor: project.colour } : undefined} variant="outlined" />
              {task.source === 'google_tasks' && <Chip component="span" size="small" label="Google Tasks" color="primary" variant="outlined" />}
              {task.scheduled_time && <span>{task.scheduled_time.slice(0, 5)}</span>}
              {contextLabel && <span>{contextLabel}</span>}
            </Stack>
          }
          primaryTypographyProps={{ sx: complete ? { textDecoration: 'line-through', color: 'text.disabled' } : undefined }}
        />
      </ListItemButton>
    </ListItem>
  );
}
