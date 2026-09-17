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
  expanded,
  onExpandedChange,
  appearance = 'card',
  sx,
}: {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  appearance?: 'card' | 'plain';
  sx?: AccordionProps['sx'];
}) {
  return (
    <Accordion
      defaultExpanded={expanded === undefined ? defaultExpanded : undefined}
      expanded={expanded}
      onChange={(_, nextExpanded) => onExpandedChange?.(nextExpanded)}
      disableGutters
      variant={appearance === 'plain' ? undefined : 'outlined'}
      sx={{
        borderRadius: appearance === 'plain' ? 0 : 3,
        overflow: 'hidden',
        border: appearance === 'plain' ? 0 : undefined,
        borderBottom: appearance === 'plain' ? 1 : undefined,
        borderColor: appearance === 'plain' ? 'divider' : undefined,
        boxShadow: 'none',
        bgcolor: 'transparent',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { m: 0 },
        ...sx,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: appearance === 'plain' ? 0 : { xs: 2, sm: 2.5 }, minHeight: appearance === 'plain' ? 58 : 64 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} width="100%" pr={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            {icon}
            <Typography variant={appearance === 'plain' ? 'subtitle1' : 'h6'} fontWeight={800}>{title}</Typography>
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
      <AccordionDetails sx={{ px: appearance === 'plain' ? 0 : { xs: 2, sm: 2.5 }, pt: 0, pb: appearance === 'plain' ? 3 : { xs: 2, sm: 2.5 } }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
