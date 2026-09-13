import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../../theme/createAppTheme';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders a clear title and next action', () => {
    render(<ThemeProvider theme={createAppTheme('light')}><EmptyState icon={<span>+</span>} title="No tasks" description="Your day is clear." actionLabel="Add task" onAction={() => undefined} /></ThemeProvider>);
    expect(screen.getByRole('heading', { name: 'No tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument();
  });
});
