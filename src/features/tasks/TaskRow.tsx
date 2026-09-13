import { Checkbox, Chip, IconButton, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import type { FocusProject, FocusTask } from '../../types/models';

export function TaskRow({
  task, project, onToggle, onEdit, onFocus,
}: {
  task: FocusTask;
  project?: FocusProject;
  onToggle: () => void;
  onEdit: () => void;
  onFocus: () => void;
}) {
  const complete = task.status === 'completed';
  return (
    <ListItem
      disablePadding
      secondaryAction={!complete && <Tooltip title="Start focus"><IconButton onClick={onFocus} aria-label={`Start focus on ${task.title}`}><PlayArrow /></IconButton></Tooltip>}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Checkbox checked={complete} onChange={onToggle} inputProps={{ 'aria-label': `${complete ? 'Reopen' : 'Complete'} ${task.title}` }} />
      <ListItemButton onClick={onEdit} sx={{ pr: 7, py: 1.5 }}>
        <ListItemText
          primary={task.title}
          secondary={
            <Stack component="span" direction="row" alignItems="center" gap={1} mt={0.5}>
              <Chip component="span" size="small" label={project?.name ?? 'Inbox'} sx={project?.colour ? { borderColor: project.colour } : undefined} variant="outlined" />
              {task.scheduled_time && <span>{task.scheduled_time.slice(0, 5)}</span>}
            </Stack>
          }
          primaryTypographyProps={{ sx: complete ? { textDecoration: 'line-through', color: 'text.disabled' } : undefined }}
        />
      </ListItemButton>
    </ListItem>
  );
}
