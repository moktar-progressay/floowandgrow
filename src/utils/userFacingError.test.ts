import { describe, expect, it } from 'vitest';
import { userFacingError } from './userFacingError';

describe('userFacingError', () => {
  it('turns technical connectivity and permission failures into useful guidance', () => {
    expect(userFacingError(new TypeError('Failed to fetch'), 'Could not save.')).toContain('internet connection');
    expect(userFacingError(new Error('new row violates row-level security policy'), 'Could not save.')).toContain('permission');
  });

  it('keeps short, safe service guidance and hides database internals', () => {
    expect(userFacingError(new Error('Please reconnect Google Workspace.'), 'Could not connect.')).toBe('Please reconnect Google Workspace.');
    expect(userFacingError(new Error('Postgres relation focusos_tasks does not exist'), 'Could not load FocusOS.')).toBe('Could not load FocusOS.');
  });
});
