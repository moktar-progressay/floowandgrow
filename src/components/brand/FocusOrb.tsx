import type { CSSProperties } from 'react';
import { Box, type BoxProps } from '@mui/material';

export type OrbActivity = 'calm' | 'active' | 'breathing';

export interface FocusOrbProps extends Omit<BoxProps, 'children'> {
  size?: number | string;
  activity?: OrbActivity;
}

const particles = [
  { left: '20%', top: '30%', size: 3, delay: '-1.2s' },
  { left: '32%', top: '18%', size: 2, delay: '-4.8s' },
  { left: '45%', top: '34%', size: 4, delay: '-2.9s' },
  { left: '62%', top: '21%', size: 2, delay: '-6.1s' },
  { left: '75%', top: '37%', size: 3, delay: '-3.7s' },
  { left: '83%', top: '55%', size: 2, delay: '-7.4s' },
  { left: '66%', top: '70%', size: 4, delay: '-5.2s' },
  { left: '48%', top: '79%', size: 2, delay: '-0.8s' },
  { left: '28%', top: '68%', size: 3, delay: '-6.8s' },
  { left: '17%', top: '52%', size: 2, delay: '-3.1s' },
  { left: '55%', top: '52%', size: 2, delay: '-5.8s' },
  { left: '39%', top: '55%', size: 2, delay: '-2.1s' },
] as const;

const activitySettings: Record<OrbActivity, { duration: number; breathe: string; saturation: number }> = {
  calm: { duration: 18, breathe: '7s', saturation: 1 },
  active: { duration: 8, breathe: '3.4s', saturation: 1.18 },
  breathing: { duration: 14, breathe: '14s', saturation: 1.08 },
};

/**
 * FocusOS's reusable ambient orb.
 *
 * The component is decorative, lightweight and entirely CSS-driven. Activity
 * changes animation energy while the user's reduced-motion preference is
 * always respected.
 */
