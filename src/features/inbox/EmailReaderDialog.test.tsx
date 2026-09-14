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

    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <EmailReaderDialog
          open
          message={message}
          onClose={() => undefined}
          onLoad={onLoad}
          onComplete={onComplete}
          onArchive={vi.fn()}
          onCreateTask={vi.fn()}
          onReply={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Please make one small change before sending the letter.')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledWith('gmail-1');
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(message));
  });
});
