/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase table contracts are validated by the database/RLS; the server middleware currently exposes a dynamic client type. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = ["gmail","outlook","whatsapp","telegram","slack","teams","calendar","zoom","figma","github","zendesk","intercom","webhook"] as const;

export const createTaskWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { clientId: string; projectId?: string | null; sourceType: string; endpointName?: string }) => {
    if (!UUID.test(String(input?.clientId ?? ""))) throw new Error("Client wajib dipilih.");
    if (input.projectId && !UUID.test(input.projectId)) throw new Error("Project tidak valid.");
    if (!SOURCES.includes(input.sourceType as (typeof SOURCES)[number])) throw new Error("Jenis integrasi tidak didukung.");
    return { clientId: input.clientId, projectId: input.projectId ?? null, sourceType: input.sourceType,
      endpointName: String(input.endpointName ?? "Workboard incoming webhook").trim().slice(0, 120) || "Workboard incoming webhook" };
  })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const userId = context.userId;
    const { data: client, error: clientError } = await db.from("clients").select("id")
      .eq("id", data.clientId).eq("user_id", userId).maybeSingle();
    if (clientError) throw clientError;
    if (!client) throw new Error("Client tidak ditemukan atau akses ditolak.");
    if (data.projectId) {
      const { data: project, error } = await db.from("projects").select("id")
        .eq("id", data.projectId).eq("client_id", data.clientId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!project) throw new Error("Project tidak termasuk client yang dipilih.");
    }
    const random = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(random).map((value) => value.toString(16).padStart(2, "0")).join("");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
    const { data: endpoint, error } = await db.from("task_integration_endpoints").insert({
      user_id: userId, client_id: data.clientId, project_id: data.projectId,
      endpoint_name: data.endpointName, source_type: data.sourceType, token_hash: tokenHash,
    }).select("id,endpoint_name,source_type,created_at").single();
    if (error) throw error;
    const supabaseUrl = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
    if (!supabaseUrl) throw new Error("SUPABASE_URL belum dikonfigurasi di server.");
    const isWhatsApp = data.sourceType === "whatsapp";
    const webhookUrl = isWhatsApp
      ? supabaseUrl + "/functions/v1/whatsapp-cloud-webhook?endpoint_id=" + endpoint.id
      : supabaseUrl + "/functions/v1/task-intake-webhook";
    return { ...endpoint, webhookUrl,
      authorizationHeader: isWhatsApp ? null : "Bearer " + token,
      verificationToken: isWhatsApp ? token : null,
      provider: isWhatsApp ? "whatsapp_cloud_api" : "generic_webhook" };
  });

export const listPendingTaskIntakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("task_intake_sources")
      .select("id,client_id,project_id,source_type,source_label,source_uri,extracted_text,created_at,metadata")
      .eq("user_id", context.userId).eq("status", "received")
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return (data ?? []).filter((source: any) => Boolean(source.metadata?.integration_source));
  });

export const refreshTaskCopilotSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const userId = context.userId;
    const today = new Date().toISOString().slice(0, 10);
    const staleBefore = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: tasks, error } = await db.from("client_tasks")
      .select("id,client_id,title,status,due_date,created_at,priority").eq("user_id", userId)
      .not("status", "in", '("finished","cancel")').limit(500);
    if (error) throw error;
    const { data: existing, error: existingError } = await db.from("task_ai_suggestions")
      .select("task_id,suggestion_type").eq("user_id", userId).eq("status", "pending");
    if (existingError) throw existingError;
    const known = new Set((existing ?? []).map((item: any) => item.suggestion_type + ":" + (item.task_id ?? "")));
    const inserts: any[] = [];
    for (const task of tasks ?? []) {
      if (task.due_date && task.due_date < today && !known.has("overdue:" + task.id)) {
        inserts.push({ user_id: userId, client_id: task.client_id, task_id: task.id,
          suggestion_type: "overdue", title: "Periksa task yang melewati deadline",
          description: task.title + " melewati deadline " + task.due_date + ". Perbarui status atau jadwal setelah memeriksa progres.",
          evidence: { dueDate: task.due_date, status: task.status } });
      } else if (!task.due_date && task.created_at < staleBefore &&
        ["things-to-do","pending","queue-on-process"].includes(task.status) && !known.has("follow_up:" + task.id)) {
        inserts.push({ user_id: userId, client_id: task.client_id, task_id: task.id,
          suggestion_type: "follow_up", title: "Task lama perlu ditindaklanjuti",
          description: task.title + " belum memiliki deadline dan sudah tersimpan lebih dari 14 hari. Periksa apakah masih aktif dan tetapkan langkah berikutnya.",
          evidence: { createdAt: task.created_at, status: task.status } });
      }
    }
    if (inserts.length) {
      const { error: insertError } = await db.from("task_ai_suggestions").insert(inserts);
      if (insertError && insertError.code !== "23505") throw insertError;
    }
    return { created: inserts.length };
  });

