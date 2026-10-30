// Streaming AI chat handler:
// authenticates the user, loads only their own conversation,
// streams the Lovable AI response, and saves both messages to the database.

import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createIdGenerator, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { asset } from "@/data/asset";
import { createAiModel, aiProviderOptions, toAiError } from "@/lib/ai/lovable.server";
import { chatInstructions } from "./assistant.server";

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

  // 2b. Fetch asset context for the AI.
  let brief: Record<string, unknown> | null = null;

  if (assetId === asset.id) {
    // Dummy asset fallback (legacy/home page)
    brief = buildAssetBrief();
  } else {
    // Try email accounts
    const { data: acc } = await auth.supabase
      .from("email_accounts")
       .select("*, projects(id, name, clients(id, name))")
      .eq("id", assetId)
      .eq("user_id", auth.userId)
      .single();

    if (acc) {
      brief = {
        type: "email_account",
        email: acc.email,
        status: acc.lovable_status,
        tag: acc.usage_tag,
        note: acc.note,
        projects: acc.projects.map((p) => p.name),
        updatedAt: acc.updated_at,
      };
    } else {
      // Try developer assets
      const { data: dev } = await auth.supabase
         .from("developer_assets")
        .select("id, type, name, description, provider, website_url, username, environment, status, expires_at, updated_at, projects(id, name, clients(id, name))")
        .eq("id", assetId)
        .eq("user_id", auth.userId)
        .single();

      if (dev) {
        const project = dev.projects as unknown as { id: string; name: string; clients?: { id: string; name: string } | null } | null;
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

  // 5. Build the conversation and stream the Lovable AI response.
  const messages = [...history, message];

  try {
    const { model } = createAiModel();

    const result = streamText({
      model,
      instructions: chatInstructions(brief),
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal,
      maxRetries: 1,
      providerOptions: aiProviderOptions("medium"),
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
