import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "ai";

export const HERMES_MODEL =
  process.env["OPENAI_MODEL"] || "gpt-4.1-mini";

export type HermesReasoningEffort = "low" | "medium";

/**
 * Standardized Hermes error.
 */
export class HermesError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HermesError";
  }
}

/**
 * Create the official OpenAI Responses model.
 * API key is read only on the server.
 * No Lovable gateway or Run ID dependency.
 */
export function createHermesModel() {
  const apiKey = process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    throw new HermesError(
      503,
      "OpenAI API belum dikonfigurasi di server."
    );
  }

  const provider = createOpenAI({
    apiKey,
  });

  return {
    model: provider.responses(HERMES_MODEL),
  };
}

/**
 * OpenAI provider options.
 * Reasoning is not exposed to the frontend.
 */
export function hermesProviderOptions(
  _effort: HermesReasoningEffort = "medium"
) {
  return {
    openai: {
      store: false,
    },
  };
}

/**
 * Find an OpenAI API error nested inside another error.
 */
function findApiCallError(
  error: unknown,
  depth = 0
): APICallError | undefined {
  if (!error || depth > 5) {
    return undefined;
  }

  if (APICallError.isInstance(error)) {
    return error;
  }

  const e = error as {
    cause?: unknown;
    lastError?: unknown;
    errors?: unknown[];
  };

  return (
    findApiCallError(e.lastError, depth + 1) ??
    findApiCallError(e.cause, depth + 1) ??
    (Array.isArray(e.errors)
      ? findApiCallError(e.errors.at(-1), depth + 1)
      : undefined)
  );
}

/**
 * Extract a safe upstream error message.
 */
function safeOpenAIMessage(
  err: APICallError
): string | undefined {
  try {
    const body = JSON.parse(err.responseBody ?? "") as {
      message?: unknown;
      error?: {
        message?: unknown;
      };
    };

    const message =
      body.error?.message ?? body.message;

    return (
      typeof message === "string" &&
      message.length < 400
    )
      ? message
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Convert OpenAI errors into safe Indonesian messages.
 */
export function toHermesError(
  error: unknown
): HermesError {
  if (error instanceof HermesError) {
    return error;
  }

  // Log server-side only. Never return raw error details to the client.
  console.error("[Hermes OpenAI]", error);

  const apiError = findApiCallError(error);
  const status = apiError?.statusCode ?? 500;

  switch (status) {
    case 400:
      return new HermesError(
        400,
        "Permintaan ke Hermes tidak valid. Coba dengan data lain."
      );

    case 401:
      return new HermesError(
        401,
        "Kunci OpenAI API tidak valid. Periksa konfigurasi server."
      );

    case 403:
      return new HermesError(
        403,
        "Akses OpenAI API ditolak. Periksa izin dan konfigurasi proyek."
      );

    case 404:
      return new HermesError(
        503,
        "Model OpenAI tidak tersedia. Periksa konfigurasi OPENAI_MODEL."
      );

    case 429:
      return new HermesError(
        429,
        "Batas penggunaan OpenAI tercapai atau Hermes sedang sibuk. Coba lagi nanti."
      );

    default:
      return new HermesError(
        status >= 500 ? status : 500,
        "Hermes AI gagal merespons. Coba lagi."
      );
  }
}