export const listTaskCopilotSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("task_ai_suggestions")
      .select("id,task_id,client_id,suggestion_type,title,description,evidence,created_at")
      .eq("user_id", context.userId).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const dismissTaskCopilotSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { suggestionId: string }) => {
    if (!UUID.test(String(input?.suggestionId ?? ""))) throw new Error("Saran tidak valid.");
    return { suggestionId: input.suggestionId };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("task_ai_suggestions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", data.suggestionId).eq("user_id", context.userId).eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });


export type GmailTaskRuleInput = {
  name: string;
  emailAccountId: string;
  clientId: string;
  projectId?: string | null;
  matchMode: "any" | "all";
  subjectIncludes: string[];
  senderIncludes: string[];
  bodyIncludes: string[];
  subjectExcludes: string[];
  senderExcludes: string[];
  bodyExcludes: string[];
};

export const listGmailTaskAutomationRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("task_automation_rules")
      .select("id,name,trigger_config,enabled,last_checked_at,last_triggered_at,created_at")
      .eq("user_id", context.userId).eq("source_type", "gmail")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const createGmailTaskAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: GmailTaskRuleInput) => {
    const split = (values: unknown) => (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? "").trim().slice(0, 120)).filter(Boolean).slice(0, 20);
    const result: GmailTaskRuleInput = {
      name: String(input?.name ?? "").trim().slice(0, 100),
      emailAccountId: String(input?.emailAccountId ?? ""),
      clientId: String(input?.clientId ?? ""),
      projectId: input?.projectId ?? null,
      matchMode: input?.matchMode === "all" ? "all" : "any",
      subjectIncludes: split(input?.subjectIncludes),
      senderIncludes: split(input?.senderIncludes),
      bodyIncludes: split(input?.bodyIncludes),
      subjectExcludes: split(input?.subjectExcludes),
      senderExcludes: split(input?.senderExcludes),
      bodyExcludes: split(input?.bodyExcludes),
    };
    if (!result.name) throw new Error("Nama aturan wajib diisi.");
    if (!UUID.test(result.emailAccountId) || !UUID.test(result.clientId)) throw new Error("Pilih akun Gmail dan client yang valid.");
    if (result.projectId && !UUID.test(result.projectId)) throw new Error("Project tidak valid.");
    if (![...result.subjectIncludes, ...result.senderIncludes, ...result.bodyIncludes].length) {
      throw new Error("Isi minimal satu kriteria: subject, pengirim, atau isi email.");
    }
    return result;
  })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const userId = context.userId;
    const { data: account, error: accountError } = await db.from("email_accounts").select("id")
      .eq("id", data.emailAccountId).eq("user_id", userId).maybeSingle();
    if (accountError) throw accountError;
    if (!account) throw new Error("Akun email tidak ditemukan atau akses ditolak.");
    const { data: connection, error: connectionError } = await db.from("gmail_mailbox_connections")
      .select("email_account_id,status").eq("email_account_id", data.emailAccountId)
      .eq("user_id", userId).maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection || connection.status !== "connected") throw new Error("Hubungkan akun Gmail terlebih dahulu.");
    const { data: client, error: clientError } = await db.from("clients").select("id")
      .eq("id", data.clientId).eq("user_id", userId).maybeSingle();
    if (clientError) throw clientError;
    if (!client) throw new Error("Client tidak ditemukan atau akses ditolak.");
    if (data.projectId) {
      const { data: project, error } = await db.from("projects").select("id")
        .eq("id", data.projectId).eq("client_id", data.clientId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!project) throw new Error("Project tidak termasuk client yang dipilih.");
    }
    const { data: rule, error } = await db.from("task_automation_rules").insert({
      user_id: userId, name: data.name, source_type: "gmail", enabled: true,
      last_checked_at: new Date().toISOString(),
      trigger_config: {
        emailAccountId: data.emailAccountId, clientId: data.clientId, projectId: data.projectId,
        matchMode: data.matchMode, subjectIncludes: data.subjectIncludes, senderIncludes: data.senderIncludes,
        bodyIncludes: data.bodyIncludes, subjectExcludes: data.subjectExcludes,
        senderExcludes: data.senderExcludes, bodyExcludes: data.bodyExcludes,
      },
      action_config: { mode: "draft_for_approval", autoAnalyze: true },
    }).select("id,name,trigger_config,enabled,last_checked_at,last_triggered_at,created_at").single();
    if (error) throw error;
    return rule;
  });

export const setGmailTaskAutomationRuleEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ruleId: string; enabled: boolean }) => {
    if (!UUID.test(String(input?.ruleId ?? ""))) throw new Error("Aturan tidak valid.");
    return { ruleId: input.ruleId, enabled: Boolean(input.enabled) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("task_automation_rules")
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("id", data.ruleId).eq("user_id", context.userId).eq("source_type", "gmail");
    if (error) throw error;
    return { ok: true };
  });
