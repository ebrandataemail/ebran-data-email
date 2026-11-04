// Streaming AI chat handler:
// authenticates the user, loads only their own conversation,
// streams the Lovable AI response, and saves both messages to the database.

import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createIdGenerator, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { asset } from "@/data/asset";
import { createAiModel, toAiError } from "@/lib/ai/provider.server";
import { chatInstructions } from "./assistant.server";
import { buildAssetBrief } from "./context";
import { redactSecrets } from "@/lib/clients/client-ai-shared";
import { loadClientBrief } from "@/lib/clients/client-ai.server";

const HISTORY_LIMIT = 40;

function json(status: number, error: string) {
  return Response.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function authenticate(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) return null;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token || token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);

        return fetch(input, {
          ...init,
          headers,
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) return null;

  return {
    supabase,
    userId: data.claims.sub,
  };
}

function isUserMessage(value: unknown): value is UIMessage {
  const message = value as UIMessage | undefined;

  return (
    !!message &&
    typeof message.id === "string" &&
    message.id.length > 0 &&
    message.id.length <= 100 &&
    message.role === "user" &&
    Array.isArray(message.parts) &&
    message.parts.length > 0 &&
    message.parts.every(
      (part) => part.type === "text" && typeof part.text === "string" && part.text.length <= 4000,
    )
  );
}

