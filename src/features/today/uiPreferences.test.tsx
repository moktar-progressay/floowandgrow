import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { persistSidebarMode, readSidebarMode, useHomePreferences } from './uiPreferences';

describe('Home UI preferences', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists sidebar modes and rejects invalid values', () => {
    persistSidebarMode('collapsed');
    expect(readSidebarMode()).toBe('collapsed');

    window.localStorage.setItem('focusos.ui.sidebar', JSON.stringify('broken'));
    expect(readSidebarMode()).toBe('expanded');
  });

  it('persists task mode, section state and Home Assistant state', () => {
    const { result, unmount } = renderHook(() => useHomePreferences());
    act(() => {
      result.current.setTaskMode('all');
      result.current.setSection('carriedForward', true);
      result.current.setAssistantExpanded(true);
    });
    unmount();

    const next = renderHook(() => useHomePreferences()).result.current;
    expect(next.taskMode).toBe('all');
    expect(next.sections.carriedForward).toBe(true);
    expect(next.assistantExpanded).toBe(true);
  });
});
