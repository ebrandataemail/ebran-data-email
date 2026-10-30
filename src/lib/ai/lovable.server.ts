// Server-only Lovable AI (Responses API) provider + safe error mapping for every AI feature.
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "ai";

export const AI_MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export type AiReasoningEffort = "low" | "medium";

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiError";
  }
}

/** Resends a gateway-issued run id on follow-up calls and captures the minted one. */
function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

/** Create the Lovable AI model for one request. The key is read on the server only. */
export function createAiModel(initialRunId?: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(503, "Lovable AI belum dikonfigurasi di server.");
  const runIdFetch = createRunIdFetch(initialRunId);
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(AI_MODEL), getRunId: runIdFetch.getRunId };
}

export function aiProviderOptions(effort: AiReasoningEffort = "medium") {
  return {
    openai: {
      forceReasoning: true,
      reasoningEffort: effort,
      reasoningSummary: "auto",
      store: false,
      include: ["reasoning.encrypted_content"],
    },
  };
}

function findApiCallError(error: unknown, depth = 0): APICallError | undefined {
  if (!error || depth > 5) return undefined;
  if (APICallError.isInstance(error)) return error;
  const e = error as { cause?: unknown; lastError?: unknown; errors?: unknown[] };
  return (
    findApiCallError(e.lastError, depth + 1) ??
    findApiCallError(e.cause, depth + 1) ??
    (Array.isArray(e.errors) ? findApiCallError(e.errors.at(-1), depth + 1) : undefined)
  );
}

function gatewayMessage(apiError: APICallError | undefined) {
  if (!apiError?.responseBody) return undefined;
  try {
    const body = JSON.parse(apiError.responseBody) as {
      message?: unknown;
      error?: { message?: unknown };
    };
    const msg = body.message ?? body.error?.message;
    return typeof msg === "string" && msg.length < 300 ? msg : undefined;
  } catch {
    return undefined;
  }
}

/** Map gateway errors to safe Indonesian messages (raw details stay in server logs). */
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  console.error("[AI]", error);
  const apiError = findApiCallError(error);
  const status = apiError?.statusCode ?? 500;
  switch (status) {
    case 400:
      return new AiError(400, "Permintaan ke AI tidak valid. Coba dengan data lain.");
    case 401:
      return new AiError(401, "Kunci Lovable AI tidak valid. Periksa konfigurasi server.");
    case 402:
      return new AiError(
        402,
        gatewayMessage(apiError) ??
          "Kredit Lovable AI habis. Tambah kredit di pengaturan workspace.",
      );
    case 403:
      return new AiError(
        403,
        gatewayMessage(apiError) ?? "Akses Lovable AI ditolak untuk permintaan ini.",
      );
    case 404:
      return new AiError(503, "Model AI sedang tidak tersedia.");
    case 429:
      return new AiError(429, "AI sedang sibuk. Coba lagi sebentar lagi.");
    default:
      return new AiError(status >= 500 ? status : 500, "AI gagal merespons. Coba lagi.");
  }
}
