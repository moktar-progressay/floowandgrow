import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERIFY_TOKEN_SHA256 = "5aa28fb23ec29b2e6f25257b8cc0a405b5e523ec02308c48aa445db685597017";
const APP_SECRET = (Deno.env.get("WHATSAPP_APP_SECRET") ?? "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyToken(candidate: string | null) {
  if (!candidate) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(candidate));
  const actual = bytesToHex(new Uint8Array(digest));
  if (actual.length !== VERIFY_TOKEN_SHA256.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ VERIFY_TOKEN_SHA256.charCodeAt(index);
  }
  return diff === 0;
}

async function verifyMetaSignature(rawBodyBytes: Uint8Array, signatureHeader: string | null): Promise<boolean | null> {
  if (!APP_SECRET) return null;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, rawBodyBytes);
  const expected = `sha256=${bytesToHex(new Uint8Array(signature))}`;
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ signatureHeader.charCodeAt(index);
  }
  return diff === 0;
}

function messageText(message: any): string | null {
  if (!message || typeof message !== "object") return null;
  switch (message.type) {
    case "text": return message.text?.body ?? null;
    case "button": return message.button?.text ?? null;
    case "interactive": return message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? null;
    case "image": return message.image?.caption ?? "Image";
    case "video": return message.video?.caption ?? "Video";
    case "document": return message.document?.caption ?? message.document?.filename ?? "Document";
    case "location": return [message.location?.name, message.location?.address].filter(Boolean).join(" - ") || "Location";
    case "contacts": return "Shared contact";
    case "audio": return "Voice or audio message";
    case "sticker": return "Sticker";
    default: return null;
  }
}

function firstError(status: any) {
  const error = Array.isArray(status?.errors) ? status.errors[0] : null;
  if (!error) return { code: null, message: null };
  return {
    code: error?.code != null ? String(error.code) : null,
    message: String(error?.error_data?.details ?? error?.title ?? error?.message ?? "WhatsApp delivery failed").slice(0, 1000),
  };
}

function taskDateTime(timestamp: string | null, timezone: string) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    scheduled_date: `${value("year")}-${value("month")}-${value("day")}`,
    scheduled_time: `${value("hour")}:${value("minute")}:00`,
  };
}

function taskTitle(contactName: string | null, from: string | null, text: string | null, messageType: string) {
  const sender = String(contactName || from || "a client").replace(/\s+/g, " ").trim().slice(0, 80);
  const preview = String(text || `${messageType} message`).replace(/\s+/g, " ").trim().slice(0, 160);
  return `WhatsApp from ${sender}: ${preview}`;
}

