import { Chip, type ChipProps } from '@mui/material';

const labels = {
  tasks: 'Google Tasks',
  calendar: 'Google Calendar',
  gmail: 'Google Gmail',
} as const;

export function GoogleSourceChip({
  service,
  ...props
}: Omit<ChipProps, 'label'> & { service: keyof typeof labels }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color="primary"
      label={labels[service]}
      {...props}
    />
  );
}
