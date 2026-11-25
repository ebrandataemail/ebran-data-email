// Server-only OpenAI adapter. OpenAI credentials live only in Supabase Edge Function Secrets.
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "ai";

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiError";
  }
}

const SUPABASE_URL =
  process.env["SUPABASE_URL"] || "https://trqneozkhcswmiwhtdvc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_vsctG36gRKl4B9WU8eQqwg_Z3IxU5_y";

export function createAiModel(userAccessToken?: string) {
  const modelId = process.env["AI_MODEL"]?.trim() || "gpt-4.1";

  // User-facing chat uses the authenticated Supabase Edge Function proxy.
  // The OpenAI key is never sent to this server or browser.
  if (userAccessToken) {
    const provider = createOpenAI({
      baseURL: `${SUPABASE_URL}/functions/v1/ai-gateway/v1`,
      apiKey: "supabase-edge-proxy",
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${userAccessToken}`);
        headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
        return fetch(input, { ...init, headers });
      },
    });
    return { model: provider.chat(modelId) };
  }

  // Legacy server-only path retained temporarily for internal AI helpers until
  // their authenticated server-function context is threaded into this adapter.
  const baseURL = process.env["AI_BASE_URL"]?.trim() || "https://api.openai.com/v1";
  const apiKey = process.env["AI_API_KEY"]?.trim();
  if (!apiKey) {
    throw new AiError(503, "AI belum dikonfigurasi. Jalur AI utama menggunakan Supabase Edge Function.");
  }
  const provider = createOpenAI({ baseURL, apiKey });
  return { model: provider.chat(modelId) };
}

function findApiCallError(error: unknown, depth = 0): APICallError | undefined {
  if (!error || depth > 5) return undefined;
  if (APICallError.isInstance(error)) return error;
  const value = error as { cause?: unknown; lastError?: unknown; errors?: unknown[] };
  return (
    findApiCallError(value.lastError, depth + 1) ??
    findApiCallError(value.cause, depth + 1) ??
    (Array.isArray(value.errors) ? findApiCallError(value.errors.at(-1), depth + 1) : undefined)
  );
}

export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const apiError = findApiCallError(error);
  // Plain app errors (validation, missing data) keep their readable message.
  if (!apiError && error instanceof Error && error.name === "Error" && error.message && error.message.length < 300) {
    return new AiError(400, error.message);
  }
  console.error("[AI provider]", apiError?.statusCode ?? "unknown");
  const status = apiError?.statusCode ?? 500;
  switch (status) {
    case 400:
      return new AiError(400, "Permintaan ke AI tidak valid. Periksa prompt dan konteks.");
    case 401:
      return new AiError(401, "Sesi login atau kredensial provider AI tidak valid.");
    case 402:
      return new AiError(402, "Kuota atau kredit provider AI eksternal tidak mencukupi.");
    case 403:
      return new AiError(403, "Provider AI eksternal menolak akses.");
    case 404:
      return new AiError(503, "Model AI yang dikonfigurasi tidak tersedia.");
    case 429:
      return new AiError(429, "Provider AI sedang sibuk. Coba lagi sebentar.");
    default:
      return new AiError(status >= 500 ? status : 500, "AI gagal merespons. Coba lagi.");
  }
}
