import { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, Grid, IconButton, LinearProgress,
  Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  AccessTime, Anchor, CalendarMonth, Check, Close, Email, EmojiEvents, Flag,
  LocalFireDepartment, MilitaryTech, Reply, Star, TaskAlt,
} from '@mui/icons-material';
import { FocusOrb } from '../../components/brand/FocusOrb';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { RewardEvent, RewardKind } from '../../types/models';
import {
  awardsFor, dailyXp, eventsInBounds, momentumStreak, progressBounds, summariseProgress,
  type AwardDefinition, type ProgressRange,
} from './gamification';

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeTitle(range: ProgressRange) {
  return range === 'day' ? 'Today' : range === 'week' ? 'This week' : range === 'month' ? 'This month' : 'Custom range';
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ''}`.trim() : `${minutes}m`;
}

const awardIcon: Record<string, React.ReactNode> = {
  'task-tamer': <Flag />,
  'inbox-zero': <Email />,
  'deep-focus': <AccessTime />,
  'reply-hero': <Reply />,
  'anchor-keeper': <Anchor />,
  'weekly-win': <EmojiEvents />,
};

function relevantKinds(awardId: string): RewardKind[] {
  if (awardId === 'task-tamer') return ['task_completed', 'anchor_completed'];
  if (awardId === 'inbox-zero') return ['inbox_zero'];
  if (awardId === 'deep-focus') return ['focus_sprint_completed'];
  if (awardId === 'reply-hero') return ['email_replied'];
  if (awardId === 'anchor-keeper') return ['anchor_completed'];
  return ['task_completed', 'anchor_completed', 'email_read', 'email_archived', 'email_replied', 'follow_up_created', 'focus_sprint_completed', 'inbox_zero'];
}

function XpChart({ values }: { values: Array<{ date: string; xp: number }> }) {
  const plotted = values.length ? values : [{ date: '', xp: 0 }];
  const max = Math.max(1, ...plotted.map((item) => item.xp));
  const points = plotted.map((item, index) => {
    const x = plotted.length === 1 ? 150 : 12 + (index / (plotted.length - 1)) * 276;
    const y = 94 - (item.xp / max) * 70;
    return `${x},${y}`;
  }).join(' ');
  return <Box>
    <Box component="svg" viewBox="0 0 300 110" width="100%" role="img" aria-label="XP earned by day">
      <title>XP earned by day</title>
      <line x1="12" y1="94" x2="288" y2="94" stroke="currentColor" opacity=".18" />
      <polyline points={points} fill="none" stroke="#25b9f4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {points.split(' ').map((point, index) => {
        const [cx, cy] = point.split(',');
        return <circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r="4" fill="#020817" stroke="#25b9f4" strokeWidth="3" />;
      })}
    </Box>
    <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">{plotted[0]?.date.slice(5)}</Typography><Typography variant="caption" color="text.secondary">{plotted.at(-1)?.date.slice(5)}</Typography></Stack>
  </Box>;
}

export function ProgressPage({ events, totalXp }: { events: RewardEvent[]; totalXp: number }) {
  const [section, setSection] = useState<'progress' | 'awards'>('progress');
  const [range, setRange] = useState<ProgressRange>('week');
  const [customStart, setCustomStart] = useState(inputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(inputDate(new Date()));
  const [selectedAward, setSelectedAward] = useState<AwardDefinition | null>(null);
  const bounds = useMemo(() => progressBounds(range, new Date(), customStart, customEnd), [range, customStart, customEnd]);
  const summary = useMemo(() => summariseProgress(events, bounds), [events, bounds]);
  const chart = useMemo(() => dailyXp(events, bounds), [events, bounds]);
  const awards = useMemo(() => awardsFor(events), [events]);
  const rangeGoal = range === 'day' ? 150 : range === 'week' ? 900 : range === 'month' ? 3600 : Math.max(150, chart.length * 150);
  const awardHistory = selectedAward
    ? events.filter((event) => relevantKinds(selectedAward.id).includes(event.kind)).slice(0, 5)
    : [];

  return <>
    <PageHeader eyebrow="Gamification" title="Progress" description="Every small action counts, wherever you complete it." action={<Chip icon={<Star />} label={`${totalXp} total XP`} color="primary" variant="outlined" />} />
    <Stack maxWidth={820} mx="auto" gap={2.5}>
      <Tabs value={section} onChange={(_, value: 'progress' | 'awards') => setSection(value)} variant="fullWidth" aria-label="Progress sections">
        <Tab value="progress" label="Progress" />
        <Tab value="awards" label="Awards" />
      </Tabs>

      {section === 'progress' ? <>
        <ToggleButtonGroup exclusive fullWidth size="small" value={range} onChange={(_, value: ProgressRange | null) => value && setRange(value)} aria-label="Progress range">
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="custom"><CalendarMonth fontSize="small" sx={{ mr: .5 }} />Custom</ToggleButton>
        </ToggleButtonGroup>
        {range === 'custom' && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          <TextField type="date" label="From" value={customStart} onChange={(event) => setCustomStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" label="To" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>}
        <SurfaceCard>
          <Stack alignItems="center" textAlign="center" gap={1.5}>
            <Box position="relative" display="grid" sx={{ width: 'clamp(210px, 60vw, 290px)', height: 'clamp(210px, 60vw, 290px)', placeItems: 'center' }}>
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(#25b9f4 ${Math.min(100, summary.xp / rangeGoal * 100)}%, rgba(37,185,244,.10) 0)`, p: '8px' }}><Box width="100%" height="100%" borderRadius="50%" bgcolor="background.paper" /></Box>
              <Stack alignItems="center" zIndex={1}><FocusOrb size="95px" activity="active" /><Typography color="text.secondary">{rangeTitle(range)}</Typography><Typography variant="h3" fontWeight={900}>{summary.xp} XP</Typography><Typography color="text.secondary">of {rangeGoal} XP</Typography></Stack>
            </Box>
            <Grid container spacing={1} width="100%">
              {[
                { label: 'Tasks', value: summary.tasks, icon: <TaskAlt color="secondary" /> },
                { label: 'Emails', value: summary.emails, icon: <Email color="primary" /> },
                { label: 'Focus', value: formatMinutes(summary.focusMinutes), icon: <AccessTime color="success" /> },
                { label: 'Streak', value: `${momentumStreak(events)} days`, icon: <LocalFireDepartment color="warning" /> },
              ].map((metric) => <Grid key={metric.label} size={{ xs: 6, sm: 3 }}><SurfaceCard sx={{ height: '100%', p: 1.5 }}><Stack alignItems="center">{metric.icon}<Typography variant="h6" fontWeight={850}>{metric.value}</Typography><Typography variant="caption" color="text.secondary">{metric.label}</Typography></Stack></SurfaceCard></Grid>)}
            </Grid>
          </Stack>
        </SurfaceCard>
        <SurfaceCard>
          <Typography variant="h6" fontWeight={850} mb={1}>Your progress</Typography>
          <XpChart values={chart} />
          <Typography mt={1.5} color="text.secondary">{summary.events.length ? 'You kept moving important work forward.' : 'Complete one small action to begin this view.'}</Typography>
        </SurfaceCard>
      </> : <>
        <Stack><Typography variant="h4" fontWeight={850}>Awards</Typography><Typography color="text.secondary">Small wins count.</Typography></Stack>
        <Grid container spacing={1.5}>
          {awards.map((award) => {
            const unlocked = award.progress >= award.target;
            return <Grid key={award.id} size={{ xs: 6, sm: 4 }}><Button onClick={() => setSelectedAward(award)} sx={{ width: '100%', height: '100%', p: 0, textAlign: 'center' }}>
              <SurfaceCard sx={{ width: '100%', height: '100%', opacity: unlocked ? 1 : .62 }}>
                <Stack alignItems="center" gap={1}>
                  <Box sx={{ width: 82, aspectRatio: 1, clipPath: 'polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0 50%)', bgcolor: `${award.colour}.main`, color: '#fff', display: 'grid', placeItems: 'center', '& svg': { fontSize: 38 } }}>{awardIcon[award.id] ?? <MilitaryTech />}</Box>
                  <Typography fontWeight={850}>{award.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{Math.min(award.progress, award.target)} of {award.target}</Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, award.progress / award.target * 100)} sx={{ width: '100%', height: 5, borderRadius: 9 }} />
                </Stack>
              </SurfaceCard>
            </Button></Grid>;
          })}
        </Grid>
      </>}
    </Stack>

    <Dialog open={Boolean(selectedAward)} onClose={() => setSelectedAward(null)} fullWidth maxWidth="sm">
      {selectedAward && <>
        <DialogTitle><Stack direction="row" alignItems="center" justifyContent="space-between"><span>Achievement</span><IconButton aria-label="Close achievement" onClick={() => setSelectedAward(null)}><Close /></IconButton></Stack></DialogTitle>
        <DialogContent>
          <Stack alignItems="center" textAlign="center" gap={2} pb={2}>
            <Box sx={{ width: 130, aspectRatio: 1, clipPath: 'polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0 50%)', bgcolor: `${selectedAward.colour}.main`, color: '#fff', display: 'grid', placeItems: 'center', '& svg': { fontSize: 62 } }}>{awardIcon[selectedAward.id] ?? <MilitaryTech />}</Box>
            <Chip label={selectedAward.progress >= selectedAward.target ? 'Unlocked' : `${Math.min(selectedAward.progress, selectedAward.target)} of ${selectedAward.target}`} color={selectedAward.progress >= selectedAward.target ? 'success' : 'default'} />
            <Stack gap={.5}><Typography variant="h4" fontWeight={900}>{selectedAward.title}</Typography><Typography variant="h6" color="text.secondary">{selectedAward.detail}</Typography><Typography color="text.secondary">Every action counts once, wherever you finish it.</Typography></Stack>
            <SurfaceCard sx={{ width: '100%' }}><Typography fontWeight={850} mb={1.5}>Counts everywhere</Typography><Grid container spacing={1}>{[
              { label: 'List', icon: <Check /> }, { label: 'Calendar', icon: <CalendarMonth /> }, { label: 'Focus Mode', icon: <AccessTime /> }, { label: 'Task Town', icon: <Flag /> },
            ].map((item) => <Grid key={item.label} size={3}><Stack alignItems="center" gap={.5}>{item.icon}<Typography variant="caption">{item.label}</Typography></Stack></Grid>)}</Grid></SurfaceCard>
            <Stack width="100%" alignItems="stretch" gap={1}><Typography variant="h6" textAlign="left" fontWeight={850}>History</Typography>{awardHistory.length ? awardHistory.map((event) => <SurfaceCard key={event.id} sx={{ py: 1.25 }}><Stack direction="row" alignItems="center" gap={1}><Star color="secondary" /><Typography flex={1} textAlign="left">+{event.points} XP</Typography><Typography variant="caption" color="text.secondary">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(event.occurred_at))}</Typography></Stack></SurfaceCard>) : <Typography color="text.secondary" textAlign="left">No progress recorded yet.</Typography>}</Stack>
          </Stack>
        </DialogContent>
      </>}
    </Dialog>
  </>;
}
