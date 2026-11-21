import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-webhook-event-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((part) => part.toString(16).padStart(2, "0")).join("");
}
function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function classify(source: string) {
  if (["gmail", "outlook"].includes(source)) return "email";
  if (["whatsapp", "telegram", "slack", "teams"].includes(source)) return "chat";
  if (["calendar", "zoom"].includes(source)) return "meeting";
  if (source === "webhook") return "webhook";
  return "integration";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32 || token.length > 256) return json(401, { error: "Invalid webhook credential" });
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) return json(413, { error: "Payload exceeds 1 MB" });
  const rawBody = await req.text();
  if (rawBody.length > 1024 * 1024) return json(413, { error: "Payload exceeds 1 MB" });
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { error: "JSON object required" });
    payload = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Webhook service is not configured" });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256(token);
  const { data: endpoint, error: endpointError } = await db.from("task_integration_endpoints")
    .select("id,user_id,client_id,project_id,source_type,endpoint_name")
    .eq("token_hash", tokenHash).eq("enabled", true).maybeSingle();
  if (endpointError || !endpoint) return json(401, { error: "Unknown or disabled webhook endpoint" });
  const externalId = textValue(payload.event_id ?? payload.id ?? req.headers.get("x-webhook-event-id") ?? crypto.randomUUID()).slice(0, 240);
  const { data: event, error: eventError } = await db.from("task_webhook_events").insert({
    endpoint_id: endpoint.id, user_id: endpoint.user_id, external_event_id: externalId,
  }).select("id").single();
  if (eventError?.code === "23505") return json(200, { accepted: true, duplicate: true, eventId: externalId });
  if (eventError || !event) return json(500, { error: "Could not record webhook event" });
  const candidate = payload.text ?? payload.body ?? payload.message ?? payload.content ??
    payload.transcript ?? payload.description ?? payload.subject ?? payload.data ?? payload;
  const extractedText = textValue(candidate).slice(0, 24000);
  const sourceUri = textValue(payload.source_url ?? payload.url ?? payload.permalink ?? "").slice(0, 2000) || null;
  const { data: source, error: sourceError } = await db.from("task_intake_sources").insert({
    user_id: endpoint.user_id, client_id: endpoint.client_id, project_id: endpoint.project_id,
    source_type: classify(endpoint.source_type), source_label: endpoint.endpoint_name + " (" + endpoint.source_type + ")",
    source_uri: sourceUri, extracted_text: extractedText,
    metadata: { integration_source: endpoint.source_type, external_event_id: externalId, received_via: "task-intake-webhook" },
    status: "received",
  }).select("id").single();
  if (sourceError || !source) {
    await db.from("task_webhook_events").delete().eq("id", event.id);
    return json(500, { error: "Could not save incoming source" });
  }
  const { data: run, error: runError } = await db.from("task_generation_runs").insert({
    user_id: endpoint.user_id, source_id: source.id, status: "queued", prompt_version: "task-generator-v1",
  }).select("id").single();
  if (runError || !run) {
    await db.from("task_webhook_events").delete().eq("id", event.id);
    await db.from("task_intake_sources").delete().eq("id", source.id);
    return json(500, { error: "Could not queue task extraction" });
  }
  await db.from("task_webhook_events").update({ source_id: source.id }).eq("id", event.id);
  await db.from("task_integration_endpoints").update({ last_received_at: new Date().toISOString() }).eq("id", endpoint.id);
  return json(202, { accepted: true, queued: true, sourceId: source.id, runId: run.id, message: "Source saved. Review and process it from Workboard." });
});
