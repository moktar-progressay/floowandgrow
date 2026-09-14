import type { GoogleEvent } from '../../types/models';

export type CalendarView = 'day' | 'week' | 'month';

export function dateKey(date: Date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function eventDateKey(event: GoogleEvent) {
  return event.start?.slice(0, 10) ?? '';
}

export function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return start;
}

export function daysForView(key: string, view: Exclude<CalendarView, 'month'>) {
  const selected = dateFromKey(key);
  if (view === 'day') return [selected];
  const start = startOfWeek(selected);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function eventTime(event: GoogleEvent) {
  if (!event.start || /^\d{4}-\d{2}-\d{2}$/.test(event.start)) return 'All day';
  const start = new Date(event.start);
  return Number.isNaN(start.getTime()) ? 'All day' : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
