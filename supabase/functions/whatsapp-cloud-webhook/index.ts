import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((part) => part.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(rawBody: string, signature: string, appSecret: string) {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(digest).map((part) => part.toString(16).padStart(2, "0")).join("");
  const supplied = signature.slice(7).toLowerCase();
  let mismatch = expected.length ^ supplied.length;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  return mismatch === 0;
}

function messageText(message: Record<string, any>) {
  const type = String(message.type ?? "unknown");
  if (type === "text") return String(message.text?.body ?? "");
  if (type === "button") return String(message.button?.text ?? "");
  if (type === "interactive") {
    const interactive = message.interactive ?? {};
    return String(interactive.button_reply?.title ?? interactive.list_reply?.title ?? "");
  }
  if (["image", "document", "video"].includes(type)) {
    const media = message[type] ?? {};
    return String(media.caption ?? "[Pesan WhatsApp berisi " + type + " tanpa caption; media belum diunduh.]");
  }
  if (type === "audio" || type === "voice") return "[Pesan suara WhatsApp diterima. Media belum diunduh atau ditranskripsikan.]";
  if (type === "location") {
    const location = message.location ?? {};
    return "Lokasi WhatsApp: " + [location.name, location.address, location.latitude, location.longitude].filter(Boolean).join(", ");
  }
  if (type === "contacts") return "Kontak WhatsApp dibagikan: " + JSON.stringify(message.contacts ?? []);
  return "[Pesan WhatsApp tipe " + type + " diterima.]";
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const endpointId = url.searchParams.get("endpoint_id") ?? "";
    const mode = url.searchParams.get("hub.mode");
    const verifyToken = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (!endpointId || mode !== "subscribe" || !verifyToken || !challenge) return new Response("Forbidden", { status: 403 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return new Response("Webhook service is not configured", { status: 503 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: endpoint } = await db.from("task_integration_endpoints").select("id")
      .eq("id", endpointId).eq("source_type", "whatsapp").eq("enabled", true)
      .eq("token_hash", await sha256(verifyToken)).maybeSingle();
    return endpoint ? new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } }) : new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const endpointId = new URL(req.url).searchParams.get("endpoint_id") ?? "";
  if (!endpointId) return json(400, { error: "Missing endpoint_id" });

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) return json(413, { error: "Payload exceeds 1 MB" });
  const rawBody = await req.text();
  if (rawBody.length > 1024 * 1024) return json(413, { error: "Payload exceeds 1 MB" });

  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) return json(503, { error: "WhatsApp webhook belum dikonfigurasi: WHATSAPP_APP_SECRET belum tersedia." });
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!await verifySignature(rawBody, signature, appSecret)) return json(401, { error: "Invalid WhatsApp webhook signature" });

  let payload: Record<string, any>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { error: "JSON object required" });
    payload = parsed;
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Webhook service is not configured" });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: endpoint, error: endpointError } = await db.from("task_integration_endpoints")
    .select("id,user_id,client_id,project_id,endpoint_name")
    .eq("id", endpointId).eq("source_type", "whatsapp").eq("enabled", true).maybeSingle();
  if (endpointError || !endpoint) return json(404, { error: "WhatsApp endpoint not found or disabled" });

  const incoming: Array<{ message: Record<string, any>; contact?: Record<string, any>; phoneNumberId?: string }> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const contacts = value.contacts ?? [];
      for (const message of value.messages ?? []) {
        const contact = contacts.find((item: Record<string, any>) => item.wa_id === message.from);
        incoming.push({ message, contact, phoneNumberId: value.metadata?.phone_number_id });
      }
    }
  }

  let accepted = 0;
  let duplicates = 0;
  for (const item of incoming) {
    const message = item.message;
    const externalId = String(message.id ?? "").slice(0, 240);
    if (!externalId) continue;
    const { data: event, error: eventError } = await db.from("task_webhook_events").insert({
      endpoint_id: endpoint.id, user_id: endpoint.user_id, external_event_id: externalId,
    }).select("id").single();
    if (eventError?.code === "23505") { duplicates++; continue; }
    if (eventError || !event) continue;

    const senderName = String(item.contact?.profile?.name ?? message.from ?? "Kontak WhatsApp").slice(0, 120);
    const type = String(message.type ?? "unknown");
    const extractedText = messageText(message).slice(0, 24000);
    const { data: source, error: sourceError } = await db.from("task_intake_sources").insert({
      user_id: endpoint.user_id, client_id: endpoint.client_id, project_id: endpoint.project_id,
      source_type: "chat", source_label: "WhatsApp · " + senderName,
      extracted_text: extractedText,
      metadata: {
        integration_source: "whatsapp", provider_message_id: externalId, sender_phone: String(message.from ?? ""),
        sender_name: senderName, message_type: type, message_timestamp: message.timestamp ?? null,
        phone_number_id: item.phoneNumberId ?? null, media_id: message[type]?.id ?? null,
        received_via: "whatsapp-cloud-webhook",
      },
      status: "received",
    }).select("id").single();
    if (sourceError || !source) {
      await db.from("task_webhook_events").delete().eq("id", event.id);
      continue;
    }
    const { data: run, error: runError } = await db.from("task_generation_runs").insert({
      user_id: endpoint.user_id, source_id: source.id, status: "queued", prompt_version: "task-generator-v1",
    }).select("id").single();
    if (runError || !run) {
      await db.from("task_webhook_events").delete().eq("id", event.id);
      await db.from("task_intake_sources").delete().eq("id", source.id);
      continue;
    }
    await db.from("task_webhook_events").update({ source_id: source.id }).eq("id", event.id);
    accepted++;
  }

  if (accepted > 0) {
    await db.from("task_integration_endpoints").update({ last_received_at: new Date().toISOString() }).eq("id", endpoint.id);
  }
  return json(200, { accepted: true, queued: accepted, duplicates, ignored: incoming.length - accepted - duplicates });
});
