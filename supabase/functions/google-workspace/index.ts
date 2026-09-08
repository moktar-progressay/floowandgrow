import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const TOKEN_SECRET = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "";
const STATE_SECRET = Deno.env.get("GOOGLE_OAUTH_STATE_SECRET") || "";
const APP_URL = Deno.env.get("FOCUSOS_APP_URL") || "https://floowandgrow.netlify.app";
const ALLOWED_EMAIL = (Deno.env.get("FOCUSOS_GOOGLE_EMAIL") || "moktar@progressay.com").toLowerCase();
const encoder = new TextEncoder();

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/tasks",
];

function corsHeaders(req) {
  const allowedOrigin = new URL(APP_URL).origin;
  const requestOrigin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function sha256(value) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
async function hmac(value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(STATE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
async function createState(userId) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sub: userId, exp: Date.now() + 10 * 60 * 1000, nonce: crypto.randomUUID() })));
  return payload + "." + await hmac(payload);
}
async function verifyState(state) {
  const parts = state.split(".");
  if (parts.length !== 2) throw new Error("Invalid OAuth state");
  const expected = await hmac(parts[0]);
  const actualBytes = encoder.encode(parts[1]);
  const expectedBytes = encoder.encode(expected);
  let mismatch = actualBytes.length === expectedBytes.length ? 0 : 1;
  const length = Math.max(actualBytes.length, expectedBytes.length);
  for (let i = 0; i < length; i += 1) mismatch |= (actualBytes[i] || 0) ^ (expectedBytes[i] || 0);
  if (mismatch !== 0) throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
  if (!payload.sub || !payload.exp || Date.now() > payload.exp) throw new Error("OAuth state expired");
  return payload;
}
async function aesKey() {
  const keyBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(TOKEN_SECRET)));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptCredentials(credentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), encoder.encode(JSON.stringify(credentials)));
  return { iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) };
}
async function decryptCredentials(ciphertext, iv) {
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, await aesKey(), fromBase64Url(ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}
async function db(path, init = {}) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error("Secure storage request failed");
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function requireUser(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Sign in required");
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth } });
  if (!response.ok) throw new Error("Session expired. Please sign in again.");
  const user = await response.json();
  if (!user.id || String(user.email || "").toLowerCase() !== ALLOWED_EMAIL) throw new Error("This Google connection is restricted to " + ALLOWED_EMAIL);
  return user;
}
function ensureConfigured() {
  const missing = [["GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID], ["GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET], ["GOOGLE_TOKEN_ENCRYPTION_KEY", TOKEN_SECRET], ["GOOGLE_OAUTH_STATE_SECRET", STATE_SECRET], ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY]].filter((entry) => !entry[1]).map((entry) => entry[0]);
  if (missing.length) throw new Error("Google connection setup is incomplete: " + missing.join(", "));
}
function callbackUrl() { return SUPABASE_URL + "/functions/v1/google-workspace/callback"; }
async function getIntegration(userId) {
  const query = new URLSearchParams({ select: "credentials_ciphertext,credentials_iv,provider_email,scopes,token_expires_at", user_id: "eq." + userId, provider: "eq.google", limit: "1" });
  const rows = await db("focusos_integrations?" + query.toString());
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function handleStart(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const state = await createState(user.id);
  const hash = await sha256(state);
  await db("focusos_oauth_states?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: user.id, state_hash: hash, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), created_at: new Date().toISOString() }) });
  const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(), response_type: "code", access_type: "offline", include_granted_scopes: "true", prompt: "consent", login_hint: ALLOWED_EMAIL, scope: GOOGLE_SCOPES.join(" "), state });
  return json(req, { url: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString() });
}
async function handleCallback(req) {
  ensureConfigured();
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return Response.redirect(APP_URL + "/?google=denied", 302);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (!code || !state) throw new Error("Google did not return an authorisation code");
  const payload = await verifyState(state);
  const stateHash = await sha256(state);
  const query = new URLSearchParams({ select: "user_id", user_id: "eq." + payload.sub, state_hash: "eq." + stateHash, expires_at: "gt." + new Date().toISOString() });
  const states = await db("focusos_oauth_states?" + query.toString());
  if (!Array.isArray(states) || states.length !== 1) throw new Error("OAuth state is missing or has already been used");
  await db("focusos_oauth_states?user_id=eq." + encodeURIComponent(payload.sub), { method: "DELETE" });
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl(), grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) throw new Error("Google token exchange failed");
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + tokens.access_token } });
  if (!profileResponse.ok) throw new Error("Could not confirm the Google account");
  const profile = await profileResponse.json();
  if (String(profile.email || "").toLowerCase() !== ALLOWED_EMAIL) throw new Error("Please connect " + ALLOWED_EMAIL + ", not another Google account");
  let previousRefreshToken = null;
  const previousRow = await getIntegration(payload.sub);
  if (previousRow) { try { previousRefreshToken = (await decryptCredentials(previousRow.credentials_ciphertext, previousRow.credentials_iv)).refresh_token || null; } catch (_) {} }
  const credentials = { access_token: tokens.access_token, refresh_token: tokens.refresh_token || previousRefreshToken, token_type: tokens.token_type || "Bearer", scope: tokens.scope || GOOGLE_SCOPES.join(" ") };
  if (!credentials.refresh_token) throw new Error("Google did not return long-lived access. Please reconnect and approve access.");
  const encrypted = await encryptCredentials(credentials);
  await db("focusos_integrations?on_conflict=user_id,provider", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: payload.sub, provider: "google", credentials_ciphertext: encrypted.ciphertext, credentials_iv: encrypted.iv, provider_email: profile.email, scopes: String(credentials.scope).split(" "), token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }) });
  return Response.redirect(APP_URL + "/?google=connected", 302);
}
async function refreshTokens(userId, row, credentials) {
  if (!credentials.refresh_token) throw new Error("Google access expired. Reconnect Google Workspace.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: credentials.refresh_token, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error("Google access expired. Reconnect Google Workspace.");
  const refreshed = await response.json();
  const nextCredentials = { ...credentials, access_token: refreshed.access_token, token_type: refreshed.token_type || credentials.token_type || "Bearer", scope: refreshed.scope || credentials.scope };
  const encrypted = await encryptCredentials(nextCredentials);
  const expiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();
  await db("focusos_integrations?user_id=eq." + encodeURIComponent(userId) + "&provider=eq.google", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ credentials_ciphertext: encrypted.ciphertext, credentials_iv: encrypted.iv, token_expires_at: expiresAt, updated_at: new Date().toISOString() }) });
  return nextCredentials;
}
async function authorisedCredentials(userId) {
  const row = await getIntegration(userId);
  if (!row) return { row: null, credentials: null };
  let credentials = await decryptCredentials(row.credentials_ciphertext, row.credentials_iv);
  if (!row.token_expires_at || new Date(row.token_expires_at).getTime() < Date.now() + 60000) credentials = await refreshTokens(userId, row, credentials);
  return { row, credentials };
}
async function googleJson(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!response.ok) throw new Error("Google API request failed");
  return response.json();
}
async function googleJsonOptional(url, accessToken) {
  try { return await googleJson(url, accessToken); } catch (_) { return null; }
}
async function googleApi(url, accessToken, method = "GET", body: unknown = undefined) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Google API request failed" + (detail ? ": " + detail.slice(0, 180) : ""));
  }
  if (response.status === 204) return {};
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
async function connectedUser(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const { row, credentials } = await authorisedCredentials(user.id);
  if (!row || !credentials) throw new Error("Connect Google Workspace first.");
  return { user, row, accessToken: credentials.access_token };
}
async function handleGmailAction(req) {
  const { accessToken } = await connectedUser(req);
  const body = await req.json();
  const messageId = String(body.messageId || "");
  if (!messageId) throw new Error("Message is required.");
  const changes = body.action === "archive" ? { removeLabelIds: ["INBOX"] }
    : body.action === "read" ? { removeLabelIds: ["UNREAD"] }
    : body.action === "unread" ? { addLabelIds: ["UNREAD"] }
    : null;
  if (!changes) throw new Error("Unsupported Gmail action.");
  await googleApi("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(messageId) + "/modify", accessToken, "POST", changes);
  return json(req, { ok: true });
}
async function handleGmailReply(req) {
  const { accessToken } = await connectedUser(req);
  const body = await req.json();
  if (body.confirm !== true) throw new Error("Reply confirmation is required.");
  const to = String(body.to || "").replace(/[\r\n]/g, "").trim();
  const subject = String(body.subject || "").replace(/[\r\n]/g, "").trim();
  const message = String(body.message || "").trim();
  if (!to || !message) throw new Error("Recipient and message are required.");
  const raw = ["To: " + to, "Subject: " + subject, "Content-Type: text/plain; charset=UTF-8", "MIME-Version: 1.0", "", message].join("\r\n");
  const rawBytes = encoder.encode(raw);
  const payload: Record<string, string> = { raw: toBase64Url(rawBytes) };
  if (body.threadId) payload.threadId = String(body.threadId);
  const sent = await googleApi("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", accessToken, "POST", payload);
  return json(req, { ok: true, id: sent.id || null });
}
async function handleGoogleTask(req) {
  const { accessToken } = await connectedUser(req);
  const body = await req.json();
  const listId = String(body.listId || "@default");
  const base = "https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(listId) + "/tasks";
  if (body.action === "create") {
    const created = await googleApi(base, accessToken, "POST", { title: String(body.title || "Untitled task"), notes: String(body.notes || ""), due: body.due || undefined, status: body.completed ? "completed" : "needsAction" });
    return json(req, { ok: true, task: created });
  }
  const taskId = String(body.taskId || "");
  if (!taskId) throw new Error("Google Task is required.");
  if (body.action === "delete") { await googleApi(base + "/" + encodeURIComponent(taskId), accessToken, "DELETE"); return json(req, { ok: true }); }
  if (body.action !== "update") throw new Error("Unsupported Google Tasks action.");
  const patch: Record<string, unknown> = {};
  ["title", "notes", "due"].forEach((key) => { if (body[key] !== undefined) patch[key] = body[key] || null; });
  if (body.completed !== undefined) patch.status = body.completed ? "completed" : "needsAction";
  const updated = await googleApi(base + "/" + encodeURIComponent(taskId), accessToken, "PATCH", patch);
  return json(req, { ok: true, task: updated });
}
function headerValue(message, name) {
  const headers = message?.payload?.headers || [];
  const found = headers.find((header) => String(header.name).toLowerCase() === name.toLowerCase());
  return found?.value || "";
}
async function handleData(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const { row, credentials } = await authorisedCredentials(user.id);
  if (!row || !credentials) return json(req, { connected: false, email: ALLOWED_EMAIL, gmail: null, calendar: null, drive: null, tasks: null });
  const accessToken = credentials.access_token;
  const [inboxLabel, messageList, calendar, drive, taskLists] = await Promise.all([
    googleJson("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", accessToken),
    googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=" + encodeURIComponent("is:unread in:inbox"), accessToken),
    googleJson("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + new URLSearchParams({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), maxResults: "12", singleEvents: "true", orderBy: "startTime" }).toString(), accessToken),
    googleJson("https://www.googleapis.com/drive/v3/files?" + new URLSearchParams({ q: "trashed = false", pageSize: "20", orderBy: "modifiedTime desc", fields: "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size,starred,parents)" }).toString(), accessToken),
    googleJsonOptional("https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20", accessToken),
  ]);
  const messageDetails = await Promise.all((messageList.messages || []).map((message) => googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(message.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Subject&metadataHeaders=Date", accessToken)));
  const taskGroups = taskLists ? await Promise.all((taskLists.items || []).slice(0, 20).map(async (list) => {
    const listTasks = await googleJsonOptional("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(list.id) + "/tasks?" + new URLSearchParams({ maxResults: "100", showCompleted: "false", showHidden: "false" }).toString(), accessToken);
    return (listTasks?.items || []).map((task) => ({ id: task.id, externalTaskId: task.id, externalTaskListId: list.id, provider: "google_tasks", title: task.title || "Untitled task", notes: task.notes || "", due: task.due || null, status: task.status || "needsAction", updated: task.updated || null, taskListTitle: list.title || "Google Tasks", link: "https://tasks.google.com/", lastSynchronisedAt: new Date().toISOString(), readOnly: false }));
  })) : [];
  return json(req, {
    connected: true,
    email: row.provider_email,
    scopes: row.scopes || [],
    gmail: { unread: Number(inboxLabel.messagesUnread || 0), messages: messageDetails.map((message) => ({ id: message.id, threadId: message.threadId || "", channel: "gmail", from: headerValue(message, "From") || "Unknown sender", replyTo: headerValue(message, "Reply-To") || headerValue(message, "From") || "", subject: headerValue(message, "Subject") || "No subject", preview: message.snippet || "", time: headerValue(message, "Date") || "", link: "https://mail.google.com/mail/u/0/#inbox/" + message.id })) },
    calendar: { events: (calendar.items || []).map((event) => ({ id: event.id, title: event.summary || "Untitled event", start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date, location: event.location || "", link: event.htmlLink || "" })) },
    drive: { files: (drive.files || []).map((file) => ({ id: file.id, name: file.name || "Untitled file", mimeType: file.mimeType || "", modifiedTime: file.modifiedTime || "", link: file.webViewLink || "", iconLink: file.iconLink || "", size: file.size ? Number(file.size) : null, starred: Boolean(file.starred), parents: file.parents || [] })) },
    tasks: { available: Boolean(taskLists), readOnly: false, items: taskGroups.flat() },
  });
}
async function handleDisconnect(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const row = await getIntegration(user.id);
  if (row) {
    try {
      const credentials = await decryptCredentials(row.credentials_ciphertext, row.credentials_iv);
      const token = credentials.refresh_token || credentials.access_token;
      if (token) await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(token), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    } catch (_) {}
    await db("focusos_integrations?user_id=eq." + encodeURIComponent(user.id) + "&provider=eq.google", { method: "DELETE" });
  }
  return json(req, { connected: false });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  try {
    if (action === "start" && req.method === "POST") return await handleStart(req);
    if (action === "callback" && req.method === "GET") return await handleCallback(req);
    if (action === "data" && req.method === "GET") return await handleData(req);
    if (action === "gmail-action" && req.method === "POST") return await handleGmailAction(req);
    if (action === "gmail-reply" && req.method === "POST") return await handleGmailReply(req);
    if (action === "google-task" && req.method === "POST") return await handleGoogleTask(req);
    if (action === "disconnect" && req.method === "POST") return await handleDisconnect(req);
    return json(req, { error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (action === "callback") {
      const redirect = new URL(APP_URL + "/");
      redirect.searchParams.set("google", "error");
      redirect.searchParams.set("message", message.slice(0, 160));
      return Response.redirect(redirect.toString(), 302);
    }
    const status = /sign in|session expired|restricted/i.test(message) ? 401 : 400;
    return json(req, { error: message }, status);
  }
});
