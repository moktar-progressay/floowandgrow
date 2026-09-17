import { describe, expect, it } from 'vitest';
import { activeQuickToken, currentLocalTime, removeQuickToken } from './taskQuickEntry';

describe('task quick entry', () => {
  it('uses the current local time', () => {
    expect(currentLocalTime(new Date(2026, 8, 17, 9, 5))).toBe('09:05');
  });

  it('recognises project and tag shortcuts at the end of a title', () => {
    expect(activeQuickToken('Prepare report @work')).toMatchObject({ type: 'project', query: 'work' });
    expect(activeQuickToken('Prepare report #urgent')).toMatchObject({ type: 'tag', query: 'urgent' });
  });

  it('removes a resolved shortcut without removing the task title', () => {
    const value = 'Prepare report @work';
    const token = activeQuickToken(value);
    expect(token && removeQuickToken(value, token)).toBe('Prepare report ');
  });
});
