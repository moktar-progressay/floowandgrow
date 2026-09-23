import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WHATSAPP_ACCESS_TOKEN = (Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "").trim();
const META_APP_ID = (Deno.env.get("WHATSAPP_APP_ID") ?? "2295080044640450").trim();
const META_APP_SECRET = (Deno.env.get("WHATSAPP_APP_SECRET_V2") ?? Deno.env.get("WHATSAPP_APP_SECRET") ?? "").trim();
const WHATSAPP_WABA_ID = (Deno.env.get("WHATSAPP_WABA_ID") ?? "2000638797991010").trim();
const WHATSAPP_PHONE_NUMBER_ID = (Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "1334090636449881").trim();
const WHATSAPP_OWNER_EMAIL = (Deno.env.get("WHATSAPP_OWNER_EMAIL") ?? "moktar@progressay.com").trim().toLowerCase();
const TOKEN_SECRET = Deno.env.get("WHATSAPP_TOKEN_ENCRYPTION_KEY")
  ?? Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY")
  ?? "";
const GRAPH_VERSION = "v26.0";
const APP_URL = Deno.env.get("FOCUSOS_APP_URL") ?? "https://moktar-progressay.github.io/floowandgrow/";
const ALLOWED_ORIGINS = new Set([
  new URL(APP_URL).origin,
  "https://moktar-progressay.github.io",
  "https://floowandgrow.netlify.app",
  "http://localhost:5173",
]);
const encoder = new TextEncoder();

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : new URL(APP_URL).origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function aesKey() {
  const keyBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(TOKEN_SECRET)));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
}

async function encryptAccessToken(accessToken: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), encoder.encode(accessToken));
  return { iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) };
}

function ensureConfigured() {
  const missing = [
    ["SUPABASE_ANON_KEY", SUPABASE_ANON_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
    ["WHATSAPP_ACCESS_TOKEN", WHATSAPP_ACCESS_TOKEN],
    ["WHATSAPP_WABA_ID", WHATSAPP_WABA_ID],
    ["WHATSAPP_PHONE_NUMBER_ID", WHATSAPP_PHONE_NUMBER_ID],
    ["WHATSAPP_TOKEN_ENCRYPTION_KEY or GOOGLE_TOKEN_ENCRYPTION_KEY", TOKEN_SECRET],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`WhatsApp connection setup is incomplete: ${missing.join(", ")}`);
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new Error("Sign in required");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error } = await client.auth.getUser(auth.slice(7));
  if (error || !user) throw new Error("Session expired. Please sign in again.");
  if (String(user.email ?? "").trim().toLowerCase() !== WHATSAPP_OWNER_EMAIL) {
    throw new Error("This WhatsApp connection is restricted to its owner.");
  }
  return user;
}

async function graphJson(path: string, accessToken: string, init: RequestInit = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.error?.message ?? `Meta API request failed (${response.status})`).slice(0, 240);
    throw new Error(message);
  }
  return payload;
}

