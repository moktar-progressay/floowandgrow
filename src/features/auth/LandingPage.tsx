import { Box, Button, Container, IconButton, Stack, Typography } from '@mui/material';
import { DarkMode, LightMode, Security, TrackChanges, ViewTimeline, TaskAlt } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useColourMode } from '../../app/AppProviders';
import { BrandMark } from '../../components/brand/BrandMark';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { SurfaceCard } from '../../components/common/SurfaceCard';

export function LandingPage() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useColourMode();
  return (
    <Box
      minHeight="100dvh"
      sx={{
        background:
          'radial-gradient(circle at 75% 12%, rgba(119,100,246,.15), transparent 34%), radial-gradient(circle at 18% 72%, rgba(37,185,244,.12), transparent 35%)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <BrandMark />
          <IconButton onClick={toggleMode} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Stack>
        <Stack alignItems="center" textAlign="center" py={{ xs: 7, md: 10 }}>
          <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={3}>
            Your calm command centre
          </Typography>
          <Typography variant="h2" component="h1" fontWeight={800} maxWidth={780} mt={2} sx={{ fontSize: { xs: 42, md: 68 } }}>
            Your life, organised around what matters now.
          </Typography>
          <Typography color="text.secondary" fontSize={{ xs: 17, md: 20 }} maxWidth={650} mt={3}>
            Bring your tasks, calendar, emails and documents together, then focus on the next right thing.
          </Typography>
          <Box my={{ xs: 9, md: 11 }}><FocusOrb size="clamp(175px, 32vw, 245px)" /></Box>
          <Stack width="100%" maxWidth={420} gap={1.5}>
            <Button size="large" variant="contained" onClick={() => navigate('/auth?mode=signup')}>Get started</Button>
            <Button size="large" variant="outlined" onClick={() => navigate('/auth?mode=signin')}>Log in</Button>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1} mt={3} color="text.secondary">
            <Security fontSize="small" />
            <Typography variant="caption">You stay in control. FocusOS acts only with your permission.</Typography>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} pb={4}>
          {[
            [<TrackChanges key="one" />, 'One clear priority'],
            [<ViewTimeline key="two" />, 'Automatic daily plan'],
            [<TaskAlt key="three" />, 'Fewer forgotten tasks'],
          ].map(([icon, label]) => (
            <SurfaceCard key={String(label)} sx={{ flex: 1 }}>
              <Stack alignItems="center" gap={1} color="text.secondary">{icon}<Typography>{label}</Typography></Stack>
            </SurfaceCard>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
