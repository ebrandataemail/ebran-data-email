// Server-only, provider-agnostic AI adapter.
// No Lovable gateway or Lovable API key is used.
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

export function createAiModel() {
  const baseURL = process.env["AI_BASE_URL"]?.trim();
  const apiKey = process.env["AI_API_KEY"]?.trim();
  const modelId = process.env["AI_MODEL"]?.trim();

  if (!baseURL || !apiKey || !modelId) {
    throw new AiError(
      503,
      "AI provider belum dikonfigurasi. Hubungkan provider eksternal melalui AI_BASE_URL, AI_API_KEY, dan AI_MODEL di server.",
    );
  }

  const provider = createOpenAI({
    baseURL,
    apiKey,
  });

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
  console.error("[AI provider]", error);
  const status = findApiCallError(error)?.statusCode ?? 500;
  switch (status) {
    case 400:
      return new AiError(400, "Permintaan ke AI tidak valid. Periksa prompt dan konteks.");
    case 401:
      return new AiError(401, "Kredensial provider AI eksternal tidak valid.");
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
