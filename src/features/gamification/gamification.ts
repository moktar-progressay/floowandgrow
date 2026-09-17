import type { RewardEvent, RewardKind } from '../../types/models';

export type ProgressRange = 'day' | 'week' | 'month' | 'custom';

export const rewardPoints: Record<Exclude<RewardKind, 'legacy_reward'>, number> = {
  task_completed: 30,
  anchor_completed: 20,
  email_read: 10,
  email_archived: 10,
  email_replied: 30,
  follow_up_created: 20,
  focus_sprint_completed: 20,
  inbox_zero: 50,
};

export type ProgressBounds = { start: Date; end: Date };

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function dateFromInput(value: string, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function progressBounds(
  range: ProgressRange,
  anchor = new Date(),
  customStart = '',
  customEnd = '',
): ProgressBounds {
  if (range === 'custom') {
    const start = dateFromInput(customStart, anchor);
    const end = dateFromInput(customEnd, start);
    return start <= end
      ? { start: startOfDay(start), end: endOfDay(end) }
      : { start: startOfDay(end), end: endOfDay(start) };
  }
  if (range === 'month') {
    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      end: endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)),
    };
  }
  if (range === 'week') {
    const start = startOfDay(anchor);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    const end = endOfDay(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  return { start: startOfDay(anchor), end: endOfDay(anchor) };
}

export function eventsInBounds(events: RewardEvent[], bounds: ProgressBounds) {
  return events.filter((event) => {
    const time = new Date(event.occurred_at).getTime();
    return Number.isFinite(time) && time >= bounds.start.getTime() && time <= bounds.end.getTime();
  });
}

function emailEntity(event: RewardEvent) {
  const entityId = event.metadata?.entityId;
  if (typeof entityId === 'string' && entityId) return entityId;
  const match = /^gmail:([^:]+)/.exec(event.event_key);
  return match?.[1] ?? event.event_key;
}

export function summariseProgress(events: RewardEvent[], bounds: ProgressBounds) {
  const filtered = eventsInBounds(events, bounds).filter((event) => event.kind !== 'legacy_reward');
  const taskEvents = filtered.filter((event) => event.kind === 'task_completed' || event.kind === 'anchor_completed');
  const emailEvents = filtered.filter((event) => ['email_read', 'email_archived', 'email_replied'].includes(event.kind));
  const focusMinutes = filtered
    .filter((event) => event.kind === 'focus_sprint_completed')
    .reduce((sum, event) => sum + Number(event.metadata?.minutes || 0), 0);
  return {
    events: filtered,
    xp: filtered.reduce((sum, event) => sum + event.points, 0),
    tasks: taskEvents.length,
    emails: new Set(emailEvents.map(emailEntity)).size,
    focusMinutes,
  };
}

export function localRewardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function momentumStreak(events: RewardEvent[], today = new Date()) {
  const productive = new Set(
    events
      .filter((event) => event.kind !== 'legacy_reward')
      .map((event) => localRewardDate(event.occurred_at))
      .filter(Boolean),
  );
  let cursor = startOfDay(today);
  const todayKey = localRewardDate(cursor.toISOString());
  if (!productive.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (productive.has(localRewardDate(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function dailyXp(events: RewardEvent[], bounds: ProgressBounds) {
  const totals = new Map<string, number>();
  for (const event of eventsInBounds(events, bounds)) {
    const date = localRewardDate(event.occurred_at);
    totals.set(date, (totals.get(date) || 0) + event.points);
  }
  const result: Array<{ date: string; xp: number }> = [];
  const cursor = startOfDay(bounds.start);
  while (cursor <= bounds.end && result.length < 62) {
    const date = localRewardDate(cursor.toISOString());
    result.push({ date, xp: totals.get(date) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export type AwardDefinition = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  colour: 'primary' | 'secondary' | 'success' | 'warning';
};

export function awardsFor(events: RewardEvent[], now = new Date()): AwardDefinition[] {
  const count = (kind: RewardKind) => events.filter((event) => event.kind === kind).length;
  const taskCount = count('task_completed') + count('anchor_completed');
  const week = summariseProgress(events, progressBounds('week', now));
  return [
    { id: 'task-tamer', title: 'Task Tamer', detail: 'Complete 25 tasks', progress: taskCount, target: 25, colour: 'secondary' },
    { id: 'inbox-zero', title: 'Inbox Zero', detail: 'Clear your inbox 3 times', progress: count('inbox_zero'), target: 3, colour: 'primary' },
    { id: 'deep-focus', title: 'Deep Focus', detail: 'Complete 5 focus sprints', progress: count('focus_sprint_completed'), target: 5, colour: 'success' },
    { id: 'reply-hero', title: 'Reply Hero', detail: 'Send 20 replies', progress: count('email_replied'), target: 20, colour: 'warning' },
    { id: 'anchor-keeper', title: 'Anchor Keeper', detail: 'Complete 7 Daily Anchors', progress: count('anchor_completed'), target: 7, colour: 'success' },
    { id: 'weekly-win', title: 'Weekly Win', detail: 'Earn 900 XP in one week', progress: week.xp, target: 900, colour: 'primary' },
  ];
}
