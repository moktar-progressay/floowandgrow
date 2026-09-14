import type { FocusTask, GoogleEvent } from '../../types/models';

export type MissionSource = 'tasks' | 'emails' | 'anchors';

export type MissionSources = Record<MissionSource, boolean>;

export function taskMissionSource(task: FocusTask): MissionSource {
  if (task.source === 'gmail' || task.source === 'google_gmail') return 'emails';
  if (task.is_daily_anchor) return 'anchors';
  return 'tasks';
}

function taskScore(task: FocusTask, today: string) {
  let score = task.priority === 'red' ? 50 : task.priority === 'yellow' ? 30 : task.priority === 'green' ? 10 : 15;
  if (task.scheduled_date && task.scheduled_date < today) score += 45;
  if (task.scheduled_date === today) score += 30;
  if (!task.scheduled_date) score += 5;
  if (taskMissionSource(task) === 'emails') score += 12;
  if (task.is_daily_anchor) score += 8;
  return score;
}

export function selectMission(tasks: FocusTask[], sources: MissionSources, today: string) {
  return tasks
    .filter((task) => task.status === 'open' && task.source !== 'google_calendar' && sources[taskMissionSource(task)])
    .map((task) => ({ task, score: taskScore(task, today) }))
    .sort((a, b) => b.score - a.score || String(a.task.scheduled_time || '99:99').localeCompare(String(b.task.scheduled_time || '99:99')) || a.task.created_at.localeCompare(b.task.created_at))[0]?.task ?? null;
}

export function nextCalendarEvent(events: GoogleEvent[], now = new Date()) {
  return events
    .map((event) => ({ event, start: new Date(event.start) }))
    .filter(({ start }) => !Number.isNaN(start.getTime()) && start.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;
}

export function minutesUntilEvent(events: GoogleEvent[], now = new Date()) {
  const next = nextCalendarEvent(events, now);
  return next ? Math.max(0, Math.floor((next.start.getTime() - now.getTime()) / 60_000)) : null;
}

export function missionReward(task: FocusTask) {
  if (task.source === 'gmail' || task.source === 'google_gmail') return 10;
  if (task.is_daily_anchor) return 20;
  return 30;
}
