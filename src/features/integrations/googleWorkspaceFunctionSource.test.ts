import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const functionSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/google-workspace/index.ts'),
  'utf8',
);

describe('Google Workspace Edge Function source', () => {
  it('keeps binary credential decoding separate from Gmail text decoding', () => {
    expect(functionSource.match(/function fromBase64Url\(/g)).toHaveLength(1);
    expect(functionSource.match(/function decodeBase64UrlText\(/g)).toHaveLength(1);
    expect(functionSource).toContain('new TextDecoder().decode(fromBase64Url(parts[0]))');
    expect(functionSource).toContain('const decoded = decodeBase64UrlText(part.body.data)');
  });
});
