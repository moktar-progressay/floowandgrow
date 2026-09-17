import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import type { RewardEvent } from '../../types/models';
import { ProgressPage } from './ProgressPage';

const events: RewardEvent[] = [{
  id: 'reward-1',
  event_key: 'task:1:complete',
  kind: 'task_completed',
  source: 'focusos',
  points: 30,
  metadata: { entityId: 'task-1' },
  occurred_at: new Date().toISOString(),
}];

describe('ProgressPage', () => {
  it('shows every period filter and the shared awards', () => {
    render(<ThemeProvider theme={createAppTheme('dark')}><ProgressPage events={events} totalXp={430} /></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Awards' }));
    expect(screen.getByText('Task Tamer')).toBeInTheDocument();
    expect(screen.getByText('Inbox Zero')).toBeInTheDocument();
  });
});