async function connectionFor(phoneNumberId: string | null, wabaId: string | null) {
  if (phoneNumberId) {
    const { data, error } = await supabase
      .from("focusos_whatsapp_connections")
      .select("user_id,timezone")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  if (wabaId) {
    const { data, error } = await supabase
      .from("focusos_whatsapp_connections")
      .select("user_id,timezone")
      .eq("waba_id", wabaId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  return null;
}

async function ensureWhatsAppTag(userId: string) {
  const { data: existing, error: lookupError } = await supabase
    .from("focusos_tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", "WhatsApp")
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from("focusos_tags")
    .insert({ user_id: userId, name: "WhatsApp", colour: "#25D366" })
    .select("id")
    .single();
  if (!insertError && inserted?.id) return inserted.id as string;
  if (insertError?.code !== "23505") throw insertError;

  const { data: raced, error: racedError } = await supabase
    .from("focusos_tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", "WhatsApp")
    .limit(1)
    .single();
  if (racedError) throw racedError;
  return raced.id as string;
}

async function ensureWhatsAppTask(input: {
  userId: string;
  timezone: string;
  messageId: string;
  phoneNumberId: string | null;
  contactName: string | null;
  from: string | null;
  text: string | null;
  messageType: string;
  timestamp: string | null;
}) {
  const legacyKey = `whatsapp:${input.messageId}`;
  const schedule = taskDateTime(input.timestamp, input.timezone || "Europe/London");
  const payload = {
    user_id: input.userId,
    legacy_key: legacyKey,
    title: taskTitle(input.contactName, input.from, input.text, input.messageType),
    status: "open",
    source: "whatsapp",
    scheduled_date: schedule.scheduled_date,
    scheduled_time: schedule.scheduled_time,
  };
  let taskId: string | null = null;
  const { data: inserted, error: insertError } = await supabase
    .from("focusos_tasks")
    .insert(payload)
    .select("id")
    .single();
  if (!insertError) taskId = inserted?.id ?? null;
  else if (insertError.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("focusos_tasks")
      .select("id")
      .eq("user_id", input.userId)
      .eq("legacy_key", legacyKey)
      .single();
    if (existingError) throw existingError;
    taskId = existing.id;
  } else throw insertError;
  if (!taskId) throw new Error("WhatsApp task could not be created");

  const tagId = await ensureWhatsAppTag(input.userId);
  const { error: tagError } = await supabase.from("focusos_task_tags").upsert({
    user_id: input.userId,
    task_id: taskId,
    tag_id: tagId,
  }, { onConflict: "task_id,tag_id", ignoreDuplicates: true });
  if (tagError) throw tagError;

  const { error: linkError } = await supabase.from("focusos_external_links").upsert({
    user_id: input.userId,
    task_id: taskId,
    provider: "whatsapp",
    external_container_id: input.phoneNumberId,
    external_id: input.messageId,
    external_updated_at: input.timestamp,
    last_synced_at: new Date().toISOString(),
    sync_status: "synced",
  }, { onConflict: "user_id,provider,external_id" });
  if (linkError) throw linkError;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && await verifyToken(token) && challenge) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    if (mode === "subscribe") return json({ error: "Invalid verification token" }, 403);
    return json({ ok: true, service: "FocusOS WhatsApp webhook", signature_verification: Boolean(APP_SECRET) });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rawBodyBytes = new Uint8Array(await req.arrayBuffer());
  const signatureHeader = req.headers.get("x-hub-signature-256");
  const signatureOk = await verifyMetaSignature(rawBodyBytes, signatureHeader);
  console.log(JSON.stringify({
    event: "whatsapp_signature_check",
    signature_present: Boolean(signatureHeader),
    signature_format_valid: signatureHeader?.startsWith("sha256=") ?? false,
    signature_valid: signatureOk === true,
    raw_body_length: rawBodyBytes.length,
  }));
  if (signatureOk === null) return json({ error: "WhatsApp App Secret is not configured" }, 503);
  if (!signatureOk) return json({ error: "Invalid Meta signature" }, 401);

  let body: any;
  try { body = JSON.parse(new TextDecoder().decode(rawBodyBytes)); }
  catch { return json({ error: "Invalid JSON" }, 400); }
  if (body?.object !== "whatsapp_business_account") return json({ ignored: true }, 200);

  try {
    for (const entry of body.entry ?? []) {
      const wabaId = entry?.id ?? null;
      for (const change of entry?.changes ?? []) {
        if (change?.field !== "messages") continue;
        const value = change?.value ?? {};
        const phoneNumberId = value?.metadata?.phone_number_id ?? null;
        const connection = await connectionFor(phoneNumberId, wabaId);

        const { error: eventInsertError } = await supabase.from("whatsapp_webhook_events").insert({
          event_type: "messages",
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          payload: { entry, change },
        });
        if (eventInsertError) throw eventInsertError;

        const contacts = new Map<string, string>();
        for (const contact of value?.contacts ?? []) {
          if (contact?.wa_id) contacts.set(contact.wa_id, contact?.profile?.name ?? "");
        }

        for (const message of value?.messages ?? []) {
          if (!message?.id) continue;
          const from = message?.from ?? null;
          const timestamp = message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : null;
          const text = messageText(message);
          const contactName = from ? (contacts.get(from) || null) : null;
          const row = {
            user_id: connection?.user_id ?? null,
            meta_message_id: message.id,
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
            from_phone: from,
            to_phone: value?.metadata?.display_phone_number ?? null,
            contact_name: contactName,
            direction: "inbound",
            message_type: message?.type ?? "unknown",
            message_text: text,
            reply_to_meta_message_id: message?.context?.id ?? null,
            message_timestamp: timestamp,
            status: "received",
            payload: message,
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabase.from("whatsapp_messages").upsert(row, { onConflict: "meta_message_id" });
          if (error) throw error;

          if (connection?.user_id) {
            await ensureWhatsAppTask({
              userId: connection.user_id,
              timezone: connection.timezone,
              messageId: message.id,
              phoneNumberId,
              contactName,
              from,
              text,
              messageType: message?.type ?? "unknown",
              timestamp,
            });
          } else {
            console.warn(JSON.stringify({ event: "whatsapp_connection_not_found", waba_id: wabaId, phone_number_id: phoneNumberId }));
          }
        }

        for (const status of value?.statuses ?? []) {
          if (!status?.id) continue;
          const errorDetails = firstError(status);
          const { error } = await supabase.from("whatsapp_messages").update({
            status: status?.status ?? "unknown",
            to_phone: status?.recipient_id ?? null,
            error_code: errorDetails.code,
            error_message: errorDetails.message,
            updated_at: new Date().toISOString(),
          }).eq("meta_message_id", status.id);
          if (error) throw error;

          const requestPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (status?.status === "failed") {
            requestPatch.status = "failed";
            requestPatch.error_code = errorDetails.code;
            requestPatch.error_message = errorDetails.message;
          }
          const { error: requestError } = await supabase
            .from("whatsapp_send_requests")
            .update(requestPatch)
            .eq("meta_message_id", status.id);
          if (requestError) throw requestError;
        }
      }
    }
    return json({ received: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected processing error";
    console.error(JSON.stringify({ event: "whatsapp_processing_error", message }));
    return json({ error: "Webhook processing failed" }, 500);
  }
});
