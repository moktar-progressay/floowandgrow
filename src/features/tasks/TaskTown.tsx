import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Switch, Typography,
} from '@mui/material';
import {
  ArrowDownward, ArrowLeft, ArrowRight, ArrowUpward, AutoAwesome, Bolt,
  CalendarMonth, Email, Flag, PlayArrow, RestartAlt, Shield, TaskAlt,
} from '@mui/icons-material';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import type { FocusTask, GoogleEvent } from '../../types/models';
import {
  minutesUntilEvent, missionReward, nextCalendarEvent, selectMission,
  taskMissionSource, type MissionSources,
} from './taskTown';
import { localDate } from './taskDates';

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';

const columns = 11;
const rows = 9;
const playerStart: Point = { x: 1, y: 7 };
const enemyStarts: Point[] = [{ x: 9, y: 1 }, { x: 9, y: 7 }, { x: 5, y: 4 }];
const walls = new Set([
  '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0', '9,0', '10,0',
  '0,1', '10,1', '0,2', '2,2', '3,2', '5,2', '7,2', '8,2', '10,2',
  '0,3', '5,3', '10,3', '0,4', '2,4', '3,4', '7,4', '8,4', '10,4',
  '0,5', '5,5', '10,5', '0,6', '2,6', '3,6', '5,6', '7,6', '8,6', '10,6',
  '0,7', '10,7', '0,8', '1,8', '2,8', '3,8', '4,8', '5,8', '6,8', '7,8', '8,8', '9,8', '10,8',
]);

function key(point: Point) {
  return `${point.x},${point.y}`;
}

function canMove(point: Point) {
  return point.x >= 0 && point.x < columns && point.y >= 0 && point.y < rows && !walls.has(key(point));
}

function move(point: Point, direction: Direction) {
  const next = direction === 'up' ? { x: point.x, y: point.y - 1 }
    : direction === 'down' ? { x: point.x, y: point.y + 1 }
      : direction === 'left' ? { x: point.x - 1, y: point.y }
        : { x: point.x + 1, y: point.y };
  return canMove(next) ? next : point;
}

function enemyStep(enemy: Point, player: Point, offset: number) {
  const horizontal: Direction = player.x < enemy.x ? 'left' : 'right';
  const vertical: Direction = player.y < enemy.y ? 'up' : 'down';
  const directions: Direction[] = offset % 2 ? [vertical, horizontal, 'left', 'up', 'right', 'down'] : [horizontal, vertical, 'right', 'down', 'left', 'up'];
  for (const direction of directions) {
    const next = move(enemy, direction);
    if (next.x !== enemy.x || next.y !== enemy.y) return next;
  }
  return enemy;
}

function sourceLabel(task: FocusTask) {
  const source = taskMissionSource(task);
  return source === 'emails' ? 'Email' : source === 'anchors' ? 'Daily Anchor' : 'Task';
}

