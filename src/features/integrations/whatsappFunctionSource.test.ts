import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const webhookSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/whatsapp-webhook/index.ts'),
  'utf8',
);
const connectionSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/whatsapp-connect/index.ts'),
  'utf8',
);

describe('WhatsApp Edge Function sources', () => {
  it('verifies Meta against the untouched request bytes before parsing JSON', () => {
    const rawBody = webhookSource.indexOf('await req.arrayBuffer()');
    const signatureCheck = webhookSource.indexOf('const signatureOk = await verifyMetaSignature(rawBodyBytes');
    const jsonParse = webhookSource.indexOf('JSON.parse(new TextDecoder().decode(rawBodyBytes))');
    expect(rawBody).toBeGreaterThan(-1);
    expect(signatureCheck).toBeGreaterThan(rawBody);
    expect(jsonParse).toBeGreaterThan(signatureCheck);
  });

  it('creates an idempotent WhatsApp task and assigns the WhatsApp tag', () => {
    expect(webhookSource).toContain('legacyKey = `whatsapp:${input.messageId}`');
    expect(webhookSource).toContain('source: "whatsapp"');
    expect(webhookSource).toContain('name: "WhatsApp", colour: "#25D366"');
    expect(webhookSource).toContain('onConflict: "task_id,tag_id"');
  });

  it('keeps Meta credentials server-side and authenticates the FocusOS user', () => {
    expect(connectionSource).toContain('Deno.env.get("WHATSAPP_APP_SECRET")');
    expect(connectionSource).toContain('client.auth.getUser');
    expect(connectionSource).toContain('This WhatsApp connection is restricted to its owner.');
    expect(connectionSource).not.toContain('return json(req, { accessToken');
    expect(connectionSource).not.toContain('access_token: accessToken');
  });
});
