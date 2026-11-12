import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const appUrl = Deno.env.get("APP_URL") || "";
const appOrigin = appUrl ? new URL(appUrl).origin : "";
const cors = {
  ...(appOrigin ? { "Access-Control-Allow-Origin": appOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const redirect = (url: string) => new Response(null, { status: 302, headers: { ...cors, Location: url } });
const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
};
const key = async () => {
  const raw = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY");
  if (!raw) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY belum disetel.");
  const bytes = unb64(raw);
  if (bytes.length !== 32) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY harus Base64 dari 32 byte.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
};
const encrypt = async (plain: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), enc.encode(plain));
  return `v1.${b64(iv)}.${b64(new Uint8Array(cipher))}`;
};
const decrypt = async (value: string) => {
  const [version, iv, cipher] = value.split(".");
  if (version !== "v1" || !iv || !cipher) throw new Error("Format token tersimpan tidak valid.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await key(), unb64(cipher));
  return new TextDecoder().decode(plain);
};
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const anonKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || `${supabaseUrl}/functions/v1/gmail-oauth`;
const scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid";
const accountUrl = (status?: string) => {
  const target = new URL("/account", appOrigin || supabaseUrl);
  if (status) target.searchParams.set("gmail", status);
  return target.toString();
};
const withGmailStatus = (base: string, status: string) => {
  const target = new URL(base);
  target.searchParams.set("gmail", status);
  return target.toString();
};

async function requireUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !anonKey) throw new Error("Sesi login tidak ditemukan.");
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Sesi login tidak valid atau sudah berakhir.");
  return data.user;
}
function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return new TextDecoder().decode(Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), c => c.charCodeAt(0)));
}
function findText(payload: any): string {
  if (!payload) return "";
  let result = "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    try { result += decodeBase64Url(payload.body.data) + "\n"; } catch { /* ignore malformed MIME part */ }
  }
  for (const part of payload.parts || []) result += findText(part);
  return result.slice(0, 30000);
}
function detectCode(text: string): string | null {
  const labeled = text.match(/(?:verification|verify|security|one[- ]time|otp|code|kode|passcode)[^\d]{0,32}(\d{4,8})/i);
  if (labeled) return labeled[1];
  const generic = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return generic?.[1] || null;
}
async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret,
    refresh_token: refreshToken, grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Google meminta akun Gmail dihubungkan ulang.");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const isCallback = req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("error") || url.searchParams.has("state"));
  try {
    if (isCallback) {
      const state = url.searchParams.get("state") || "";
      if (!state) return redirect(accountUrl("oauth_error"));
      const stateHash = await sha256(state);
      const { data: pending, error: stateError } = await admin.from("gmail_oauth_states")
        .select("*").eq("state_hash", stateHash).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (stateError || !pending) return redirect(accountUrl("state_expired"));
      let returnTo = accountUrl();
      try {
        const savedReturnTo = new URL(pending.redirect_after);
        if (appOrigin && savedReturnTo.origin === appOrigin) returnTo = savedReturnTo.toString();
      } catch {
        // Ignore malformed or legacy redirect destinations.
      }
      await admin.from("gmail_oauth_states").delete().eq("state_hash", stateHash);
      if (url.searchParams.get("error")) return redirect(withGmailStatus(returnTo, "denied"));
      const code = url.searchParams.get("code");
      if (!code) return redirect(withGmailStatus(returnTo, "oauth_error"));
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok || !tokens.access_token) return redirect(withGmailStatus(returnTo, "token_error"));
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileResponse.json();
      const { data: account } = await admin.from("email_accounts").select("id,email,user_id")
        .eq("id", pending.email_account_id).eq("user_id", pending.user_id).maybeSingle();
      if (!account || String(account.email).toLowerCase() !== String(profile.email || "").toLowerCase()) {
        return redirect(withGmailStatus(returnTo, "email_mismatch"));
      }
      let refreshCipher = "";
      if (tokens.refresh_token) refreshCipher = await encrypt(tokens.refresh_token);
      else {
        const { data: previous } = await admin.from("gmail_mailbox_connections")
          .select("refresh_token_ciphertext").eq("email_account_id", account.id).eq("user_id", account.user_id).maybeSingle();
        if (!previous?.refresh_token_ciphertext) return redirect(withGmailStatus(returnTo, "reauth_required"));
        refreshCipher = previous.refresh_token_ciphertext;
      }
      const { error: saveError } = await admin.from("gmail_mailbox_connections").upsert({
        user_id: account.user_id, email_account_id: account.id, google_email: profile.email,
        google_subject: profile.sub || null, refresh_token_ciphertext: refreshCipher,
        scopes: String(tokens.scope || scope).split(" "), status: "connected", updated_at: new Date().toISOString(),
      }, { onConflict: "email_account_id" });
      if (saveError) return redirect(withGmailStatus(returnTo, "save_error"));
      return redirect(withGmailStatus(returnTo, "connected"));
    }

    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "connect") {
      if (!appOrigin) return json({ error: "APP_URL belum dikonfigurasi ke domain aplikasi produksi." }, 503);
      if (!clientId || !clientSecret) return json({ error: "Google OAuth belum dikonfigurasi." }, 503);
      const accountId = String(body.emailAccountId || "");
      const { data: account } = await admin.from("email_accounts").select("id,email,user_id,provider")
        .eq("id", accountId).eq("user_id", user.id).maybeSingle();
      if (!account) return json({ error: "Akun email tidak ditemukan atau bukan milik Anda." }, 404);
      const state = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      const redirectAfter = accountUrl();
      const { error } = await admin.from("gmail_oauth_states").insert({
        state_hash: await sha256(state), user_id: user.id, email_account_id: account.id,
        redirect_after: redirectAfter, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) return json({ error: "Tidak dapat memulai koneksi Gmail." }, 500);
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: "code",
        scope, access_type: "offline", prompt: "consent", include_granted_scopes: "true",
        state, login_hint: account.email,
      }).toString();
      return json({ authorizationUrl: authUrl.toString() });
    }

    if (action === "status") {
      const accountId = String(body.emailAccountId || "");
      const { data: account } = await admin.from("email_accounts").select("id")
        .eq("id", accountId).eq("user_id", user.id).maybeSingle();
      if (!account) return json({ error: "Akun email tidak ditemukan." }, 404);
      const { data: connection } = await admin.from("gmail_mailbox_connections")
        .select("google_email,status,last_checked_at").eq("email_account_id", accountId).eq("user_id", user.id).maybeSingle();
      return json({
        connected: connection?.status === "connected",
        status: connection?.status || "disconnected",
        googleEmail: connection?.google_email || null,
        lastCheckedAt: connection?.last_checked_at || null,
      });
    }

    if (action === "latest") {
      const accountId = String(body.emailAccountId || "");
      const { data: account } = await admin.from("email_accounts").select("id,email,user_id")
        .eq("id", accountId).eq("user_id", user.id).maybeSingle();
      if (!account) return json({ error: "Akun email tidak ditemukan." }, 404);
      const { data: connection } = await admin.from("gmail_mailbox_connections")
        .select("google_email,refresh_token_ciphertext,status").eq("email_account_id", accountId).eq("user_id", user.id).maybeSingle();
      if (!connection || connection.status !== "connected") return json({ error: "Gmail belum terhubung." }, 409);
      let accessToken: string;
      try {
        accessToken = await refreshAccessToken(await decrypt(connection.refresh_token_ciphertext));
      } catch {
        await admin.from("gmail_mailbox_connections")
          .update({ status: "reauth_required", updated_at: new Date().toISOString() })
          .eq("email_account_id", accountId).eq("user_id", user.id);
        return json({ error: "Sesi Gmail kedaluwarsa atau dicabut. Hubungkan ulang akun Gmail ini." }, 409);
      }
      const listResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const list = await listResponse.json();
      if (!listResponse.ok) throw new Error("Gagal mengambil email terbaru dari Gmail.");
      if (!list.messages?.length) return json({ message: null, connectedEmail: connection.google_email });
      const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${list.messages[0].id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const message = await messageResponse.json();
      if (!messageResponse.ok) throw new Error("Gagal membaca metadata email terbaru.");
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
      const text = [message.snippet || "", findText(message.payload)].join("\n");
      const code = detectCode(text);
      await admin.from("gmail_mailbox_connections")
        .update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("email_account_id", accountId).eq("user_id", user.id);
      return json({
        connectedEmail: connection.google_email,
        message: {
          id: message.id, from: getHeader("From"), subject: getHeader("Subject"),
          receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
          verificationCode: code,
          codeDetected: Boolean(code),
        },
      });
    }

    if (action === "disconnect") {
      const accountId = String(body.emailAccountId || "");
      const { data: account } = await admin.from("email_accounts").select("id")
        .eq("id", accountId).eq("user_id", user.id).maybeSingle();
      if (!account) return json({ error: "Akun email tidak ditemukan." }, 404);
      await admin.from("gmail_mailbox_connections").delete()
        .eq("email_account_id", accountId).eq("user_id", user.id);
      return json({ ok: true });
    }
    return json({ error: "Action tidak dikenal." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
    return json({ error: message }, 400);
  }
});
