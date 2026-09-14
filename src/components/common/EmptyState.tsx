import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Box textAlign="center" py={6} px={2}>
      <Box color="text.secondary" mb={1}>{icon}</Box>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      <Typography color="text.secondary" maxWidth={440} mx="auto" mt={0.5}>{description}</Typography>
      {actionLabel && onAction && <Button onClick={onAction} sx={{ mt: 2 }}>{actionLabel}</Button>}
    </Box>
  );
}
