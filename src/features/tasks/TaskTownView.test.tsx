import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import type { FocusTask } from '../../types/models';
import { TaskTown } from './TaskTown';

const task: FocusTask = {
  id: 'urgent', legacy_key: null, title: 'Send the safeguarding form', priority: 'red', status: 'open',
  project_id: null, goal_id: null, scheduled_date: '2026-09-14', scheduled_time: '16:00',
  is_daily_anchor: false, recurrence: 'none', sort_order: 0, source: 'manual', completed_at: null,
  created_at: '2026-09-14T10:00:00Z', updated_at: '2026-09-14T10:00:00Z',
};

describe('TaskTown', () => {
  it('generates one real mission and keeps WhatsApp marked as coming soon', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <TaskTown tasks={[task]} events={[]} xp={100} streak={2} onChallenge={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByText('100 XP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText('WhatsApp messages · Coming soon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start mission' })).toBeEnabled());
    expect(screen.getByText('Send the safeguarding form')).toBeInTheDocument();
  });
});
