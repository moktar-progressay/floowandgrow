import { describe, expect, it } from 'vitest';
import { countdownLabel, reminderAt, taskDueAt } from './taskReminders';

describe('task reminders', () => {
  it('calculates a reminder from the task time in the local timezone', () => {
    const result = reminderAt('2026-09-29', '12:00', 15);
    expect(result).toBe(new Date(2026, 8, 29, 11, 45).toISOString());
  });

  it('returns no reminder when date or time is missing', () => {
    expect(reminderAt(null, '12:00', 5)).toBeNull();
    expect(reminderAt('2026-09-29', null, 5)).toBeNull();
    expect(reminderAt('2026-09-29', '12:00', null)).toBeNull();
  });

  it('shows a concise countdown and overdue label', () => {
    const due = new Date(2026, 8, 29, 12, 0).getTime();
    expect(countdownLabel({ scheduled_date: '2026-09-29', scheduled_time: '12:00:00' }, due - 65 * 60_000)).toBe('In 1h 5m');
    expect(countdownLabel({ scheduled_date: '2026-09-29', scheduled_time: '12:00:00' }, due + 61 * 60_000)).toBe('Overdue 1h 1m');
  });

  it('counts down date-only tasks to the end of their scheduled day', () => {
    const endOfDay = new Date(2026, 8, 29, 23, 59).getTime();
    expect(taskDueAt({ scheduled_date: '2026-09-29', scheduled_time: null })).toBe(endOfDay);
    expect(countdownLabel({ scheduled_date: '2026-09-29', scheduled_time: null }, endOfDay - 60_000)).toBe('In 1m');
  });
});
