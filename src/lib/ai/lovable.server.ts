// Server-only Lovable AI helpers (OpenAI Responses API through the Lovable AI Gateway).
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "ai";

export const LOVABLE_AI_BASE_URL = "https://ai.gateway.lovable.dev/v1";
export const HERMES_MODEL = "openai/gpt-6-astra";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Request-scoped fetch that resends a gateway-issued run id and captures a newly minted one. */
export function createRunIdFetch(initialRunId?: string) {
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

export class HermesError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HermesError";
  }
}

export function getLovableApiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new HermesError(500, "Lovable AI belum dikonfigurasi untuk aplikasi ini.");
  return key;
}

/** Create the Responses model inside each request (never at module scope). */
export function createHermesModel(runId?: string) {
  const apiKey = getLovableApiKey();
  const runIdFetch = createRunIdFetch(runId);
  const provider = createOpenAI({
    baseURL: LOVABLE_AI_BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(HERMES_MODEL), runIdFetch };
}

export function hermesProviderOptions(effort: "low" | "medium" = "medium") {
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

function safeGatewayMessage(err: APICallError): string | undefined {
  try {
    const body = JSON.parse(err.responseBody ?? "") as { message?: unknown; error?: { message?: unknown } };
    const msg = body.error?.message ?? body.message;
    return typeof msg === "string" && msg.length < 400 ? msg : undefined;
  } catch {
    return undefined;
  }
}

/** Map any AI failure to a user-safe Indonesian message with the upstream status preserved. */
export function toHermesError(error: unknown): HermesError {
  if (error instanceof HermesError) return error;
  console.error("[Hermes AI]", error);
  const apiError = findApiCallError(error);
  const status = apiError?.statusCode ?? 500;
  const upstream = apiError ? safeGatewayMessage(apiError) : undefined;
  switch (status) {
    case 402:
      return new HermesError(402, upstream ?? "Kredit Lovable AI habis. Tambahkan kredit di pengaturan workspace.");
    case 403:
      return new HermesError(403, upstream ?? "Akses Lovable AI ditolak untuk permintaan ini.");
    case 429:
      return new HermesError(429, "Hermes sedang sibuk. Tunggu sebentar lalu coba lagi.");
    case 400:
      return new HermesError(400, "Permintaan ke Hermes tidak valid. Coba dengan data lain.");
    case 401:
      return new HermesError(401, "Kunci Lovable AI tidak valid. Hubungi admin aplikasi.");
    default:
      return new HermesError(status >= 500 ? status : 500, "Hermes AI gagal merespons. Coba lagi.");
  }
}
