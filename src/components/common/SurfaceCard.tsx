import { Card, CardContent, type CardProps } from '@mui/material';
import type { ReactNode } from 'react';

export function SurfaceCard({
  children,
  contentSx,
  ...props
}: CardProps & { children: ReactNode; contentSx?: CardProps['sx'] }) {
  return (
    <Card variant="outlined" {...props}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } }, ...contentSx }}>
        {children}
      </CardContent>
    </Card>
  );
}
