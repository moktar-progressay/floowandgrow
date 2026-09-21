import { describe, expect, it } from 'vitest';
import type { FocusTask } from '../../types/models';
import { matchesDueDate, overdueTasks, sortTasksChronologically } from './taskDates';

const task = (overrides: Partial<FocusTask>): FocusTask => ({
  id: 'task-1', legacy_key: null, title: 'Task', priority: null, status: 'open',
  project_id: null, goal_id: null, scheduled_date: '2026-09-13', scheduled_time: null,
  is_daily_anchor: false, recurrence: 'none', sort_order: 0, source: 'manual',
  completed_at: null, created_at: '2026-09-13T09:00:00Z', updated_at: '2026-09-13T09:00:00Z',
  ...overrides,
});

describe('overdueTasks', () => {
  it('carries forward only unfinished, non-anchor tasks from earlier dates', () => {
    const result = overdueTasks([
      task({ id: 'overdue' }),
      task({ id: 'today', scheduled_date: '2026-09-14' }),
      task({ id: 'done', status: 'completed' }),
      task({ id: 'anchor', is_daily_anchor: true, recurrence: 'daily' }),
    ], '2026-09-14');

    expect(result.map(({ id }) => id)).toEqual(['overdue']);
  });
});

describe('matchesDueDate', () => {
  const today = '2026-09-14';

  it('supports the useful due-date filters', () => {
    expect(matchesDueDate(task({ scheduled_date: '2026-09-13' }), 'overdue', today)).toBe(true);
    expect(matchesDueDate(task({ scheduled_date: today }), 'today', today)).toBe(true);
    expect(matchesDueDate(task({ scheduled_date: '2026-09-15' }), 'tomorrow', today)).toBe(true);
    expect(matchesDueDate(task({ scheduled_date: '2026-09-21' }), 'next_7_days', today)).toBe(true);
    expect(matchesDueDate(task({ scheduled_date: '2026-09-22' }), 'next_7_days', today)).toBe(false);
    expect(matchesDueDate(task({ scheduled_date: null }), 'no_date', today)).toBe(true);
  });
});

describe('sortTasksChronologically', () => {
  it('orders agenda items by date and time, with untimed tasks last', () => {
    const result = sortTasksChronologically([
      task({ id: 'untimed', title: 'Untimed', scheduled_date: '2026-09-14', scheduled_time: null }),
      task({ id: 'late', title: 'Late', scheduled_date: '2026-09-14', scheduled_time: '14:30:00' }),
      task({ id: 'early', title: 'Early', scheduled_date: '2026-09-14', scheduled_time: '09:00:00' }),
    ]);
    expect(result.map(({ id }) => id)).toEqual(['early', 'late', 'untimed']);
  });
});
