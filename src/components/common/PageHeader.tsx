import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} mb={3}>
      <Box>
        {eyebrow && (
          <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={2}>
            {eyebrow}
          </Typography>
        )}
        <Typography component="h1" variant="h4" fontWeight={800}>
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" mt={0.5}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
