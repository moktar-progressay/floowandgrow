import { describe, expect, it } from 'vitest';
import { mapDriveFiles } from './googleWorkspace';

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
