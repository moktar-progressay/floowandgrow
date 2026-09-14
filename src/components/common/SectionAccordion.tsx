import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
  type AccordionProps,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import type { ReactNode } from 'react';

export function SectionAccordion({
  title,
  icon,
  meta,
  action,
  children,
  defaultExpanded = false,
  sx,
}: {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  sx?: AccordionProps['sx'];
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { m: 0 },
        ...sx,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: { xs: 2, sm: 2.5 }, minHeight: 64 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} width="100%" pr={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            {icon}
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
          </Stack>
          {(meta || action) && (
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {meta}
              {action}
            </Box>
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pt: 0, pb: { xs: 2, sm: 2.5 } }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
