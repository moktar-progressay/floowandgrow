import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import { CompactDateStrip } from './CompactDateStrip';

describe('CompactDateStrip', () => {
  it('shows five days and moves to the next day', () => {
    const onChange = vi.fn();
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <CompactDateStrip selectedDate="2026-09-14" onChange={onChange} />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole('button', { name: /^Show / })).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Show 14/09/2026' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-15');
  });
});
