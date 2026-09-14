import type { ReactNode } from 'react';
import { Badge, Box, Button, Divider, Drawer, IconButton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Close, FilterList } from '@mui/icons-material';

export function FilterButton({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <Badge badgeContent={activeCount} color="primary" invisible={activeCount === 0}>
      <Button variant="outlined" startIcon={<FilterList />} onClick={onClick}>
        Filters
      </Button>
    </Badge>
  );
}

export function FilterDrawer({
  open, title = 'Filters', activeCount, onClose, onClear, children,
}: {
  open: boolean;
  title?: string;
  activeCount: number;
  onClose: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('sm'));

  return (
    <Drawer
      anchor={desktop ? 'right' : 'bottom'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: desktop
            ? { width: 380, maxWidth: '100vw' }
            : { maxHeight: '88dvh', borderRadius: '24px 24px 0 0' },
        },
      }}
    >
      <Stack height="100%" minHeight={0}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" px={3} py={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close filters"><Close /></IconButton>
        </Stack>
        <Divider />
        <Box sx={{ overflowY: 'auto', px: 3, py: 2.5 }}>{children}</Box>
        <Stack direction="row" gap={1.5} mt="auto" px={3} py={2} borderTop={1} borderColor="divider">
          <Button fullWidth onClick={onClear} disabled={activeCount === 0}>Clear</Button>
          <Button fullWidth variant="contained" onClick={onClose}>Show results</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
