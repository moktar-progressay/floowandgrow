import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { createAppTheme } from '../../theme/createAppTheme';
import { SettingsPage } from './SettingsPage';

const whatsapp = vi.hoisted(() => ({
  status: { data: { connected: false, configured: false }, isPending: false, error: null, refetch: vi.fn() },
  connect: { isPending: false, error: null, mutate: vi.fn() },
  disconnect: { isPending: false, error: null, mutate: vi.fn() },
  syncHistory: { isPending: false, isSuccess: false, error: null, mutate: vi.fn() },
}));

vi.mock('../integrations/whatsapp', () => ({ useWhatsAppConnection: () => whatsapp }));

const renderPage = (props: Partial<ComponentProps<typeof SettingsPage>> = {}) => render(
  <ThemeProvider theme={createAppTheme('dark')}>
    <SettingsPage connected={false} loading={false} onConnect={vi.fn()} onRefresh={vi.fn()} onDisconnect={vi.fn()} {...props} />
  </ThemeProvider>,
);

describe('SettingsPage connection controls', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('prevents duplicate Google connection attempts while one is running', () => {
    const onConnect = vi.fn();
    renderPage({ loading: true, onConnect });

    const button = screen.getByRole('button', { name: 'Connecting…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('requires confirmation before disconnecting Google Workspace', () => {
    const onDisconnect = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage({ connected: true, onDisconnect });

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});
