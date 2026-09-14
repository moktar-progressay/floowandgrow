import { describe, expect, it } from 'vitest';
import type { FocusTask, GoogleEvent } from '../../types/models';
import { minutesUntilEvent, missionReward, selectMission, taskMissionSource } from './taskTown';

const task = (overrides: Partial<FocusTask>): FocusTask => ({
  id: 'task-1', legacy_key: null, title: 'Task', priority: null, status: 'open', project_id: null,
  goal_id: null, scheduled_date: null, scheduled_time: null, is_daily_anchor: false, recurrence: 'none',
  sort_order: 0, source: 'manual', completed_at: null, created_at: '2026-09-14T10:00:00Z', updated_at: '2026-09-14T10:00:00Z',
  ...overrides,
});

describe('Task Town missions', () => {
  it('selects the highest-scoring eligible challenge', () => {
    const selected = selectMission([
      task({ id: 'normal' }),
      task({ id: 'urgent', priority: 'red', scheduled_date: '2026-09-14' }),
      task({ id: 'email', source: 'gmail' }),
      task({ id: 'event', source: 'google_calendar', priority: 'red' }),
    ], { tasks: true, emails: true, anchors: true }, '2026-09-14');
    expect(selected?.id).toBe('urgent');
  });

  it('respects challenge source filters', () => {
    const selected = selectMission([
      task({ id: 'task', priority: 'red' }),
      task({ id: 'email', source: 'google_gmail' }),
    ], { tasks: false, emails: true, anchors: false }, '2026-09-14');
    expect(selected?.id).toBe('email');
    expect(taskMissionSource(selected!)).toBe('emails');
    expect(missionReward(selected!)).toBe(10);
  });

  it('protects the next calendar event', () => {
    const events: GoogleEvent[] = [{ id: '1', title: 'Meeting', start: '2026-09-14T10:30:00Z' }];
    expect(minutesUntilEvent(events, new Date('2026-09-14T10:00:00Z'))).toBe(30);
  });
});