async function handleStatus(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const { data, error } = await service
    .from("focusos_whatsapp_connections")
    .select("waba_id,phone_number_id,display_phone_number,verified_name,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  let metaState: Record<string, unknown> | null = null;
  if (data?.phone_number_id) {
    metaState = await graphJson(
      `${data.phone_number_id}?fields=id,display_phone_number,verified_name,status,platform_type,is_on_biz_app,code_verification_status`,
      WHATSAPP_ACCESS_TOKEN,
    );
  }
  const connected = Boolean(data)
    && String(metaState?.status ?? "").toUpperCase() === "CONNECTED"
    && String(metaState?.platform_type ?? "").toUpperCase() === "CLOUD_API";
  return json(req, {
    configured: Boolean(data),
    connected,
    phoneNumber: data?.display_phone_number ?? null,
    verifiedName: data?.verified_name ?? null,
    metaStatus: metaState?.status ?? null,
    platformType: metaState?.platform_type ?? null,
    isOnBusinessApp: metaState?.is_on_biz_app ?? null,
    codeVerificationStatus: metaState?.code_verification_status ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

async function exchangeEmbeddedSignupCode(code: string) {
  if (!META_APP_ID || !META_APP_SECRET) throw new Error("Meta Embedded Signup is not fully configured.");
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("client_secret", META_APP_SECRET);
  url.searchParams.set("code", code);
  const response = await fetch(url, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(String(payload?.error?.message ?? "Meta could not complete Embedded Signup.").slice(0, 240));
  }
  return String(payload.access_token);
}

async function requestBusinessAppSync(phoneNumberId: string, accessToken: string, syncType: "history" | "smb_app_state_sync") {
  return graphJson(`${phoneNumberId}/smb_app_data`, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
  });
}

async function handleEmbeddedSignup(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const input = await req.json().catch(() => ({}));
  const code = String(input?.code ?? "").trim();
  const wabaId = String(input?.wabaId ?? "").trim();
  const phoneNumberId = String(input?.phoneNumberId ?? "").trim();
  if (!code || code.length > 4096) throw new Error("Meta did not return a valid Embedded Signup code.");
  if (wabaId !== WHATSAPP_WABA_ID || phoneNumberId !== WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("Select the Progressay Impact WhatsApp account and +44 7498 945898.");
  }

  const onboardingToken = await exchangeEmbeddedSignupCode(code);
  const phone = await graphJson(
    `${phoneNumberId}?fields=id,display_phone_number,verified_name,status,platform_type,is_on_biz_app,code_verification_status`,
    onboardingToken,
  );
  await graphJson(`${wabaId}/subscribed_apps`, onboardingToken, { method: "POST" });

  const encrypted = await encryptAccessToken(WHATSAPP_ACCESS_TOKEN);
  const timezone = String(input?.timezone ?? "Europe/London").trim();
  try { new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(); }
  catch { throw new Error("The browser returned an invalid timezone."); }
  const { error } = await service.from("focusos_whatsapp_connections").upsert({
    user_id: user.id,
    waba_id: wabaId,
    phone_number_id: phoneNumberId,
    business_id: null,
    display_phone_number: phone.display_phone_number ?? null,
    verified_name: phone.verified_name ?? null,
    timezone,
    access_token_ciphertext: encrypted.ciphertext,
    access_token_iv: encrypted.iv,
    token_expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;

  const contacts = await requestBusinessAppSync(phoneNumberId, onboardingToken, "smb_app_state_sync").catch(() => null);
  const history = await requestBusinessAppSync(phoneNumberId, onboardingToken, "history");
  return json(req, {
    configured: true,
    connected: String(phone.status ?? "").toUpperCase() === "CONNECTED"
      && String(phone.platform_type ?? "").toUpperCase() === "CLOUD_API",
    phoneNumber: phone.display_phone_number ?? null,
    verifiedName: phone.verified_name ?? null,
    metaStatus: phone.status ?? null,
    platformType: phone.platform_type ?? null,
    historyRequested: true,
    historyRequestId: history?.request_id ?? null,
    contactsRequestId: contacts?.request_id ?? null,
  });
}

async function handleConnect(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const input = await req.json().catch(() => ({}));
  const timezone = String(input.timezone ?? "Europe/London").trim();
  if (!/^\d{5,32}$/.test(WHATSAPP_WABA_ID) || !/^\d{5,32}$/.test(WHATSAPP_PHONE_NUMBER_ID)) {
    throw new Error("The configured WhatsApp account details are invalid.");
  }
  try { new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(); }
  catch { throw new Error("The browser returned an invalid timezone."); }

  const phone = await graphJson(
    `${WHATSAPP_PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name`,
    WHATSAPP_ACCESS_TOKEN,
  );
  if (String(phone.id ?? "") !== WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("The configured WhatsApp phone number could not be confirmed.");
  }
  await graphJson(`${WHATSAPP_WABA_ID}/subscribed_apps`, WHATSAPP_ACCESS_TOKEN, { method: "POST" });

  const encrypted = await encryptAccessToken(WHATSAPP_ACCESS_TOKEN);
  const { error } = await service.from("focusos_whatsapp_connections").upsert({
    user_id: user.id,
    waba_id: WHATSAPP_WABA_ID,
    phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
    business_id: null,
    display_phone_number: phone.display_phone_number ?? null,
    verified_name: phone.verified_name ?? null,
    timezone,
    access_token_ciphertext: encrypted.ciphertext,
    access_token_iv: encrypted.iv,
    token_expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;

  console.log(JSON.stringify({
    event: "whatsapp_connected",
    user_id: user.id,
    waba_id: WHATSAPP_WABA_ID,
    phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
  }));
  return json(req, {
    connected: true,
    phoneNumber: phone.display_phone_number ?? null,
    verifiedName: phone.verified_name ?? null,
  });
}

async function handleSync(req: Request, syncType: "history" | "smb_app_state_sync") {
  ensureConfigured();
  const user = await requireUser(req);
  const { data: connection, error } = await service
    .from("focusos_whatsapp_connections")
    .select("phone_number_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!connection?.phone_number_id) throw new Error("Connect WhatsApp Business first.");

  let contactsRequestId: string | null = null;
  if (syncType === "history") {
    try {
      const contactsResult = await requestBusinessAppSync(connection.phone_number_id, WHATSAPP_ACCESS_TOKEN, "smb_app_state_sync");
      contactsRequestId = contactsResult?.request_id ?? null;
    } catch (contactsError) {
      console.warn(JSON.stringify({
        event: "whatsapp_contacts_sync_skipped",
        message: contactsError instanceof Error ? contactsError.message : "Contact sync was not accepted",
      }));
    }
  }
  const result = await requestBusinessAppSync(connection.phone_number_id, WHATSAPP_ACCESS_TOKEN, syncType);
  return json(req, {
    accepted: true,
    syncType,
    requestId: result?.request_id ?? null,
    contactsRequestId,
  });
}

async function handleChats(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const url = new URL(req.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 200);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 200, 500));
  const before = url.searchParams.get("before");
  let query = service
    .from("whatsapp_messages")
    .select("id,meta_message_id,from_phone,to_phone,contact_name,direction,message_type,message_text,message_timestamp,status,created_at")
    .eq("user_id", user.id)
    .order("message_timestamp", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (before) query = query.lt("message_timestamp", before);
  const { data, error } = await query;
  if (error) throw error;
  return json(req, { messages: data ?? [], hasMore: (data?.length ?? 0) === limit });
}

function taskSchedule(timestamp: string | null, timezone: string) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Europe/London",
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

async function handleChatTask(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const input = await req.json().catch(() => ({}));
  const messageId = String(input?.messageId ?? "").trim();
  if (!messageId || messageId.length > 512) throw new Error("Select a valid WhatsApp message.");
  const [{ data: message, error: messageError }, { data: connection, error: connectionError }] = await Promise.all([
    service.from("whatsapp_messages")
      .select("meta_message_id,from_phone,to_phone,contact_name,direction,message_type,message_text,message_timestamp,phone_number_id")
      .eq("user_id", user.id)
      .eq("meta_message_id", messageId)
      .maybeSingle(),
    service.from("focusos_whatsapp_connections").select("timezone").eq("user_id", user.id).maybeSingle(),
  ]);
  if (messageError) throw messageError;
  if (connectionError) throw connectionError;
  if (!message) throw new Error("That WhatsApp message was not found.");

  const contact = String(message.contact_name || (message.direction === "inbound" ? message.from_phone : message.to_phone) || "client")
    .replace(/\s+/g, " ").trim().slice(0, 80);
  const preview = String(message.message_text || `${message.message_type || "WhatsApp"} message`)
    .replace(/\s+/g, " ").trim().slice(0, 160);
  const legacyKey = `whatsapp:${message.meta_message_id}`;
  const schedule = taskSchedule(message.message_timestamp, connection?.timezone ?? "Europe/London");
  let taskId: string | null = null;
  const { data: inserted, error: insertError } = await service.from("focusos_tasks").insert({
    user_id: user.id,
    legacy_key: legacyKey,
    title: `WhatsApp from ${contact}: ${preview}`,
    status: "open",
    source: "whatsapp",
    scheduled_date: schedule.scheduled_date,
    scheduled_time: schedule.scheduled_time,
  }).select("id").single();
  if (!insertError) taskId = inserted?.id ?? null;
  else if (insertError.code === "23505") {
    const { data: existing, error: existingError } = await service.from("focusos_tasks")
      .select("id").eq("user_id", user.id).eq("legacy_key", legacyKey).single();
    if (existingError) throw existingError;
    taskId = existing.id;
  } else throw insertError;
  if (!taskId) throw new Error("The WhatsApp task could not be created.");

  let { data: tag, error: tagLookupError } = await service.from("focusos_tags")
    .select("id").eq("user_id", user.id).ilike("name", "WhatsApp").limit(1).maybeSingle();
  if (tagLookupError) throw tagLookupError;
  if (!tag?.id) {
    const { data: createdTag, error: tagInsertError } = await service.from("focusos_tags")
      .insert({ user_id: user.id, name: "WhatsApp", colour: "#25D366" }).select("id").single();
    if (tagInsertError && tagInsertError.code !== "23505") throw tagInsertError;
    tag = createdTag ?? (await service.from("focusos_tags").select("id").eq("user_id", user.id).ilike("name", "WhatsApp").limit(1).single()).data;
  }
  if (tag?.id) {
    const { error: taskTagError } = await service.from("focusos_task_tags").upsert({
      user_id: user.id, task_id: taskId, tag_id: tag.id,
    }, { onConflict: "task_id,tag_id", ignoreDuplicates: true });
    if (taskTagError) throw taskTagError;
  }
  const { error: linkError } = await service.from("focusos_external_links").upsert({
    user_id: user.id,
    task_id: taskId,
    provider: "whatsapp",
    external_container_id: message.phone_number_id,
    external_id: message.meta_message_id,
    external_updated_at: message.message_timestamp,
    last_synced_at: new Date().toISOString(),
    sync_status: "synced",
  }, { onConflict: "user_id,provider,external_id" });
  if (linkError) throw linkError;
  return json(req, { taskId, created: !insertError });
}

async function handleDisconnect(req: Request) {
  ensureConfigured();
  const user = await requireUser(req);
  const { error } = await service.from("focusos_whatsapp_connections").delete().eq("user_id", user.id);
  if (error) throw error;
  return json(req, { connected: false });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    if (action === "status" && req.method === "GET") return await handleStatus(req);
    if (action === "embedded-signup" && req.method === "POST") return await handleEmbeddedSignup(req);
    if (action === "chats" && req.method === "GET") return await handleChats(req);
    if (action === "chat-task" && req.method === "POST") return await handleChatTask(req);
    if (action === "connect" && req.method === "POST") return await handleConnect(req);
    if (action === "sync-history" && req.method === "POST") return await handleSync(req, "history");
    if (action === "sync-contacts" && req.method === "POST") return await handleSync(req, "smb_app_state_sync");
    if (action === "disconnect" && req.method === "POST") return await handleDisconnect(req);
    return json(req, { error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected WhatsApp connection error.";
    const status = /restricted to its owner/i.test(message) ? 403
      : /sign in|required|session expired/i.test(message) ? 401
      : 400;
    console.error(JSON.stringify({ event: "whatsapp_connection_error", action, message }));
    return json(req, { error: message }, status);
  }
});
