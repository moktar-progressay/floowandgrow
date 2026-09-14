import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FocusOrb } from './FocusOrb';

describe('FocusOrb', () => {
  it('renders the requested activity state as a decorative visual', () => {
    const { container } = render(<FocusOrb size={180} activity="active" />);
    const orb = container.firstElementChild;

    expect(orb).toHaveAttribute('aria-hidden', 'true');
    expect(orb).toHaveAttribute('data-orb-activity', 'active');
  });
});
