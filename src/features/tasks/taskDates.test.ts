import { describe, expect, it } from 'vitest';
import type { FocusTask } from '../../types/models';
import { overdueTasks } from './taskDates';

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
