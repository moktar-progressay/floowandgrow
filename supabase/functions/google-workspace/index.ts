import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const TOKEN_SECRET = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "";
const STATE_SECRET = Deno.env.get("GOOGLE_OAUTH_STATE_SECRET") || "";
const APP_URL = Deno.env.get("FOCUSOS_APP_URL") || "https://moktar-progressay.github.io/floowandgrow/";
const APP_URLS = [
  APP_URL,
  "https://moktar-progressay.github.io/floowandgrow/",
  "https://floowandgrow.netlify.app/",
].map((value) => new URL(value));
const PROTECTED_GOOGLE_EMAIL = (Deno.env.get("FOCUSOS_GOOGLE_EMAIL") || "moktar@progressay.com").toLowerCase();
const encoder = new TextEncoder();

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages.readonly",
];

function allowedReturnUrl(value) {
  try {
    const candidate = new URL(String(value || ""));
    const match = APP_URLS.find((allowed) => candidate.origin === allowed.origin && candidate.pathname.startsWith(allowed.pathname));
    return match ? candidate.origin + candidate.pathname : APP_URLS[0].origin + APP_URLS[0].pathname;
  } catch (_) {
    return APP_URLS[0].origin + APP_URLS[0].pathname;
  }
}

function corsHeaders(req) {
  const requestOrigin = req.headers.get("origin");
  const allowedOrigin = APP_URLS.some((url) => url.origin === requestOrigin) ? requestOrigin : APP_URLS[0].origin;
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
async function createState(userId, accountEmail, returnTo) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sub: userId, email: accountEmail, returnTo: allowedReturnUrl(returnTo), exp: Date.now() + 10 * 60 * 1000, nonce: crypto.randomUUID() })));
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
  if (!payload.sub || !payload.email || !payload.exp || Date.now() > payload.exp) throw new Error("OAuth state expired");
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
  const email = String(user.email || "").trim().toLowerCase();
  if (!user.id || !email) throw new Error("A verified account email is required to connect Google Workspace.");
  user.email = email;
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
  let input = {};
  try { input = await req.json(); } catch (_) {}
  const state = await createState(user.id, user.email, input.returnTo);
  const hash = await sha256(state);
  await db("focusos_oauth_states?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: user.id, state_hash: hash, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), created_at: new Date().toISOString() }) });
  const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(), response_type: "code", access_type: "offline", include_granted_scopes: "true", prompt: "consent", login_hint: user.email, scope: GOOGLE_SCOPES.join(" "), state });
  return json(req, { url: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString() });
}
async function handleCallback(req) {
  ensureConfigured();
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (!state) throw new Error("Google did not return a valid authorisation state");
  const payload = await verifyState(state);
  if (url.searchParams.get("error")) return Response.redirect(allowedReturnUrl(payload.returnTo) + "?google=denied", 302);
  if (!code) throw new Error("Google did not return an authorisation code");
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
  const expectedEmail = String(payload.email || "").trim().toLowerCase();
  const googleEmail = String(profile.email || "").trim().toLowerCase();
  if (!googleEmail || googleEmail !== expectedEmail) throw new Error("Please connect the Google account that matches your FocusOS sign-in email.");
  if (googleEmail === PROTECTED_GOOGLE_EMAIL && expectedEmail !== PROTECTED_GOOGLE_EMAIL) throw new Error("This Google account is protected and cannot be linked here.");
  let previousRefreshToken = null;
  const previousRow = await getIntegration(payload.sub);
  if (previousRow) { try { previousRefreshToken = (await decryptCredentials(previousRow.credentials_ciphertext, previousRow.credentials_iv)).refresh_token || null; } catch (_) {} }
  const credentials = { access_token: tokens.access_token, refresh_token: tokens.refresh_token || previousRefreshToken, token_type: tokens.token_type || "Bearer", scope: tokens.scope || GOOGLE_SCOPES.join(" ") };
  if (!credentials.refresh_token) throw new Error("Google did not return long-lived access. Please reconnect and approve access.");
  const encrypted = await encryptCredentials(credentials);
  await db("focusos_integrations?on_conflict=user_id,provider", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: payload.sub, provider: "google", credentials_ciphertext: encrypted.ciphertext, credentials_iv: encrypted.iv, provider_email: googleEmail, scopes: String(credentials.scope).split(" "), token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }) });
  return Response.redirect(allowedReturnUrl(payload.returnTo) + "?google=connected", 302);
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
  const response = await googleFetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!response.ok) {
    const raw = await response.text();
    let detail = raw;
    try { detail = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
    throw new Error("Google API " + response.status + (detail ? ": " + String(detail).slice(0, 220) : ""));
  }
  return response.json();
}
async function googleFetch(url, init = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  const detail = lastError instanceof Error ? lastError.message : "Network request failed";
  throw new Error("Google could not be reached: " + detail);
}
async function googleJsonOptional(url, accessToken) {
  try { return await googleJson(url, accessToken); } catch (_) { return null; }
}
async function googleAllItems(url, accessToken) {
  const items = [];
  let pageToken = "";
  do {
    const pageUrl = new URL(url);
    if (pageToken) pageUrl.searchParams.set("pageToken", pageToken);
    const page = await googleJson(pageUrl.toString(), accessToken);
    items.push(...(page.items || page.files || page.spaces || page.messages || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return items;
}
async function googleApi(url, accessToken, method = "GET", body: unknown = undefined) {
  const response = await googleFetch(url, {
    method,
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    let message = detail;
    try { message = JSON.parse(detail)?.error?.message || detail; } catch (_) {}
    throw new Error("Google API " + response.status + (message ? ": " + String(message).slice(0, 220) : ""));
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
function decodeBase64UrlText(value) {
  if (!value) return "";
  const normalised = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function collectGmailParts(part, textParts, htmlParts, attachments) {
  if (!part) return;
  const filename = String(part.filename || "").trim();
  if (filename && part.body?.attachmentId) {
    attachments.push({ filename, mimeType: part.mimeType || "application/octet-stream", size: Number(part.body.size || 0), attachmentId: part.body.attachmentId });
  }
  if (part.body?.data) {
    const decoded = decodeBase64UrlText(part.body.data);
    if (part.mimeType === "text/plain") textParts.push(decoded);
    if (part.mimeType === "text/html") htmlParts.push(decoded);
  }
  for (const child of part.parts || []) collectGmailParts(child, textParts, htmlParts, attachments);
}
function readableHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
async function handleGmailMessage(req) {
  const { accessToken } = await connectedUser(req);
  const body = await req.json();
  const messageId = String(body.messageId || "");
  if (!messageId) throw new Error("Message is required.");
  const message = await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(messageId) + "?format=full", accessToken);
  const textParts = [];
  const htmlParts = [];
  const attachments = [];
  collectGmailParts(message.payload, textParts, htmlParts, attachments);
  const text = textParts.join("\n\n").trim() || readableHtml(htmlParts.join("\n\n"));
  return json(req, {
    id: message.id,
    threadId: message.threadId || "",
    subject: headerValue(message, "Subject") || "No subject",
    from: headerValue(message, "From") || "Unknown sender",
    replyTo: headerValue(message, "Reply-To") || headerValue(message, "From") || "",
    to: headerValue(message, "To") || "",
    cc: headerValue(message, "Cc") || "",
    date: headerValue(message, "Date") || "",
    text: text || message.snippet || "This email has no readable text content.",
    unread: (message.labelIds || []).includes("UNREAD"),
    attachments,
  });
}
async function handleGmailAction(req) {
  const { user, accessToken } = await connectedUser(req);
  const body = await req.json();
  const messageId = String(body.messageId || "");
  if (!messageId) throw new Error("Message is required.");
  const changes = body.action === "archive" ? { removeLabelIds: ["INBOX"] }
    : body.action === "read" ? { removeLabelIds: ["UNREAD"] }
    : body.action === "unread" ? { addLabelIds: ["UNREAD"] }
    : null;
  if (!changes) throw new Error("Unsupported Gmail action.");
  await googleApi("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(messageId) + "/modify", accessToken, "POST", changes);
  const linkQuery = new URLSearchParams({ select: "task_id", user_id: "eq." + user.id, provider: "eq.gmail", external_id: "eq." + messageId, limit: "1" });
  const linked = await db("focusos_external_links?" + linkQuery.toString());
  if (Array.isArray(linked) && linked[0]?.task_id) {
    const completed = body.action !== "unread";
    await db("focusos_tasks?id=eq." + encodeURIComponent(linked[0].task_id) + "&user_id=eq." + encodeURIComponent(user.id), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: completed ? "completed" : "open", completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() }),
    });
  }
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
async function taskAndLinks(userId, taskId) {
  const taskQuery = new URLSearchParams({ select: "*", id: "eq." + taskId, user_id: "eq." + userId, limit: "1" });
  const tasks = await db("focusos_tasks?" + taskQuery.toString());
  if (!Array.isArray(tasks) || !tasks.length) throw new Error("FocusOS task not found.");
  const linkQuery = new URLSearchParams({ select: "*", task_id: "eq." + taskId, user_id: "eq." + userId });
  const links = await db("focusos_external_links?" + linkQuery.toString());
  return { task: tasks[0], links: Array.isArray(links) ? links : [] };
}
async function saveExternalLink(userId, taskId, provider, externalId, containerId = null, externalUpdatedAt = null) {
  await db("focusos_external_links?on_conflict=task_id,provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, task_id: taskId, provider, external_id: externalId, external_container_id: containerId, external_updated_at: externalUpdatedAt, last_synced_at: new Date().toISOString(), sync_status: "synced", updated_at: new Date().toISOString() }),
  });
}
async function saveProjectExternalLink(userId, projectId, externalId, externalUpdatedAt = null) {
  await db("focusos_project_external_links?on_conflict=user_id,provider,external_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, project_id: projectId, provider: "google_tasks", external_id: externalId, external_updated_at: externalUpdatedAt, last_synced_at: new Date().toISOString(), sync_status: "synced", updated_at: new Date().toISOString() }),
  });
}
async function projectAndGoogleList(userId, projectId, accessToken) {
  if (!projectId) return { listId: "@default", project: null, link: null };
  const projectQuery = new URLSearchParams({ select: "id,name,updated_at", id: "eq." + projectId, user_id: "eq." + userId, limit: "1" });
  const projects = await db("focusos_projects?" + projectQuery.toString());
  if (!Array.isArray(projects) || !projects.length) return { listId: "@default", project: null, link: null };
  const linkQuery = new URLSearchParams({ select: "*", project_id: "eq." + projectId, user_id: "eq." + userId, provider: "eq.google_tasks", limit: "1" });
  const links = await db("focusos_project_external_links?" + linkQuery.toString());
  if (Array.isArray(links) && links.length) return { listId: links[0].external_id, project: projects[0], link: links[0] };
  const created = await googleApi("https://tasks.googleapis.com/tasks/v1/users/@me/lists", accessToken, "POST", { title: projects[0].name });
  await saveProjectExternalLink(userId, projectId, created.id, created.updated || null);
  return { listId: created.id, project: projects[0], link: null };
}
async function handleSyncFocusProject(req) {
  const { user, accessToken } = await connectedUser(req);
  const body = await req.json();
  const projectId = String(body.projectId || "");
  if (!projectId) throw new Error("Project is required.");
  const mapping = await projectAndGoogleList(user.id, projectId, accessToken);
  if (!mapping.project) throw new Error("FocusOS project not found.");
  if (mapping.link) {
    const updated = await googleApi("https://tasks.googleapis.com/tasks/v1/users/@me/lists/" + encodeURIComponent(mapping.listId), accessToken, "PATCH", { title: mapping.project.name });
    await saveProjectExternalLink(user.id, projectId, mapping.listId, updated.updated || null);
  }
  return json(req, { ok: true, listId: mapping.listId });
}
function calendarRange(date, time) {
  const parts = String(time).slice(0, 5).split(":").map(Number);
  const endTotal = parts[0] * 60 + parts[1] + 60;
  const endDate = new Date(date + "T12:00:00Z");
  if (endTotal >= 1440) endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endTime = String(Math.floor((endTotal % 1440) / 60)).padStart(2, "0") + ":" + String(endTotal % 60).padStart(2, "0");
  return {
    start: { dateTime: date + "T" + String(time).slice(0, 5) + ":00", timeZone: "Europe/London" },
    end: { dateTime: endDate.toISOString().slice(0, 10) + "T" + endTime + ":00", timeZone: "Europe/London" },
  };
}
async function handleSyncFocusTask(req) {
  const { user, accessToken } = await connectedUser(req);
  const body = await req.json();
  const taskId = String(body.taskId || "");
  if (!taskId) throw new Error("Task is required.");
  const { task, links } = await taskAndLinks(user.id, taskId);
  const gmailLink = links.find((link) => link.provider === "gmail");
  if ((task.source === "gmail" || task.source === "google_gmail") && gmailLink) {
    const changes = task.status === "archived"
      ? { removeLabelIds: ["INBOX"] }
      : task.status === "completed"
        ? { removeLabelIds: ["UNREAD"] }
        : { addLabelIds: ["UNREAD"] };
    await googleApi("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(gmailLink.external_id) + "/modify", accessToken, "POST", changes);
    await saveExternalLink(user.id, task.id, "gmail", gmailLink.external_id, gmailLink.external_container_id || null, gmailLink.external_updated_at || null);
    return json(req, { ok: true });
  }

  const taskLink = links.find((link) => link.provider === "google_tasks");
  if (task.source !== "google_calendar") {
    const target = await projectAndGoogleList(user.id, task.project_id, accessToken);
    const targetListId = target.listId || "@default";
    const googleTaskBody = { title: task.title, due: task.scheduled_date ? task.scheduled_date + "T00:00:00.000Z" : null, status: task.status === "completed" ? "completed" : "needsAction", completed: task.status === "completed" ? (task.completed_at || new Date().toISOString()) : null };
    let googleTask;
    if (taskLink && (taskLink.external_container_id || "@default") !== targetListId) {
      googleTask = await googleApi("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(targetListId) + "/tasks", accessToken, "POST", googleTaskBody);
      await googleApi("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(taskLink.external_container_id || "@default") + "/tasks/" + encodeURIComponent(taskLink.external_id), accessToken, "DELETE");
    } else if (taskLink) {
      googleTask = await googleApi("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(targetListId) + "/tasks/" + encodeURIComponent(taskLink.external_id), accessToken, "PATCH", googleTaskBody);
    } else {
      googleTask = await googleApi("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(targetListId) + "/tasks", accessToken, "POST", googleTaskBody);
    }
    await saveExternalLink(user.id, task.id, "google_tasks", googleTask.id, targetListId, googleTask.updated || null);
  }

  const calendarLink = links.find((link) => link.provider === "google_calendar");
  const shouldSyncCalendar = task.scheduled_date && task.status !== "archived" && (task.scheduled_time || task.source === "google_calendar");
  if (shouldSyncCalendar) {
    const eventBody = task.scheduled_time
      ? (() => { const range = calendarRange(task.scheduled_date, task.scheduled_time); return { summary: task.title, description: "Synced from FocusOS", start: range.start, end: range.end }; })()
      : { summary: task.title, description: "Synced from FocusOS", start: { date: task.scheduled_date }, end: { date: nextIsoDate(task.scheduled_date) } };
    const event = calendarLink
      ? await googleApi("https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(calendarLink.external_id), accessToken, "PATCH", eventBody)
      : await googleApi("https://www.googleapis.com/calendar/v3/calendars/primary/events", accessToken, "POST", eventBody);
    await saveExternalLink(user.id, task.id, "google_calendar", event.id, "primary", event.updated || null);
  } else if (calendarLink) {
    await googleApi("https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(calendarLink.external_id), accessToken, "DELETE");
    await db("focusos_external_links?task_id=eq." + encodeURIComponent(task.id) + "&provider=eq.google_calendar", { method: "DELETE" });
  }
  return json(req, { ok: true });
}
async function handleDeleteFocusTaskLinks(req) {
  const { user, accessToken } = await connectedUser(req);
  const body = await req.json();
  const taskId = String(body.taskId || "");
  const { links } = await taskAndLinks(user.id, taskId);
  for (const link of links) {
    if (link.provider === "google_tasks") await googleApi("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(link.external_container_id || "@default") + "/tasks/" + encodeURIComponent(link.external_id), accessToken, "DELETE");
    if (link.provider === "google_calendar") await googleApi("https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(link.external_id), accessToken, "DELETE");
  }
  await db("focusos_external_links?task_id=eq." + encodeURIComponent(taskId) + "&user_id=eq." + encodeURIComponent(user.id), { method: "DELETE" });
  return json(req, { ok: true });
}
async function ensureGoogleProjectMappings(userId, taskLists) {
  const [links, projects] = await Promise.all([
    db("focusos_project_external_links?" + new URLSearchParams({ select: "*", user_id: "eq." + userId, provider: "eq.google_tasks" }).toString()),
    db("focusos_projects?" + new URLSearchParams({ select: "id,name,status", user_id: "eq." + userId, status: "eq.active" }).toString()),
  ]);
  const allLinks = Array.isArray(links) ? links : [];
  const allProjects = Array.isArray(projects) ? projects : [];
  const claimedProjectIds = new Set(allLinks.map((link) => link.project_id));
  const mapping = new Map();
  for (const list of taskLists) {
    let link = allLinks.find((candidate) => candidate.external_id === list.id);
    if (!link) {
      let project = allProjects.find((candidate) => !claimedProjectIds.has(candidate.id) && String(candidate.name).trim().toLowerCase() === String(list.title || "Google Tasks").trim().toLowerCase());
      if (!project) {
        const inserted = await db("focusos_projects", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, name: list.title || "Google Tasks", colour: "#35c2ff", status: "active" }) });
        project = Array.isArray(inserted) ? inserted[0] : null;
        if (project) allProjects.push(project);
      }
      if (project) {
        await saveProjectExternalLink(userId, project.id, list.id, list.updated || null);
        claimedProjectIds.add(project.id);
        link = { project_id: project.id, external_id: list.id };
        allLinks.push(link);
      }
    }
    if (link) mapping.set(list.id, link.project_id);
  }
  return mapping;
}
async function synchroniseGoogleToFocus(userId, taskLists, googleTasks, calendarEvents, gmailMessages = []) {
  const projectMappings = await ensureGoogleProjectMappings(userId, taskLists);
  const linkQuery = new URLSearchParams({ select: "*", user_id: "eq." + userId });
  const links = await db("focusos_external_links?" + linkQuery.toString());
  const allLinks = Array.isArray(links) ? links : [];
  const taskLinks = allLinks.filter((link) => link.provider === "google_tasks");
  const calendarLinks = allLinks.filter((link) => link.provider === "google_calendar");
  const gmailLinks = allLinks.filter((link) => link.provider === "gmail");
  const focusQuery = new URLSearchParams({ select: "id,legacy_key,title,status,completed_at,project_id,scheduled_date,scheduled_time,source,updated_at", user_id: "eq." + userId });
  const focusTasks = await db("focusos_tasks?" + focusQuery.toString());
  for (const [listId, projectId] of projectMappings.entries()) {
    const ids = taskLinks.filter((link) => link.external_container_id === listId).map((link) => link.task_id).filter((taskId) => {
      const task = focusTasks.find((candidate) => candidate.id === taskId);
      return task && task.project_id !== projectId;
    });
    for (let index = 0; index < ids.length; index += 50) {
      const chunk = ids.slice(index, index + 50);
      await db("focusos_tasks?user_id=eq." + encodeURIComponent(userId) + "&id=in.(" + chunk.join(",") + ")", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ project_id: projectId }) });
    }
    focusTasks.forEach((task) => { if (ids.includes(task.id)) task.project_id = projectId; });
  }
  for (const item of googleTasks) {
    const projectId = projectMappings.get(item.externalTaskListId) || null;
    const link = taskLinks.find((candidate) => candidate.external_id === item.id && candidate.external_container_id === item.externalTaskListId);
    if (item.deleted) {
      if (link) {
        await db("focusos_tasks?id=eq." + encodeURIComponent(link.task_id) + "&user_id=eq." + encodeURIComponent(userId), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "archived", updated_at: new Date().toISOString() }) });
        await db("focusos_external_links?task_id=eq." + encodeURIComponent(link.task_id) + "&provider=eq.google_tasks", { method: "DELETE" });
      }
      continue;
    }
    if (!link) {
      if (item.status === "completed") continue;
      const inserted = await db("focusos_tasks", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, legacy_key: "google_tasks:" + item.externalTaskListId + ":" + item.id, title: item.title || "Untitled task", status: "open", project_id: projectId, scheduled_date: item.due ? String(item.due).slice(0, 10) : null, recurrence: "none", is_daily_anchor: false, source: "google_tasks" }) });
      if (Array.isArray(inserted) && inserted[0]) {
        focusTasks.push(inserted[0]);
        await saveExternalLink(userId, inserted[0].id, "google_tasks", item.id, item.externalTaskListId, item.updated || null);
      }
      continue;
    }
    const focusTask = focusTasks.find((candidate) => candidate.id === link.task_id);
    if (!focusTask) continue;
    const googleChanged = item.updated && (!link.last_synced_at || new Date(item.updated) > new Date(link.last_synced_at));
    if (!googleChanged) continue;
    const patch = { project_id: projectId, updated_at: new Date().toISOString() };
    if (googleChanged) Object.assign(patch, { title: item.title || focusTask.title, scheduled_date: item.due ? String(item.due).slice(0, 10) : null, status: item.status === "completed" ? "completed" : "open", completed_at: item.status === "completed" ? (item.completed || new Date().toISOString()) : null });
    await db("focusos_tasks?id=eq." + encodeURIComponent(focusTask.id) + "&user_id=eq." + encodeURIComponent(userId), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    await saveExternalLink(userId, focusTask.id, "google_tasks", item.id, item.externalTaskListId, item.updated);
  }
  for (const event of calendarEvents) {
    let link = calendarLinks.find((candidate) => candidate.external_id === event.id);
    if (link && event.status === "cancelled") {
      await db("focusos_tasks?id=eq." + encodeURIComponent(link.task_id) + "&user_id=eq." + encodeURIComponent(userId), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "archived", updated_at: new Date().toISOString() }) });
      continue;
    }
    if (event.status === "cancelled") continue;
    const start = event.start?.dateTime || event.start?.date || "";
    if (!link) {
      const legacyKey = "google_calendar:" + event.id;
      let focusTask = focusTasks.find((candidate) => candidate.legacy_key === legacyKey);
      if (!focusTask) {
        const inserted = await db("focusos_tasks", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, legacy_key: legacyKey, title: event.summary || "Untitled event", status: "open", project_id: null, scheduled_date: start ? String(start).slice(0, 10) : null, scheduled_time: event.start?.dateTime ? String(event.start.dateTime).slice(11, 19) : null, recurrence: "none", is_daily_anchor: false, source: "google_calendar" }) });
        focusTask = Array.isArray(inserted) ? inserted[0] : null;
        if (focusTask) focusTasks.push(focusTask);
      }
      if (focusTask) {
        await saveExternalLink(userId, focusTask.id, "google_calendar", event.id, "primary", event.updated || null);
        link = { task_id: focusTask.id, external_id: event.id, last_synced_at: new Date().toISOString() };
        calendarLinks.push(link);
      }
      continue;
    }
    if (!event.updated || (link.last_synced_at && new Date(event.updated) <= new Date(link.last_synced_at))) continue;
    const focusTask = focusTasks.find((candidate) => candidate.id === link.task_id);
    if (!focusTask) continue;
    await db("focusos_tasks?id=eq." + encodeURIComponent(focusTask.id) + "&user_id=eq." + encodeURIComponent(userId), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title: event.summary || focusTask.title, scheduled_date: start ? String(start).slice(0, 10) : null, scheduled_time: event.start?.dateTime ? String(event.start.dateTime).slice(11, 19) : null, source: "google_calendar", updated_at: new Date().toISOString() }) });
    await saveExternalLink(userId, focusTask.id, "google_calendar", event.id, "primary", event.updated);
  }

  for (const message of gmailMessages) {
    const messageId = String(message.id || "");
    if (!messageId) continue;
    let link = gmailLinks.find((candidate) => candidate.external_id === messageId);
    const legacyKey = "gmail:" + messageId;
    const dateHeader = headerValue(message, "Date");
    const receivedAt = validIsoDate(dateHeader) || (message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString());
    const unread = (message.labelIds || []).includes("UNREAD");
    const title = "Read email: " + (headerValue(message, "Subject") || "No subject");
    let focusTask = link ? focusTasks.find((candidate) => candidate.id === link.task_id) : focusTasks.find((candidate) => candidate.legacy_key === legacyKey);
    if (!focusTask) {
      const inserted = await db("focusos_tasks", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, legacy_key: legacyKey, title, status: unread ? "open" : "completed", project_id: null, scheduled_date: receivedAt.slice(0, 10), scheduled_time: receivedAt.slice(11, 19), recurrence: "none", is_daily_anchor: false, source: "gmail", completed_at: unread ? null : receivedAt }) });
      focusTask = Array.isArray(inserted) ? inserted[0] : null;
      if (focusTask) focusTasks.push(focusTask);
    }
    if (!focusTask) continue;
    if (!link) {
      await saveExternalLink(userId, focusTask.id, "gmail", messageId, message.threadId || null, receivedAt);
      link = { task_id: focusTask.id, external_id: messageId, last_synced_at: new Date().toISOString() };
      gmailLinks.push(link);
    }
    if (focusTask.status !== "archived") {
      await db("focusos_tasks?id=eq." + encodeURIComponent(focusTask.id) + "&user_id=eq." + encodeURIComponent(userId), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title, status: unread ? "open" : "completed", scheduled_date: receivedAt.slice(0, 10), scheduled_time: receivedAt.slice(11, 19), source: "gmail", completed_at: unread ? null : (focusTask.completed_at || receivedAt), updated_at: new Date().toISOString() }) });
    }
    await saveExternalLink(userId, focusTask.id, "gmail", messageId, message.threadId || null, receivedAt);
  }
}
function validIsoDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function nextIsoDate(value) {
  const date = new Date(String(value) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
function headerValue(message, name) {
  const headers = message?.payload?.headers || [];
  const found = headers.find((header) => String(header.name).toLowerCase() === name.toLowerCase());
  return found?.value || "";
}
async function loadGmail(accessToken) {
  const [inboxLabel, messageList] = await Promise.all([
    googleJson("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", accessToken),
    googleAllItems("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=" + encodeURIComponent("in:inbox newer_than:30d"), accessToken),
  ]);
  const details = [];
  const messages = Array.isArray(messageList) ? messageList : [];
  for (let index = 0; index < messages.length; index += 8) {
    const batch = await Promise.allSettled(messages.slice(index, index + 8).map((message) => googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(message.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Subject&metadataHeaders=Date", accessToken)));
    details.push(...batch.filter((item) => item.status === "fulfilled").map((item) => item.value));
  }
  return { unread: Number(inboxLabel.messagesUnread || 0), messages: details };
}
function gmailPayload(gmail) {
  return {
    unread: gmail.unread,
    messages: gmail.messages.map((message) => {
      const snippet = message.snippet || "";
      const date = headerValue(message, "Date") || "";
      return { id: message.id, threadId: message.threadId || "", channel: "gmail", from: headerValue(message, "From") || "Unknown sender", replyTo: headerValue(message, "Reply-To") || headerValue(message, "From") || "", subject: headerValue(message, "Subject") || "No subject", snippet, preview: snippet, date, time: date, unread: (message.labelIds || []).includes("UNREAD"), link: "https://mail.google.com/mail/u/0/#inbox/" + message.id };
    }),
  };
}
async function handleGmailData(req) {
  const { user, row, accessToken } = await connectedUser(req);
  const gmail = await loadGmail(accessToken);
  await synchroniseGoogleToFocus(user.id, [], [], [], gmail.messages);
  return json(req, { connected: true, email: row.provider_email, services: { gmail: { ok: true, error: null } }, gmail: gmailPayload(gmail) });
}
async function handleData(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const { row, credentials } = await authorisedCredentials(user.id);
  if (!row || !credentials) return json(req, { connected: false, email: null, gmail: null, calendar: null, drive: null, tasks: null, chat: null, services: {} });
  const accessToken = credentials.access_token;
  const start = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
  const loaders: Record<string, Promise<any>> = {
    gmail: loadGmail(accessToken),
    calendar: googleAllItems("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + new URLSearchParams({ timeMin: start, timeMax: end, maxResults: "2500", singleEvents: "true", showDeleted: "true", orderBy: "startTime" }).toString(), accessToken),
    drive: googleAllItems("https://www.googleapis.com/drive/v3/files?" + new URLSearchParams({ q: "trashed = false", pageSize: "1000", orderBy: "modifiedTime desc", fields: "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size,starred,parents)" }).toString(), accessToken),
    tasks: (async () => {
      const lists = await googleAllItems("https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100", accessToken);
      const groups = await Promise.all(lists.map(async (list) => {
        const listTasks = await googleAllItems("https://tasks.googleapis.com/tasks/v1/lists/" + encodeURIComponent(list.id) + "/tasks?" + new URLSearchParams({ maxResults: "100", showCompleted: "true", showHidden: "true", showDeleted: "true" }).toString(), accessToken);
        return listTasks.map((task) => ({ id: task.id, externalTaskId: task.id, externalTaskListId: list.id, provider: "google_tasks", title: task.title || "Untitled task", notes: task.notes || "", due: task.due || null, status: task.status || "needsAction", deleted: Boolean(task.deleted), updated: task.updated || null, taskListTitle: list.title || "Google Tasks", link: "https://tasks.google.com/", lastSynchronisedAt: new Date().toISOString(), readOnly: false }));
      }));
      return { lists, items: groups.flat() };
    })(),
    chat: (async () => {
      const spaces = await googleAllItems("https://chat.googleapis.com/v1/spaces?pageSize=100", accessToken);
      const recent = [];
      for (const space of spaces.slice(0, 20)) {
        const response = await googleJson("https://chat.googleapis.com/v1/" + space.name + "/messages?" + new URLSearchParams({ pageSize: "10", orderBy: "createTime DESC", filter: 'createTime > "' + new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() + '"' }).toString(), accessToken);
        for (const message of response.messages || []) recent.push({ id: message.name, space: space.name, spaceName: space.displayName || "Google Chat", text: message.text || message.formattedText || "Chat message", createTime: message.createTime || "", link: "https://chat.google.com/" });
      }
      recent.sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));
      return { spaces, messages: recent.slice(0, 100) };
    })(),
  };
  const names = Object.keys(loaders);
  const settled = await Promise.allSettled(names.map((name) => loaders[name]));
  const values: Record<string, any> = {};
  const services: Record<string, { ok: boolean; error: string | null }> = {};
  names.forEach((name, index) => {
    const result = settled[index];
    if (result.status === "fulfilled") { values[name] = result.value; services[name] = { ok: true, error: null }; }
    else { values[name] = null; services[name] = { ok: false, error: result.reason instanceof Error ? result.reason.message : "Google service unavailable" }; }
  });
  if (values.tasks || values.calendar || values.gmail) {
    try { await synchroniseGoogleToFocus(user.id, values.tasks?.lists || [], values.tasks?.items || [], values.calendar || [], values.gmail?.messages || []); }
    catch (error) { services.tasks = { ok: false, error: error instanceof Error ? error.message : "Task synchronisation failed" }; }
  }
  const gmail = values.gmail || { unread: 0, messages: [] };
  const calendar = values.calendar || [];
  const drive = values.drive || [];
  const taskData = values.tasks || { lists: [], items: [] };
  const chat = values.chat || { spaces: [], messages: [] };
  return json(req, {
    connected: true,
    email: row.provider_email,
    scopes: row.scopes || [],
    services,
    gmail: gmailPayload(gmail),
    calendar: { events: calendar.filter((event) => event.status !== "cancelled").map((event) => ({ id: event.id, title: event.summary || "Untitled event", start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date, location: event.location || "", link: event.htmlLink || "" })) },
    drive: { files: drive.map((file) => ({ id: file.id, name: file.name || "Untitled file", mimeType: file.mimeType || "", modifiedTime: file.modifiedTime || "", link: file.webViewLink || "", iconLink: file.iconLink || "", size: file.size ? Number(file.size) : null, starred: Boolean(file.starred), parents: file.parents || [] })) },
    tasks: { available: Boolean(values.tasks), readOnly: false, lists: taskData.lists, items: taskData.items.filter((task) => task.status !== "completed" && !task.deleted) },
    chat,
  });
}
async function handleStatus(req) {
  ensureConfigured();
  const user = await requireUser(req);
  const row = await getIntegration(user.id);
  return json(req, {
    connected: Boolean(row),
    email: row?.provider_email || null,
    scopes: row?.scopes || [],
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
    if (action === "status" && req.method === "GET") return await handleStatus(req);
    if (action === "data" && req.method === "GET") return await handleData(req);
    if (action === "gmail-data" && req.method === "GET") return await handleGmailData(req);
    if (action === "gmail-message" && req.method === "POST") return await handleGmailMessage(req);
    if (action === "gmail-action" && req.method === "POST") return await handleGmailAction(req);
    if (action === "gmail-reply" && req.method === "POST") return await handleGmailReply(req);
    if (action === "google-task" && req.method === "POST") return await handleGoogleTask(req);
    if (action === "sync-focus-project" && req.method === "POST") return await handleSyncFocusProject(req);
    if (action === "sync-focus-task" && req.method === "POST") return await handleSyncFocusTask(req);
    if (action === "delete-focus-task-links" && req.method === "POST") return await handleDeleteFocusTaskLinks(req);
    if (action === "disconnect" && req.method === "POST") return await handleDisconnect(req);
    return json(req, { error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (action === "callback") {
      let callbackTarget = allowedReturnUrl(APP_URL);
      try {
        const stateValue = new URL(req.url).searchParams.get("state");
        if (stateValue) callbackTarget = allowedReturnUrl((await verifyState(stateValue)).returnTo);
      } catch (_) {}
      const redirect = new URL(callbackTarget);
      redirect.searchParams.set("google", "error");
      redirect.searchParams.set("message", message.slice(0, 160));
      return Response.redirect(redirect.toString(), 302);
    }
    const status = /sign in|session expired|restricted/i.test(message) ? 401 : 400;
    return json(req, { error: message }, status);
  }
});
