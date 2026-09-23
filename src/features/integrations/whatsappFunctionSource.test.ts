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

  it('stores coexistence history and phone-sent messages without creating historical tasks', () => {
    expect(webhookSource).toContain('field === "history"');
    expect(webhookSource).toContain('value?.history ?? []');
    expect(webhookSource).toContain('field === "smb_message_echoes"');
    expect(webhookSource).toContain('direction: "outbound"');
  });

  it('requests the one-time Meta history sync and exposes owner-filtered chats', () => {
    expect(connectionSource).toContain('/smb_app_data');
    expect(connectionSource).toContain('sync_type: syncType');
    expect(connectionSource).toContain('.eq("user_id", user.id)');
    expect(connectionSource).toContain('action === "chats"');
  });

  it('keeps Meta credentials server-side and authenticates the FocusOS user', () => {
    expect(connectionSource).toContain('Deno.env.get("WHATSAPP_ACCESS_TOKEN")');
    expect(connectionSource).toContain('client.auth.getUser');
    expect(connectionSource).toContain('This WhatsApp connection is restricted to its owner.');
    expect(connectionSource).not.toContain('return json(req, { accessToken');
    expect(connectionSource).not.toContain('accessToken: WHATSAPP_ACCESS_TOKEN');
  });

  it('connects the configured phone without exposing the permanent token to the browser', () => {
    expect(connectionSource).toContain('action === "connect"');
    expect(connectionSource).toContain('`${WHATSAPP_WABA_ID}/subscribed_apps`');
    expect(connectionSource).toContain('encryptAccessToken(WHATSAPP_ACCESS_TOKEN)');
  });
});
