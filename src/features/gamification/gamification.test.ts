import { describe, expect, it } from 'vitest';
import type { RewardEvent } from '../../types/models';
import { awardsFor, momentumStreak, progressBounds, summariseProgress } from './gamification';

const event = (overrides: Partial<RewardEvent>): RewardEvent => ({
  id: crypto.randomUUID(),
  event_key: crypto.randomUUID(),
  kind: 'task_completed',
  source: 'focusos',
  points: 30,
  metadata: {},
  occurred_at: '2026-09-15T10:00:00',
  ...overrides,
});

describe('gamification engine', () => {
  it('summarises one shared stream without double-counting an email', () => {
    const events = [
      event({ event_key: 'task:1', kind: 'task_completed' }),
      event({ event_key: 'gmail:m1:read', kind: 'email_read', points: 10 }),
      event({ event_key: 'gmail:m1:reply', kind: 'email_replied', points: 30 }),
      event({ event_key: 'focus:1', kind: 'focus_sprint_completed', points: 20, metadata: { minutes: 25 } }),
    ];
    expect(summariseProgress(events, progressBounds('day', new Date('2026-09-15T12:00:00')))).toMatchObject({
      xp: 90,
      tasks: 1,
      emails: 1,
      focusMinutes: 25,
    });
  });

  it('calculates a streak that can continue from yesterday', () => {
    const events = [
      event({ occurred_at: '2026-09-14T10:00:00' }),
      event({ occurred_at: '2026-09-13T10:00:00' }),
    ];
    expect(momentumStreak(events, new Date('2026-09-15T09:00:00'))).toBe(2);
  });

  it('uses the same completed task events for Task Tamer progress', () => {
    const events = Array.from({ length: 10 }, (_, index) => event({ event_key: `task:${index}` }));
    expect(awardsFor(events, new Date('2026-09-15'))[0]).toMatchObject({ title: 'Task Tamer', progress: 10, target: 25 });
  });
});
