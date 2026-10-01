import type { FocusTask } from '../../types/models';

export const reminderChoices = [
  { value: 0, label: 'At the task time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
] as const;

export function reminderAt(date: string | null, time: string | null, minutesBefore: number | null) {
  if (!date || !time || minutesBefore === null) return null;
  const dueAt = new Date(`${date}T${time.slice(0, 5)}`).getTime();
  if (!Number.isFinite(dueAt)) return null;
  return new Date(dueAt - minutesBefore * 60_000).toISOString();
}

export function taskDueAt(task: Pick<FocusTask, 'scheduled_date' | 'scheduled_time'>) {
  if (!task.scheduled_date) return null;
  const dueTime = task.scheduled_time?.slice(0, 5) || '23:59';
  const timestamp = new Date(`${task.scheduled_date}T${dueTime}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function countdownLabel(task: Pick<FocusTask, 'scheduled_date' | 'scheduled_time'>, now = Date.now()) {
  const dueAt = taskDueAt(task);
  if (dueAt === null) return null;
  const difference = dueAt - now;
  if (difference < 0) {
    const minutes = Math.ceil(Math.abs(difference) / 60_000);
    if (minutes < 60) return `Overdue ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `Overdue ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Overdue ${days}d${remainingHours ? ` ${remainingHours}h` : ''}`;
  }
  const minutes = Math.ceil(difference / 60_000);
  if (minutes === 0) return 'Due now';
  if (minutes < 60) return `In ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `In ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `In ${days}d${remainingHours ? ` ${remainingHours}h` : ''}`;
}
