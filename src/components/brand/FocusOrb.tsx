import { Box, type BoxProps } from '@mui/material';

export function FocusOrb({ size = 220, ...props }: BoxProps & { size?: number | string }) {
  return (
    <Box
      aria-hidden="true"
      {...props}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        background:
          'radial-gradient(circle at 34% 25%,rgba(255,255,255,.92) 0 2%,rgba(173,240,255,.5) 3%,transparent 16%), radial-gradient(circle at 50% 48%,#fff 0 4%,#82f4ff 5%,#26c2f5 17%,#536dff 39%,#7650ef 60%,rgba(14,32,68,.18) 72%)',
        boxShadow:
          '0 0 68px rgba(37,185,244,.42), 0 24px 72px rgba(119,100,246,.28), inset -22px -24px 38px rgba(28,18,105,.34), inset 18px 15px 30px rgba(255,255,255,.20)',
        animation: 'focusos-breathe 5.6s ease-in-out infinite',
        '@keyframes focusos-breathe': {
          '0%, 100%': { transform: 'translateY(5px) scale(1)', filter: 'saturate(.95)' },
          '50%': { transform: 'translateY(-8px) scale(1.045)', filter: 'saturate(1.1)' },
        },
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          inset: -24,
          border: '1px solid rgba(75,163,255,.28)',
          borderRadius: '50%',
        },
        '&::after': { inset: -48, borderColor: 'rgba(119,100,246,.18)' },
        ...props.sx,
      }}
    />
  );
}