export async function handleAiChat(request: Request) {
  // 1. Authenticate the current user.
  const auth = await authenticate(request);

  if (!auth) {
    return json(401, "Sesi berakhir. Silakan masuk lagi.");
  }

  // 2. Validate the incoming request.
  let body: {
    assetId?: unknown;
    message?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return json(400, "Permintaan tidak valid.");
  }

  if (!isUserMessage(body.message)) {
    return json(400, "Pesan tidak valid.");
  }

  const assetId = String(body.assetId || "");
  const message = body.message;

  // 2b. Fetch the authenticated user's complete workspace context for Tanya AI.
  let brief: Record<string, unknown> | null = null;

  if (assetId === "workspace") {
    const [
      clientsResult,
      brandProfilesResult,
      brandAssetsResult,
      projectsResult,
      tasksResult,
      assetsResult,
      documentsResult,
      timelineResult,
    ] = await Promise.all([
      auth.supabase
        .from("clients")
        .select(
          "id,name,legal_name,industry,contact_email,contact_phone,website,address,city,description,client_status,company_profile,scope_of_work,created_at,updated_at",
        )
        .eq("user_id", auth.userId)
        .order("name")
        .limit(100),
      (auth.supabase.from("client_brand_profiles" as any) as any)
        .select("client_id,primary_color,secondary_color,tone_of_voice,company_overview,pain_points,agency_goals,do_rules,dont_rules,important_notes,vault_notes,tags,service_priority"),
      auth.supabase
        .from("client_brand_assets")
        .select("id,client_id,asset_type,name,value,notes,created_at")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(300),
      auth.supabase
        .from("projects")
        .select("id,client_id,name,description,status,created_at,updated_at")
        .eq("user_id", auth.userId)
        .order("name")
        .limit(200),
      auth.supabase
        .from("client_tasks")
        .select("id,client_id,title,description,status,priority,due_date,assignee,updated_at")
        .eq("user_id", auth.userId)
        .order("updated_at", { ascending: false })
        .limit(300),
      auth.supabase
        .from("client_digital_assets")
        .select(
          "id,client_id,asset_name,asset_type,platform,asset_url,username,owner_email,notes,created_at",
        )
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(300),
      auth.supabase
        .from("client_documents")
        .select(
          "id,client_id,title,document_type,file_name,mime_type,file_size,document_date,expiry_date,notes,created_at",
        )
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(200),
      auth.supabase
        .from("client_timeline_events")
        .select("id,client_id,event_type,title,description,occurred_at,metadata")
        .eq("user_id", auth.userId)
        .order("occurred_at", { ascending: false })
        .limit(300),
    ]);

    const errors = [
      clientsResult.error,
      brandProfilesResult.error,
      brandAssetsResult.error,
      projectsResult.error,
      tasksResult.error,
      assetsResult.error,
      documentsResult.error,
      timelineResult.error,
    ].filter(Boolean);
    if (errors.length) {
      console.error("[AI workspace context]", errors);
      return json(500, "Gagal memuat konteks workspace untuk AI.");
    }

    const clients = clientsResult.data ?? [];
    const brandProfiles = brandProfilesResult.data ?? [];
    const brandAssets = brandAssetsResult.data ?? [];
    const projects = projectsResult.data ?? [];
    const byClient = <T extends { client_id: string | null }>(rows: T[], clientId: string) =>
      rows.filter((row) => row.client_id === clientId);
    brief = {
      type: "workspace",
      sourceOfTruth: "Supabase workspace tables",
      totals: {
        clients: clients.length,
        projects: projects.length,
        tasks: tasksResult.data?.length ?? 0,
        digitalAssets: assetsResult.data?.length ?? 0,
        brandSources: brandAssets.length,
        documents: documentsResult.data?.length ?? 0,
        timelineEvents: timelineResult.data?.length ?? 0,
      },
      clients: clients.map((client) => ({
        ...client,
        brandProfile: brandProfiles.find((profile: any) => profile.client_id === client.id) ?? null,
        brandSources: byClient(brandAssets, client.id),
        projects: byClient(projects, client.id),
        tasks: byClient(tasksResult.data ?? [], client.id),
        digitalAssets: byClient(assetsResult.data ?? [], client.id).map((item) => ({
          ...item,
          notes: redactSecrets(item.notes),
        })),
        documents: byClient(documentsResult.data ?? [], client.id),
        timeline: byClient(timelineResult.data ?? [], client.id),
      })),
      unassignedProjects: projects.filter((project) => !project.client_id),
      consistencyNote:
        "Gunakan client_id sebagai relasi utama. Status proyek mengikuti active/paused/archived; status task mengikuti things-to-do/queue-on-process/on-process/pending/revision/finished/cancel. Jangan menyamakan kedua jenis status.",
      securityNote:
        "Konteks ini hanya memuat metadata operasional. Password, encrypted values, API secrets, token, dan kode 2FA tidak pernah dimuat.",
    };
  } else if (assetId.startsWith("client:")) {
    // One saved conversation per client; context is loaded server-side and secrets are masked.
    const clientId = assetId.slice("client:".length);
    if (!/^[0-9a-f-]{36}$/i.test(clientId)) return json(400, "Client tidak valid.");
    try {
      brief = await loadClientBrief(auth.supabase, auth.userId, clientId);
    } catch {
      return json(500, "Gagal memuat data client untuk AI.");
    }
  } else if (assetId === asset.id) {
    // Dummy asset fallback (legacy/home page)
    brief = buildAssetBrief();
  } else {
    // Try email accounts
    const { data: acc } = await auth.supabase
      .from("email_accounts")
      .select("email, lovable_status, usage_tag, note, updated_at, projects(id, name)")
      .eq("id", assetId)
      .eq("user_id", auth.userId)
      .single();

    if (acc) {
      const linkedProject = acc.projects as unknown as
        { id: string; name: string } | { id: string; name: string }[] | null;
      const projectNames = Array.isArray(linkedProject)
        ? linkedProject.map((project) => project.name)
        : linkedProject
          ? [linkedProject.name]
          : [];
      brief = {
        type: "email_account",
        email: acc.email,
        status: acc.lovable_status,
        tag: acc.usage_tag,
        note: acc.note,
        projects: projectNames,
        updatedAt: acc.updated_at,
      };
    } else {
      // Try developer assets
      const { data: dev } = await auth.supabase
        .from("developer_assets")
        .select(
          "id, type, name, description, provider, website_url, username, environment, status, expires_at, updated_at, projects(id, name, clients(id, name))",
        )
        .eq("id", assetId)
        .eq("user_id", auth.userId)
        .single();

      if (dev) {
        const project = dev.projects as unknown as {
          id: string;
          name: string;
          clients?: { id: string; name: string } | null;
        } | null;
        brief = {
          type: "developer_asset",
          assetType: dev.type,
          name: dev.name,
          description: dev.description,
          provider: dev.provider,
          websiteUrl: dev.website_url,
          username: dev.username,
          environment: dev.environment,
          status: dev.status,
          expiresAt: dev.expires_at,
          projectName: project?.name,
          clientName: project?.clients?.name ?? null,
          updatedAt: dev.updated_at,
        };
      }
      if (!brief) {
        // Ads & Marketing context contains operational metadata only, never encrypted credentials.
        const { data: ads } = await auth.supabase
          .from("ads_assets")
          .select(
            "id, platform, name, account_identifier, website_url, environment, status, expires_at, description, updated_at, projects(id, name, clients(id, name))",
          )
          .eq("id", assetId)
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (ads) {
          const linkedProject = ads.projects as unknown as
            | { id: string; name: string; clients?: { id: string; name: string } | null }
            | { id: string; name: string; clients?: { id: string; name: string } | null }[]
            | null;
          const project = Array.isArray(linkedProject) ? linkedProject[0] : linkedProject;
          brief = {
            type: "ads_marketing_asset",
            platform: ads.platform,
            name: ads.name,
            accountIdentifier: ads.account_identifier,
            websiteUrl: ads.website_url,
            environment: ads.environment,
            status: ads.status,
            expiresAt: ads.expires_at,
            description: ads.description,
            projectName: project?.name ?? null,
            clientName: project?.clients?.name ?? null,
            updatedAt: ads.updated_at,
          };
        }
      }
    }
  }

  if (!brief) {
    return json(404, "Aset tidak ditemukan atau tidak dapat diakses.");
  }

  // 3. Load only this user's conversation history.
  const { data: rows, error: historyError } = await auth.supabase
    .from("ai_chat_messages")
    .select("message_id, role, parts")
    .eq("user_id", auth.userId)
    .eq("asset_id", assetId)
    .order("seq", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (historyError) {
    console.error("[AI chat] history", historyError);
    return json(500, "Gagal memuat riwayat chat.");
  }

  const history: UIMessage[] = (rows ?? [])
    .reverse()
    .filter((row) => row.message_id !== message.id)
    .map((row) => ({
      id: row.message_id,
      role: row.role as UIMessage["role"],
      parts: row.parts as UIMessage["parts"],
    }));

  // 4. Save the user's message.
  const { error: saveUserError } = await auth.supabase.from("ai_chat_messages").upsert(
    {
      user_id: auth.userId,
      asset_id: assetId,
      message_id: message.id,
      role: "user",
      parts: message.parts as never,
    },
    {
      onConflict: "user_id,asset_id,message_id",
      ignoreDuplicates: true,
    },
  );

  if (saveUserError) {
    console.error("[AI chat] save user message", saveUserError);
    return json(500, "Gagal menyimpan pesan.");
  }

  // 5. Build the conversation and stream the configured external AI response.
  const messages = [...history, message];

  try {
    const { model } = createAiModel();

    const result = streamText({
      model,
      instructions: chatInstructions(brief),
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal,
      maxRetries: 1,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,

      // Do not send internal reasoning to the frontend.
      sendReasoning: false,

      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),

      headers: {
        "Cache-Control": "no-store, no-transform",
      },

      onError: (error) => {
        return toAiError(error).message;
      },

      // 6. Save the assistant's response.
      onFinish: async ({ responseMessage, isAborted }) => {
        const hasText = responseMessage.parts.some(
          (part) =>
            part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0,
        );

        if (!hasText) return;

        const { error } = await auth.supabase.from("ai_chat_messages").insert({
          user_id: auth.userId,
          asset_id: assetId,
          message_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as never,
        });

        if (error) {
          console.error("[AI chat] save assistant message", {
            error,
            isAborted,
          });
        }
      },
    });
  } catch (error) {
    const result = toAiError(error);

    return json(result.status, result.message);
  }
}
