import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelaxMode } from './RelaxMode';

describe('RelaxMode', () => {
  afterEach(() => vi.useRealTimers());

  it('starts automatically and follows the 4-1-5 breathing sequence', () => {
    vi.useFakeTimers();
    render(<RelaxMode open onClose={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Breathe in' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.getByRole('heading', { name: 'Hold' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole('heading', { name: 'Breathe out' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('heading', { name: 'Breathe in' })).toBeInTheDocument();
  });
});
