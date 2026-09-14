import { describe, expect, it } from 'vitest';
import { dateKey, daysForView, eventDateKey, eventTime, monthGrid } from './calendarDates';

describe('calendar date helpers', () => {
  it('builds a Monday to Sunday week around the selected date', () => {
    expect(daysForView('2026-09-14', 'week').map(dateKey)).toEqual([
      '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20',
    ]);
  });

  it('builds a complete six-week month grid', () => {
    const days = monthGrid(new Date(2026, 8, 1));
    expect(days).toHaveLength(42);
    expect(dateKey(days[0]!)).toBe('2026-08-31');
    expect(dateKey(days[41]!)).toBe('2026-10-11');
  });

  it('identifies dated and all-day Google events', () => {
    const event = { id: 'one', title: 'Planning', start: '2026-09-14' };
    expect(eventDateKey(event)).toBe('2026-09-14');
    expect(eventTime(event)).toBe('All day');
  });
});
