import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import { AccessTime, CalendarMonth, Close, LocationOn, OpenInNew, People } from '@mui/icons-material';
import { GoogleSourceChip } from '../../components/common/GoogleSourceChip';
import type { GoogleEvent } from '../../types/models';

function eventRange(event: GoogleEvent) {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  if (Number.isNaN(start.getTime())) return 'All day';
  const date = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (/^\d{4}-\d{2}-\d{2}$/.test(event.start)) return date + ' · All day';
  const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endTime = end && !Number.isNaN(end.getTime()) ? end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
  return `${date} · ${startTime}${endTime ? ` to ${endTime}` : ''}`;
}

export function CalendarEventDialog({ event, onClose }: { event: GoogleEvent | null; onClose: () => void }) {
  return <Dialog open={Boolean(event)} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { m: { xs: 1, sm: 2 }, borderRadius: 3 } }}>
    <DialogTitle sx={{ pr: 7 }}>
      <Stack gap={1}>
        <Stack direction="row" gap={1} flexWrap="wrap"><GoogleSourceChip service="calendar" />{event?.calendarName && <Chip size="small" variant="outlined" label={event.calendarName} />}</Stack>
        <Typography variant="h5" component="h2" fontWeight={850}>{event?.title || event?.summary || 'Calendar event'}</Typography>
      </Stack>
      <IconButton onClick={onClose} aria-label="Close event" sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton>
    </DialogTitle>
    <Divider />
    <DialogContent>
      {event && <Stack gap={2.25}>
        <Stack direction="row" gap={1.5} alignItems="flex-start"><AccessTime color="primary" /><Typography>{eventRange(event)}</Typography></Stack>
        {event.location && <Stack direction="row" gap={1.5} alignItems="flex-start"><LocationOn color="primary" /><Typography sx={{ overflowWrap: 'anywhere' }}>{event.location}</Typography></Stack>}
        {event.organiser && <Stack direction="row" gap={1.5} alignItems="flex-start"><People color="primary" /><Typography>Organised by {event.organiser}</Typography></Stack>}
        {event.attendees?.length ? <Stack direction="row" gap={1.5} alignItems="flex-start"><People color="primary" /><Stack><Typography fontWeight={750}>Guests</Typography>{event.attendees.map((attendee) => <Typography key={attendee} variant="body2" color="text.secondary">{attendee}</Typography>)}</Stack></Stack> : null}
        {event.description && <Stack gap={0.75}><Typography fontWeight={750}>Notes</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65 }}>{event.description}</Typography></Stack>}
      </Stack>}
    </DialogContent>
    <Divider />
    <DialogActions sx={{ p: 2, justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
      {event?.meetingLink && <Button variant="contained" component="a" href={event.meetingLink} target="_blank" rel="noopener" startIcon={<People />}>Join meeting</Button>}
      {event?.link && <Button component="a" href={event.link} target="_blank" rel="noopener" startIcon={<CalendarMonth />}>Open in Google Calendar</Button>}
    </DialogActions>
  </Dialog>;
}
