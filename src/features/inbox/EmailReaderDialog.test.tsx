import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import { EmailReaderDialog } from './EmailReaderDialog';

describe('EmailReaderDialog', () => {
  it('loads the full email and completes it inside FocusOS', async () => {
    const message = { id: 'gmail-1', subject: 'Supporting letter', from: 'Melanie', unread: true };
    const onLoad = vi.fn().mockResolvedValue({
      ...message,
      threadId: 'thread-1',
      to: 'moktar@progressay.com',
      text: 'Please make one small change before sending the letter.',
      attachments: [],
    });
    const onComplete = vi.fn().mockResolvedValue(undefined);

    const onClose = vi.fn();
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <EmailReaderDialog
          open
          message={message}
          onClose={onClose}
          onLoad={onLoad}
          onComplete={onComplete}
          onArchive={vi.fn()}
          onCreateTask={vi.fn()}
          onReply={vi.fn()}
          onDraftReply={vi.fn().mockResolvedValue('Thank you. I will make the change today.')}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Please make one small change before sending the letter.')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledWith('gmail-1');
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(message));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('drafts with AI but does not send until the user approves', async () => {
    const message = { id: 'gmail-2', subject: 'Meeting time', from: 'Alex', unread: true };
    const detail = {
      ...message,
      threadId: 'thread-2',
      to: 'moktar@progressay.com',
      text: 'Can we meet at 2pm tomorrow?',
      attachments: [],
    };
    const onDraftReply = vi.fn().mockResolvedValue('Yes, 2pm tomorrow works for me.');
    const onReply = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <EmailReaderDialog
          open
          message={message}
          onClose={() => undefined}
          onLoad={vi.fn().mockResolvedValue(detail)}
          onComplete={vi.fn()}
          onArchive={vi.fn()}
          onCreateTask={vi.fn()}
          onReply={onReply}
          onDraftReply={onDraftReply}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Can we meet at 2pm tomorrow?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Draft with AI' }));
    expect(await screen.findByDisplayValue('Yes, 2pm tomorrow works for me.')).toBeInTheDocument();
    expect(onDraftReply).toHaveBeenCalledWith(detail);
    expect(onReply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Approve and send' }));
    await waitFor(() => expect(onReply).toHaveBeenCalledWith(detail, 'Yes, 2pm tomorrow works for me.'));
  });
});
