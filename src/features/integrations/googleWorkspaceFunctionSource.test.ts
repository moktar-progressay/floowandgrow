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

  it('binds each Google connection to the signed-in account email', () => {
    expect(functionSource).toContain('createState(user.id, user.email, input.returnTo)');
    expect(functionSource).toContain('login_hint: user.email');
    expect(functionSource).toContain('googleEmail !== expectedEmail');
    expect(functionSource).toContain('email: matchesAccount ? row.provider_email : null');
    expect(functionSource).not.toContain('email: row?.provider_email || ALLOWED_EMAIL');
    expect(functionSource).toContain('Reconnect Google Workspace after changing your FocusOS email.');
  });

  it('retains an explicit guard for the protected owner account', () => {
    expect(functionSource).toContain('PROTECTED_GOOGLE_EMAIL');
    expect(functionSource).toContain('This Google account is protected and cannot be linked here.');
  });
});
