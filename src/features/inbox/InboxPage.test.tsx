import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import { InboxPage } from './InboxPage';

const whatsapp = vi.hoisted(() => ({
  status: { data: { connected: true } },
  chats: { data: { messages: [] }, isPending: false, error: null as Error | null, refetch: vi.fn() },
  createTask: { isPending: false, isSuccess: false, error: null, mutate: vi.fn() },
}));

vi.mock('../integrations/whatsapp', () => ({ useWhatsAppConnection: () => whatsapp }));

const renderInbox = () => render(
  <ThemeProvider theme={createAppTheme('dark')}>
    <InboxPage messages={[]} connected={false} loading={false} onConnect={vi.fn()} onRefresh={vi.fn()} onOpen={vi.fn()} onArchive={vi.fn()} onCreateTask={vi.fn()} />
  </ThemeProvider>,
);

describe('InboxPage combined connections', () => {
  beforeEach(() => {
    whatsapp.chats.error = null;
    whatsapp.chats.refetch.mockReset();
  });

  it('recognises an empty connected WhatsApp inbox', () => {
    renderInbox();

    expect(screen.getByText('Inbox zero')).toBeInTheDocument();
    expect(screen.queryByText('No inbox connected')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
    expect(whatsapp.chats.refetch).toHaveBeenCalledOnce();
  });

  it('shows a retry action when WhatsApp messages fail to load', () => {
    whatsapp.chats.error = new Error('Failed to fetch');
    renderInbox();

    expect(screen.getByText(/WhatsApp messages could not load/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(whatsapp.chats.refetch).toHaveBeenCalledOnce();
  });
});
