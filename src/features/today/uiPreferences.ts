import { useCallback, useState } from 'react';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';
export type TaskMode = 'one' | 'all';
export type HomeSection = 'focusTask' | 'agenda' | 'anchors' | 'carriedForward';

const keys = {
  sidebar: 'focusos.ui.sidebar',
  taskMode: 'focusos.ui.taskMode',
  sections: 'focusos.ui.sections',
} as const;

export const defaultSections: Record<HomeSection, boolean> = {
  focusTask: true,
  agenda: true,
  anchors: true,
  carriedForward: false,
};

function readValue<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw) as unknown;
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readSidebarMode(): SidebarMode {
  const legacy = window.localStorage.getItem('focusos-desktop-nav');
  const fallback: SidebarMode = legacy === 'hidden' ? 'hidden' : 'expanded';
  return readValue(keys.sidebar, fallback, (value): value is SidebarMode => ['expanded', 'collapsed', 'hidden'].includes(String(value)));
}

export function persistSidebarMode(mode: SidebarMode) {
  persist(keys.sidebar, mode);
}

export function useHomePreferences() {
  const [taskMode, setTaskModeState] = useState<TaskMode>(() => readValue(keys.taskMode, 'one', (value): value is TaskMode => value === 'one' || value === 'all'));
  const [sections, setSectionsState] = useState<Record<HomeSection, boolean>>(() => readValue(
    keys.sections,
    defaultSections,
    (value): value is Record<HomeSection, boolean> => Boolean(value) && typeof value === 'object'
      && Object.keys(defaultSections).every((name) => typeof (value as Record<string, unknown>)[name] === 'boolean'),
  ));
  const setTaskMode = useCallback((value: TaskMode) => { setTaskModeState(value); persist(keys.taskMode, value); }, []);
  const setSection = useCallback((section: HomeSection, expanded: boolean) => {
    setSectionsState((current) => {
      const next = { ...current, [section]: expanded };
      persist(keys.sections, next);
      return next;
    });
  }, []);
  return { taskMode, setTaskMode, sections, setSection };
}
