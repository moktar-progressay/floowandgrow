import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WHATSAPP_ACCESS_TOKEN = (Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "").trim();
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
  return json(req, {
    connected: Boolean(data),
    phoneNumber: data?.display_phone_number ?? null,
    verifiedName: data?.verified_name ?? null,
    updatedAt: data?.updated_at ?? null,
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
    if (action === "connect" && req.method === "POST") return await handleConnect(req);
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
