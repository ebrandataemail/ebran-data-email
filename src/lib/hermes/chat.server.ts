// Streaming Hermes chat handler: authenticates the bearer, loads the saved conversation,
// streams the Lovable AI answer and saves both messages to the database.
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createIdGenerator, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { asset } from "@/data/asset";
import { createHermesModel, hermesProviderOptions, toHermesError } from "@/lib/ai/lovable.server";
import { chatInstructions } from "./hermes.server";

const HISTORY_LIMIT = 40;

function json(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticate(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return null;
  const supabase = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { supabase, userId: data.claims.sub };
}

function isUserMessage(value: unknown): value is UIMessage {
  const m = value as UIMessage | undefined;
  return (
    !!m &&
    typeof m.id === "string" &&
    m.id.length <= 100 &&
    m.role === "user" &&
    Array.isArray(m.parts) &&
    m.parts.length > 0 &&
    m.parts.every((p) => p.type === "text" && typeof p.text === "string" && p.text.length <= 4000)
  );
}

export async function handleHermesChat(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return json(401, "Sesi berakhir. Silakan masuk lagi.");

  let body: { assetId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, "Permintaan tidak valid.");
  }
  if (body.assetId !== asset.id) return json(404, "Aset tidak ditemukan.");
  if (!isUserMessage(body.message)) return json(400, "Pesan tidak valid.");
  const assetId = asset.id;
  const message = body.message;

  const { data: rows, error: historyError } = await auth.supabase
    .from("hermes_chat_messages")
    .select("message_id, role, parts")
    .eq("asset_id", assetId)
    .order("seq", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (historyError) {
    console.error("[Hermes chat] history", historyError);
    return json(500, "Gagal memuat riwayat chat.");
  }
  const history: UIMessage[] = (rows ?? [])
    .reverse()
    .filter((r) => r.message_id !== message.id)
    .map((r) => ({ id: r.message_id, role: r.role as UIMessage["role"], parts: r.parts as UIMessage["parts"] }));

  const { error: saveUserError } = await auth.supabase
    .from("hermes_chat_messages")
    .upsert(
      { user_id: auth.userId, asset_id: assetId, message_id: message.id, role: "user", parts: message.parts as never },
      { onConflict: "user_id,asset_id,message_id", ignoreDuplicates: true },
    );
  if (saveUserError) {
    console.error("[Hermes chat] save user message", saveUserError);
    return json(500, "Gagal menyimpan pesan.");
  }

  const messages = [...history, message];
  try {
    const { model } = createHermesModel();
    const result = streamText({
      model,
      instructions: chatInstructions(),
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal,
      maxRetries: 1,
      providerOptions: hermesProviderOptions("medium"),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      headers: { "Cache-Control": "no-store, no-transform" },
      onError: (error) => toHermesError(error).message,
      onFinish: async ({ responseMessage, isAborted }) => {
        if (!responseMessage.parts.some((p) => p.type === "text" && p.text.trim())) return;
        const { error } = await auth.supabase.from("hermes_chat_messages").insert({
          user_id: auth.userId,
          asset_id: assetId,
          message_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as never,
        });
        if (error) console.error("[Hermes chat] save assistant message", { error, isAborted });
      },
    });
  } catch (error) {
    const e = toHermesError(error);
    return json(e.status, e.message);
  }
}
