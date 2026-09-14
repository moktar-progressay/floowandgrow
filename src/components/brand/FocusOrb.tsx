import { useId, type CSSProperties } from 'react';
import { Box, type BoxProps } from '@mui/material';

export type OrbActivity = 'calm' | 'active' | 'breathing';

export interface FocusOrbProps extends Omit<BoxProps, 'children'> {
  size?: number | string;
  activity?: OrbActivity;
}

const activitySettings: Record<OrbActivity, { flow: number; breathe: string; glow: number }> = {
  calm: { flow: 18, breathe: '7s', glow: 0.72 },
  active: { flow: 8, breathe: '3.4s', glow: 0.92 },
  breathing: { flow: 14, breathe: '14s', glow: 0.82 },
};

const particles = [
  [44, 46, 1.7, 0.8], [67, 35, 1.2, 2.1], [88, 58, 1.5, 4.3],
  [126, 39, 1.4, 1.4], [151, 61, 1.8, 3.6], [163, 98, 1.1, 5.2],
  [143, 133, 1.6, 2.8], [110, 155, 1.2, 0.2], [72, 145, 1.7, 4.8],
  [42, 119, 1.1, 3.1], [93, 85, 1.2, 5.7], [121, 111, 1.4, 1.9],
] as const;

/** A responsive, decorative SVG orb shared across FocusOS experiences. */
export function FocusOrb({ size = 220, activity = 'calm', sx, ...props }: FocusOrbProps) {
  const identifier = useId().replace(/:/g, '');
  const settings = activitySettings[activity];
  const ids = {
    clip: `${identifier}-clip`,
    base: `${identifier}-base`,
    aqua: `${identifier}-aqua`,
    violet: `${identifier}-violet`,
    pink: `${identifier}-pink`,
    volume: `${identifier}-volume`,
    core: `${identifier}-core`,
    shine: `${identifier}-shine`,
  };
  const variables = {
    '--orb-flow': `${settings.flow}s`,
    '--orb-breathe': settings.breathe,
    '--orb-glow': settings.glow,
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
        willChange: 'transform',
        '@keyframes focusos-orb-breathe': {
          '0%, 100%': { transform: 'translateY(3px) scale(.985)' },
          '50%': { transform: 'translateY(-7px) scale(1.035)' },
        },
        '@keyframes focusos-orb-flow-a': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.13)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        '@keyframes focusos-orb-flow-b': {
          '0%': { transform: 'rotate(360deg) scale(1.08)' },
          '50%': { transform: 'rotate(170deg) scale(.94)' },
          '100%': { transform: 'rotate(0deg) scale(1.08)' },
        },
        '@keyframes focusos-orb-core': {
          '0%, 100%': { opacity: 0.78, transform: 'scale(.9)' },
          '50%': { opacity: 1, transform: 'scale(1.14)' },
        },
        '@keyframes focusos-orb-particle': {
          '0%, 100%': { opacity: 0.25, transform: 'translateY(3px) scale(.75)' },
          '45%': { opacity: 1, transform: 'translateY(-5px) scale(1.3)' },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '-15%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88,229,255,calc(var(--orb-glow) * .54)) 0%, rgba(73,158,255,.20) 43%, transparent 70%)',
          zIndex: -2,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: '1%',
          borderRadius: '50%',
          boxShadow: '0 0 36px rgba(45,210,255,.48), 0 0 82px rgba(92,91,246,.26)',
          zIndex: -1,
        },
        '& .orb-flow-a, & .orb-flow-b': {
          transformBox: 'fill-box',
          transformOrigin: 'center',
          willChange: 'transform',
        },
        '& .orb-flow-a': { animation: 'focusos-orb-flow-a var(--orb-flow) linear infinite' },
        '& .orb-flow-b': { animation: 'focusos-orb-flow-b calc(var(--orb-flow) * 1.25) linear infinite' },
        '& .orb-core': {
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation: 'focusos-orb-core calc(var(--orb-breathe) * .72) ease-in-out infinite',
        },
        '& .orb-particle': { animation: 'focusos-orb-particle 6s ease-in-out infinite' },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '& *': { animation: 'none !important' },
        },
        ...sx,
      }}
    >
      <Box
        className="focusos-orb-surface"
        sx={{
          position: 'absolute',
          inset: '7%',
          overflow: 'hidden',
          borderRadius: '50%',
          backgroundColor: '#07113e',
          boxShadow: '0 20px 48px rgba(21,42,120,.38), inset 15px 14px 30px rgba(255,255,255,.13), inset -18px -22px 38px rgba(5,4,44,.55)',
          transform: 'translateZ(0)',
        }}
      >
        <Box component="svg" viewBox="0 0 200 200" sx={{ display: 'block', width: '100%', height: '100%' }}>
          <defs>
            <clipPath id={ids.clip}><circle cx="100" cy="100" r="99" /></clipPath>
            <linearGradient id={ids.base} x1="18%" y1="92%" x2="82%" y2="7%">
              <stop offset="0%" stopColor="#17114f" />
              <stop offset="28%" stopColor="#514de9" />
              <stop offset="54%" stopColor="#18cbe8" />
              <stop offset="77%" stopColor="#2970e8" />
              <stop offset="100%" stopColor="#120d48" />
            </linearGradient>
            <linearGradient id={ids.aqua} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".88" />
              <stop offset="42%" stopColor="#69f5ff" stopOpacity=".80" />
              <stop offset="100%" stopColor="#1685ff" stopOpacity=".22" />
            </linearGradient>
            <linearGradient id={ids.violet} x1="8%" y1="12%" x2="88%" y2="86%">
              <stop offset="0%" stopColor="#bda8ff" stopOpacity=".88" />
              <stop offset="48%" stopColor="#7148f5" stopOpacity=".76" />
              <stop offset="100%" stopColor="#22dff5" stopOpacity=".30" />
            </linearGradient>
            <linearGradient id={ids.pink} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff91e8" stopOpacity=".68" />
              <stop offset="55%" stopColor="#8857ff" stopOpacity=".66" />
              <stop offset="100%" stopColor="#28e4ff" stopOpacity=".16" />
            </linearGradient>
            <radialGradient id={ids.volume} cx="34%" cy="26%" r="78%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".54" />
              <stop offset="28%" stopColor="#d7fbff" stopOpacity=".10" />
              <stop offset="65%" stopColor="#154fc5" stopOpacity=".10" />
              <stop offset="88%" stopColor="#08072f" stopOpacity=".58" />
              <stop offset="100%" stopColor="#030219" stopOpacity=".82" />
            </radialGradient>
            <radialGradient id={ids.core} cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".98" />
              <stop offset="18%" stopColor="#dcfdff" stopOpacity=".92" />
              <stop offset="52%" stopColor="#50e8ff" stopOpacity=".38" />
              <stop offset="100%" stopColor="#5572ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={ids.shine} cx="32%" cy="20%" r="44%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity=".92" />
              <stop offset="18%" stopColor="#dcfbff" stopOpacity=".28" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g clipPath={`url(#${ids.clip})`}>
            <circle cx="100" cy="100" r="100" fill={`url(#${ids.base})`} />

            <g className="orb-flow-a">
              <ellipse cx="82" cy="124" rx="92" ry="45" fill={`url(#${ids.aqua})`} transform="rotate(-18 82 124)" />
              <ellipse cx="144" cy="69" rx="75" ry="34" fill={`url(#${ids.violet})`} transform="rotate(42 144 69)" />
            </g>
            <g className="orb-flow-b">
              <path d="M-22 72 C25 19 76 43 111 75 C142 104 175 100 224 62 L224 145 C173 181 119 142 85 116 C50 89 16 116 -22 137 Z" fill={`url(#${ids.pink})`} />
              <ellipse cx="46" cy="73" rx="64" ry="31" fill={`url(#${ids.aqua})`} transform="rotate(63 46 73)" opacity=".72" />
            </g>

            <circle className="orb-core" cx="100" cy="100" r="58" fill={`url(#${ids.core})`} />
            <circle cx="100" cy="100" r="100" fill={`url(#${ids.volume})`} />
            <circle cx="100" cy="100" r="99" fill={`url(#${ids.shine})`} />

            {particles.map(([cx, cy, radius, delay], index) => (
              <circle
                className="orb-particle"
                key={index}
                cx={cx}
                cy={cy}
                r={radius}
                fill="white"
                opacity=".8"
                style={{ animationDelay: `-${delay}s` }}
              />
            ))}
          </g>

          <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(255,255,255,.66)" strokeWidth="1.3" />
          <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(160,239,255,.25)" strokeWidth="1" />
          <ellipse cx="70" cy="47" rx="23" ry="10" fill="rgba(255,255,255,.25)" transform="rotate(-24 70 47)" />
        </Box>
      </Box>
    </Box>
  );
}