export function FocusOrb({ size = 220, activity = 'calm', sx, ...props }: FocusOrbProps) {
  const settings = activitySettings[activity];
  const variables = {
    '--orb-rotation': `${settings.duration}s`,
    '--orb-breathe': settings.breathe,
    '--orb-saturation': settings.saturation,
  } as CSSProperties;

  return (
    <Box
      aria-hidden="true"
      data-orb-activity={activity}
      {...props}
      style={{ ...variables, ...props.style }}
      sx={{
        width: size,
        height: size,
        aspectRatio: '1',
        flex: '0 0 auto',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        isolation: 'isolate',
        animation: 'focusos-orb-breathe var(--orb-breathe) ease-in-out infinite',
        filter: 'saturate(var(--orb-saturation))',
        willChange: 'transform, filter',
        '@keyframes focusos-orb-breathe': {
          '0%, 100%': { transform: 'translateY(3px) scale(.985)' },
          '50%': { transform: 'translateY(-7px) scale(1.035)' },
        },
        '@keyframes focusos-orb-spin': { to: { transform: 'rotate(360deg)' } },
        '@keyframes focusos-orb-spin-reverse': { to: { transform: 'rotate(-360deg)' } },
        '@keyframes focusos-orb-drift': {
          '0%, 100%': { transform: 'translate3d(-6%, 3%, 0) rotate(0deg) scale(1)' },
          '50%': { transform: 'translate3d(8%, -5%, 0) rotate(150deg) scale(1.14)' },
        },
        '@keyframes focusos-orb-particle': {
          '0%, 100%': { opacity: 0.15, transform: 'translate3d(0, 7px, 0) scale(.75)' },
          '45%': { opacity: 0.9, transform: 'translate3d(4px, -9px, 0) scale(1.25)' },
        },
        '&::before': {
          content: '""', position: 'absolute', inset: '4%', borderRadius: '50%',
          background: 'rgba(58, 198, 255, .30)', filter: 'blur(24px)', transform: 'scale(1.1)', zIndex: -2,
        },
        '&::after': {
          content: '""', position: 'absolute', inset: '-7%', borderRadius: '50%',
          border: '1px solid rgba(129, 189, 255, .20)', boxShadow: '0 0 34px rgba(37, 185, 244, .14)', zIndex: -1,
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '& *, & *::before, & *::after': { animation: 'none !important' },
        },
        ...sx,
      }}
    >
      <Box
        className="focusos-orb-surface"
        sx={{
          position: 'absolute', inset: '8%', overflow: 'hidden', borderRadius: '50%', transform: 'translateZ(0)',
          background: 'linear-gradient(145deg, #091348 0%, #3358d9 28%, #10bfe9 53%, #7a5cf5 76%, #15103f 100%)',
          boxShadow: '0 20px 54px rgba(26,49,130,.38), 0 0 52px rgba(37,185,244,.46), inset 20px 18px 38px rgba(255,255,255,.16), inset -24px -26px 42px rgba(10,5,60,.48)',
          '&::before': {
            content: '""', position: 'absolute', inset: '1px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.55)',
            background: 'radial-gradient(circle at 33% 24%, rgba(255,255,255,.95) 0 1.5%, rgba(189,245,255,.60) 3%, transparent 17%), radial-gradient(circle at 45% 43%, rgba(255,255,255,.34), transparent 34%)',
            boxShadow: 'inset 0 0 10px rgba(255,255,255,.74), inset 0 0 32px rgba(92,222,255,.30)', zIndex: 7,
          },
          '&::after': {
            content: '""', position: 'absolute', inset: '15%', borderRadius: '44% 56% 62% 38% / 48% 38% 62% 52%',
            background: 'rgba(209,250,255,.70)', filter: 'blur(18px)', mixBlendMode: 'screen',
            animation: 'focusos-orb-spin calc(var(--orb-rotation) * .72) linear infinite', zIndex: 4,
          },
        }}
      >
        <Box sx={{
          position: 'absolute', width: '118%', height: '74%', left: '-18%', top: '31%',
          borderRadius: '42% 58% 67% 33% / 61% 42% 58% 39%',
          background: 'linear-gradient(110deg, rgba(255,255,255,.86), rgba(46,225,255,.30) 42%, rgba(95,65,245,.74))',
          filter: 'blur(9px)', mixBlendMode: 'screen', animation: 'focusos-orb-drift var(--orb-rotation) ease-in-out infinite',
        }} />
        <Box sx={{
          position: 'absolute', width: '105%', height: '67%', right: '-19%', top: '-8%',
          borderRadius: '58% 42% 34% 66% / 41% 64% 36% 59%',
          background: 'linear-gradient(155deg, rgba(124,91,255,.34), rgba(130,245,255,.84), rgba(255,255,255,.52))',
          filter: 'blur(12px)', mixBlendMode: 'screen', animation: 'focusos-orb-spin-reverse calc(var(--orb-rotation) * 1.2) linear infinite',
        }} />
        <Box sx={{
          position: 'absolute', inset: '27%', borderRadius: '50%', background: '#d9fbff',
          boxShadow: '0 0 20px #fff, 0 0 46px #66edff, 0 0 78px rgba(111,83,255,.9)',
          filter: 'blur(5px)', mixBlendMode: 'screen', animation: 'focusos-orb-spin calc(var(--orb-rotation) * .48) linear infinite',
        }} />
        {particles.map((particle, index) => (
          <Box component="span" key={index} sx={{
            position: 'absolute', left: particle.left, top: particle.top, width: particle.size, height: particle.size,
            borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 0 7px rgba(207,250,255,.95)',
            mixBlendMode: 'screen', animation: 'focusos-orb-particle 7s ease-in-out infinite',
            animationDelay: particle.delay, zIndex: 6,
          }} />
        ))}
      </Box>
    </Box>
  );
}