export function TaskTown({
  tasks, events, xp, streak, onChallenge,
}: {
  tasks: FocusTask[];
  events: GoogleEvent[];
  xp: number;
  streak: number;
  onChallenge: (task: FocusTask) => void;
}) {
  const [missionOpen, setMissionOpen] = useState(false);
  const [duration, setDuration] = useState(25);
  const [sources, setSources] = useState<MissionSources>({ tasks: true, emails: true, anchors: true });
  const [protectCalendar, setProtectCalendar] = useState(true);
  const [mission, setMission] = useState<FocusTask | null>(null);
  const [missionError, setMissionError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [caught, setCaught] = useState(false);
  const [player, setPlayer] = useState(playerStart);
  const [enemies, setEnemies] = useState(enemyStarts);
  const [shieldReady, setShieldReady] = useState(true);
  const [shieldActive, setShieldActive] = useState(false);
  const today = localDate();

  const openTasks = tasks.filter((task) => task.status === 'open' && task.source !== 'google_calendar');
  const taskCount = openTasks.filter((task) => taskMissionSource(task) !== 'emails').length;
  const emailCount = openTasks.filter((task) => taskMissionSource(task) === 'emails').length;
  const anchorCount = openTasks.filter((task) => taskMissionSource(task) === 'anchors').length;
  const nextEvent = useMemo(() => nextCalendarEvent(events), [events]);
  const availableMinutes = useMemo(() => minutesUntilEvent(events), [events]);
  const won = taskCount === 0 && emailCount === 0;

  useEffect(() => {
    if (!mission) return;
    const current = tasks.find((task) => task.id === mission.id);
    if (!current || current.status !== 'open') {
      setMission(null);
      setCaught(false);
      setPlaying(false);
      setPlayer(playerStart);
      setEnemies(enemyStarts);
    }
  }, [mission, tasks]);

  useEffect(() => {
    if (!playing || !mission || caught) return;
    const timer = window.setInterval(() => {
      setEnemies((current) => current.map((enemy, index) => enemyStep(enemy, player, index)));
    }, 780);
    return () => window.clearInterval(timer);
  }, [caught, mission, player, playing]);

  useEffect(() => {
    if (!playing || !mission || !enemies.some((enemy) => enemy.x === player.x && enemy.y === player.y)) return;
    if (shieldActive) {
      setShieldActive(false);
      setShieldReady(false);
      setEnemies(enemyStarts);
      return;
    }
    setPlaying(false);
    setCaught(true);
    onChallenge(mission);
  }, [enemies, mission, onChallenge, player, playing, shieldActive]);

  const movePlayer = (direction: Direction) => {
    if (!playing || caught) return;
    setPlayer((current) => move(current, direction));
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const directions: Record<string, Direction | undefined> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      movePlayer(direction);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const generateMission = () => {
    setMissionError('');
    if (!Object.values(sources).some(Boolean)) {
      setMissionError('Choose at least one challenge source.');
      return;
    }
    if (protectCalendar && availableMinutes !== null && availableMinutes < 5) {
      setMissionError('Your next event starts too soon. Task Town is protecting it.');
      return;
    }
    const selected = selectMission(tasks, sources, today);
    if (!selected) {
      setMissionError('No open challenges match these filters.');
      return;
    }
    setMission(selected);
    setPlaying(false);
    setCaught(false);
    setPlayer(playerStart);
    setEnemies(enemyStarts);
    setShieldReady(true);
    setShieldActive(false);
    setMissionOpen(false);
  };

  const effectiveDuration = protectCalendar && availableMinutes !== null
    ? Math.max(5, Math.min(duration, Math.max(5, availableMinutes - 5)))
    : duration;

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1} sx={{ overflowX: 'auto', pb: .5 }}>
        <Chip icon={<TaskAlt />} label={`Tasks ${taskCount}`} variant="outlined" />
        <Chip icon={<Email />} label={`Inbox ${emailCount}`} variant="outlined" />
        <Chip label="Messages 0" variant="outlined" />
        <Chip icon={<Bolt />} label={`${xp} XP`} color="primary" />
        <Chip label={`${streak} day streak`} variant="outlined" />
      </Stack>

      {nextEvent && (
        <Alert icon={<CalendarMonth />} severity="info" sx={{ py: .5 }}>
          Next event: <strong>{nextEvent.event.title || nextEvent.event.summary || 'Calendar event'}</strong> at {nextEvent.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </Alert>
      )}

      <SurfaceCard sx={{ p: { xs: 1.5, sm: 2.5 }, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1.5} mb={1.5}>
          <Stack minWidth={0}>
            <Typography variant="h6" fontWeight={850}>Task Town</Typography>
            <Typography variant="caption" color="text.secondary">Clear every challenge to reach zero.</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => setMissionOpen(true)} sx={{ flexShrink: 0 }}>
            Generate mission
          </Button>
        </Stack>

        {won ? (
          <Stack minHeight={360} alignItems="center" justifyContent="center" textAlign="center" gap={2}>
            <Flag color="success" sx={{ fontSize: 64 }} />
            <Typography variant="h4" fontWeight={850}>Task Town cleared</Typography>
            <Typography color="text.secondary">Inbox zero and tasks zero. You made it.</Typography>
          </Stack>
        ) : (
          <>
            <Box
              aria-label="Task Town game board"
              sx={{
                width: '100%',
                maxWidth: 680,
                aspectRatio: `${columns} / ${rows}`,
                mx: 'auto',
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                bgcolor: 'background.default',
                borderRadius: 2.5,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
              }}
            >
              {Array.from({ length: columns * rows }, (_, index) => {
                const point = { x: index % columns, y: Math.floor(index / columns) };
                const enemyIndex = enemies.findIndex((enemy) => enemy.x === point.x && enemy.y === point.y);
                const hasPlayer = player.x === point.x && player.y === point.y;
                return (
                  <Box
                    key={key(point)}
                    display="grid"
                    sx={{
                      placeItems: 'center',
                      bgcolor: walls.has(key(point)) ? 'rgba(37,185,244,.12)' : 'transparent',
                      border: walls.has(key(point)) ? '1px solid rgba(37,185,244,.16)' : 0,
                      minWidth: 0,
                    }}
                  >
                    {hasPlayer && <Box aria-label="Your character" sx={{ width: '58%', aspectRatio: 1, borderRadius: '35%', bgcolor: 'primary.main', boxShadow: '0 0 12px rgba(37,185,244,.65)', display: 'grid', placeItems: 'center', color: 'primary.contrastText', fontWeight: 900 }}>M</Box>}
                    {enemyIndex >= 0 && !hasPlayer && <Box aria-label={enemyIndex === 0 ? 'Email challenge' : enemyIndex === 1 ? 'Task challenge' : 'Anchor challenge'} sx={{ width: '64%', aspectRatio: 1, borderRadius: 2, bgcolor: enemyIndex === 0 ? 'error.main' : enemyIndex === 1 ? 'warning.main' : 'secondary.main', display: 'grid', placeItems: 'center', color: '#fff' }}>{enemyIndex === 0 ? <Email fontSize="small" /> : enemyIndex === 1 ? <TaskAlt fontSize="small" /> : <Flag fontSize="small" />}</Box>}
                  </Box>
                );
              })}
            </Box>

            <Stack alignItems="center" gap={1.25} mt={2}>
              {mission ? (
                <Stack alignItems="center" textAlign="center" minWidth={0}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" justifyContent="center">
                    <Chip size="small" label={sourceLabel(mission)} />
                    <Chip size="small" color="success" label={`+${missionReward(mission)} XP`} />
                  </Stack>
                  <Typography fontWeight={800} mt={.75} sx={{ overflowWrap: 'anywhere' }}>{mission.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{effectiveDuration} minute protected sprint</Typography>
                </Stack>
              ) : (
                <Typography color="text.secondary" textAlign="center">Generate one mission to begin.</Typography>
              )}

              {caught && mission ? (
                <Alert severity="warning" action={<Button color="inherit" onClick={() => onChallenge(mission)}>Continue challenge</Button>}>
                  Complete the challenge to unlock Task Town.
                </Alert>
              ) : (
                <Stack direction="row" gap={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                  <Button variant="contained" startIcon={<PlayArrow />} disabled={!mission} onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause game' : 'Start mission'}</Button>
                  <Button size="small" startIcon={<RestartAlt />} onClick={() => { setPlayer(playerStart); setEnemies(enemyStarts); setPlaying(false); }}>Reset</Button>
                  <Button size="small" startIcon={<Shield />} disabled={!shieldReady || shieldActive} onClick={() => setShieldActive(true)}>{shieldActive ? 'Shield on' : 'Power-up'}</Button>
                </Stack>
              )}

              <Box display="grid" gridTemplateColumns="repeat(3, 44px)" gridTemplateRows="repeat(2, 44px)" gap={.5}>
                <IconButton aria-label="Move up" disabled={!playing} onClick={() => movePlayer('up')} sx={{ gridColumn: 2 }}><ArrowUpward /></IconButton>
                <IconButton aria-label="Move left" disabled={!playing} onClick={() => movePlayer('left')}><ArrowLeft /></IconButton>
                <IconButton aria-label="Move down" disabled={!playing} onClick={() => movePlayer('down')}><ArrowDownward /></IconButton>
                <IconButton aria-label="Move right" disabled={!playing} onClick={() => movePlayer('right')}><ArrowRight /></IconButton>
              </Box>
            </Stack>
          </>
        )}
      </SurfaceCard>

      <Dialog open={missionOpen} onClose={() => setMissionOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Generate mission</DialogTitle>
        <DialogContent>
          <Stack gap={2} pt={1}>
            <Typography variant="body2" color="text.secondary">How long do you have?</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {[10, 15, 25, 45].map((value) => <Chip key={value} clickable color={duration === value ? 'primary' : 'default'} label={`${value} min`} onClick={() => setDuration(value)} />)}
            </Stack>
            <Typography variant="body2" color="text.secondary">Choose challenges</Typography>
            <Stack>
              <FormControlLabel control={<Switch checked={sources.tasks} onChange={(event) => setSources((value) => ({ ...value, tasks: event.target.checked }))} />} label="Tasks" />
              <FormControlLabel control={<Switch checked={sources.emails} onChange={(event) => setSources((value) => ({ ...value, emails: event.target.checked }))} />} label="Emails" />
              <FormControlLabel control={<Switch checked={sources.anchors} onChange={(event) => setSources((value) => ({ ...value, anchors: event.target.checked }))} />} label="Daily Anchors" />
              <FormControlLabel disabled control={<Switch />} label="WhatsApp messages · Coming soon" />
            </Stack>
            <FormControlLabel control={<Switch checked={protectCalendar} onChange={(event) => setProtectCalendar(event.target.checked)} />} label="Protect calendar events" />
            {protectCalendar && nextEvent && <Typography variant="caption" color="text.secondary">This mission will finish before {nextEvent.event.title || nextEvent.event.summary || 'your next event'}.</Typography>}
            {missionError && <Alert severity="warning">{missionError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMissionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateMission}>Generate mission</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
