import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedApp } from './App';

const focusResult = vi.hoisted(() => ({
  current: { isLoading: true, error: null, data: null, refetch: vi.fn() } as Record<string, unknown>,
}));

vi.mock('../features/data/useFocusData', () => ({
  useFocusData: () => focusResult.current,
  useRewardMutation: () => ({ mutateAsync: vi.fn() }),
  useTaskMutations: () => ({
    toggleTask: { mutateAsync: vi.fn() },
    saveTask: { mutateAsync: vi.fn() },
    setTaskHidden: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('../features/integrations/googleWorkspace', () => ({
  mapDriveFiles: () => [],
  useGoogleWorkspace: () => ({
    action: vi.fn(), connected: false, checkingConnection: false, isFetching: false,
    gmailLoading: false, gmailError: null, error: null, connectionError: null,
    data: { services: {}, calendar: { events: [] } }, gmail: { messages: [] },
    connect: { mutate: vi.fn(), error: null }, disconnect: { mutate: vi.fn() },
    refetch: vi.fn(), refetchGmail: vi.fn(),
  }),
}));

vi.mock('./AppProviders', () => ({ useNotice: () => ({ notify: vi.fn() }) }));
vi.mock('../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../features/tasks/TaskDialog', () => ({ TaskDialog: () => null }));
vi.mock('../features/focus/FocusMode', () => ({ FocusMode: () => null }));
vi.mock('../features/focus/RelaxMode', () => ({ RelaxMode: () => null }));
vi.mock('../features/inbox/EmailReaderDialog', () => ({ EmailReaderDialog: () => null }));
vi.mock('../features/today/TodayPage', () => ({ TodayPage: () => <div>Today</div> }));

describe('ProtectedApp', () => {
  beforeEach(() => {
    focusResult.current = { isLoading: true, error: null, data: null, refetch: vi.fn() };
  });

  it('keeps the same hook order when loading finishes', () => {
    const view = render(<MemoryRouter initialEntries={['/today']}><ProtectedApp /></MemoryRouter>);
    focusResult.current = {
      isLoading: false,
      error: null,
      data: {
        state: { xp: 0, docs: [] }, tasks: [], projects: [], goals: [], tags: [], taskTags: [], dailyCompletions: [],
      },
      refetch: vi.fn(),
    };

    expect(() => view.rerender(<MemoryRouter initialEntries={['/today']}><ProtectedApp /></MemoryRouter>)).not.toThrow();
  });

  it('shows a clear retry action instead of an endless spinner when workspace loading fails', () => {
    const refetch = vi.fn();
    focusResult.current = {
      isLoading: false,
      error: new Error('Postgres relation focusos_tasks does not exist'),
      data: null,
      refetch,
    };

    render(<MemoryRouter initialEntries={['/today']}><ProtectedApp /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'FocusOS could not load' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
