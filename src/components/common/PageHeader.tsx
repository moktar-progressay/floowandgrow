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
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} gap={2} mb={{ xs: 2.5, md: 3.5 }}>
      <Box minWidth={0}>
        {eyebrow && (
          <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={2}>
            {eyebrow}
          </Typography>
        )}
        <Typography component="h1" fontWeight={800} sx={{ fontSize: { xs: '2rem', md: '2.35rem' }, lineHeight: 1.15 }}>
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" mt={0.5}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>{action}</Box>}
    </Stack>
  );
}
