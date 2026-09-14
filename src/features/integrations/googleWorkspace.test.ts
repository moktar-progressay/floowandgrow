import { afterEach, describe, expect, it, vi } from 'vitest';
import { env, googleWorkspaceFunction } from '../../config/env';
import { mapDriveFiles, requestGoogleWorkspace } from './googleWorkspace';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapDriveFiles', () => {
  it('maps Google files into reusable vault documents', () => {
    const result = mapDriveFiles({
      connected: true,
      drive: {
        files: [{
          id: '1',
          name: 'Budget',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          size: 2048,
          link: 'https://example.com',
        }],
      },
    });
    expect(result[0]).toMatchObject({ id: '1', name: 'Budget', tag: 'Google Sheet', size: '2 KB', drive: true });
  });
});

describe('Google Workspace requests', () => {
  it('send the Supabase publishable key with authenticated function requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await requestGoogleWorkspace<{ connected: boolean }>('user-token', '/status');

    expect(response.connected).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${googleWorkspaceFunction}/status`,
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: env.supabasePublishableKey,
          Authorization: 'Bearer user-token',
        }),
      }),
    );
  });
});
