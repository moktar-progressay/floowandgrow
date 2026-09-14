import type { FocusTask } from '../../types/models';

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
