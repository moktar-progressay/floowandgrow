import { useEffect, useState } from 'react';
import { Box, Checkbox, Chip, IconButton, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from '@mui/material';
import { PlayArrow, Visibility, VisibilityOff, WhatsApp } from '@mui/icons-material';
import type { FocusProject, FocusTask } from '../../types/models';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import { countdownLabel, taskDueAt } from './taskReminders';

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
  const [now, setNow] = useState(Date.now());
  const [burstActive, setBurstActive] = useState(false);
  const dueAt = taskDueAt(task);
  useEffect(() => {
    if (dueAt === null || complete) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [complete, dueAt]);
  const countdown = complete ? null : countdownLabel(task, now);
  useEffect(() => {
    if (!burstActive) return;
    const timer = window.setTimeout(() => setBurstActive(false), 850);
    return () => window.clearTimeout(timer);
  }, [burstActive]);
  const handleToggle = () => {
    if (!complete) setBurstActive(true);
    onToggle();
  };
  return (
    <ListItem disablePadding sx={{ position: 'relative', overflow: 'visible', transition: 'background-color 220ms ease', bgcolor: burstActive ? 'rgba(46, 204, 113, .08)' : undefined }}>
      {!hidden && <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Checkbox checked={complete} onChange={handleToggle} inputProps={{ 'aria-label': `${complete ? 'Reopen' : 'Complete'} ${task.title}` }} sx={{ transform: burstActive ? 'scale(1.12)' : undefined, transition: 'transform 180ms ease' }} />
        {burstActive && <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', '@media (prefers-reduced-motion: reduce)': { display: 'none' } }}>
          {['#25b9f4', '#7c5cff', '#35b779', '#ffb020', '#f36b91', '#25b9f4', '#7c5cff', '#35b779', '#ffb020', '#f36b91', '#25b9f4', '#7c5cff'].map((colour, index) => {
            const angle = (Math.PI * 2 * index) / 12;
            const x = Math.round(Math.cos(angle) * 24);
            const y = Math.round(Math.sin(angle) * 24);
            return <Box key={index} component="span" sx={{
              position: 'absolute', left: '50%', top: '50%', width: 6, height: 8,
              borderRadius: index % 3 === 0 ? '50%' : '2px', bgcolor: colour,
              animation: 'focusos-task-confetti 760ms cubic-bezier(.16, .75, .25, 1) both',
              '--burst-x': `${x}px`, '--burst-y': `${y}px`,
              '@keyframes focusos-task-confetti': {
                '0%': { opacity: 1, transform: 'translate(-50%, -50%) scale(.8) rotate(0deg)' },
                '100%': { opacity: 0, transform: 'translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(.2) rotate(220deg)' },
              },
            }} />;
          })}
        </Box>}
      </Box>}
      <ListItemButton onClick={onEdit} sx={{ minWidth: 0, px: 1, py: 1.5 }}>
        <ListItemText
          primary={task.title}
          secondary={
            <Stack component="span" direction="row" alignItems="center" flexWrap="wrap" gap={1} mt={0.5}>
              {showProject && <Chip component="span" size="small" label={project?.name ?? 'Inbox'} sx={project?.colour ? { borderColor: project.colour } : undefined} variant="outlined" />}
              {task.source === 'google_tasks' && <GoogleSourceChip component="span" service="tasks" />}
              {task.source === 'google_calendar' && <GoogleSourceChip component="span" service="calendar" />}
              {(task.source === 'gmail' || task.source === 'google_gmail') && <GoogleSourceChip component="span" service="gmail" />}
              {task.source === 'whatsapp' && <Chip component="span" size="small" icon={<WhatsApp />} label="WhatsApp" sx={{ color: '#087b38', borderColor: '#25D366', bgcolor: 'rgba(37, 211, 102, .08)' }} variant="outlined" />}
              {task.is_daily_anchor && <Chip component="span" size="small" label="Daily Anchor" color="secondary" variant="outlined" />}
              {task.scheduled_time && <span>{task.scheduled_time.slice(0, 5)}</span>}
              {countdown && <Chip component="span" size="small" label={countdown} color={countdown.startsWith('Overdue') ? 'error' : 'info'} variant="outlined" />}
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
