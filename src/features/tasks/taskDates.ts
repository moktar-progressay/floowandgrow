import type { FocusTask } from '../../types/models';

export type DueDateFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'next_7_days' | 'no_date';

export function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function overdueTasks(tasks: FocusTask[], date: string) {
  return tasks
    .filter((task) =>
      !task.is_daily_anchor &&
      task.status === 'open' &&
      Boolean(task.scheduled_date) &&
      task.scheduled_date! < date,
    )
    .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''));
}

export function addLocalDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}

export function matchesDueDate(task: FocusTask, filter: DueDateFilter, today: string) {
  if (filter === 'all') return true;
  if (filter === 'no_date') return !task.scheduled_date;
  if (!task.scheduled_date) return false;
  if (filter === 'overdue') return task.scheduled_date < today;
  if (filter === 'today') return task.scheduled_date === today;
  if (filter === 'tomorrow') return task.scheduled_date === addLocalDays(today, 1);
  return task.scheduled_date >= today && task.scheduled_date <= addLocalDays(today, 7);
}
