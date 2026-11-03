import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AI_FILE_TYPES,
  AI_SCOPES,
  MAX_AI_FILE_BYTES,
  draftNewClient,
  generateClientProfile,
  type AiScope,
  type AiSource,
} from "./client-ai.server";

const UUID = /^[0-9a-f-]{36}$/i;

function cleanSource(input: Record<string, unknown> | undefined): AiSource {
  const url = String(input?.url ?? "").trim().slice(0, 500);
  const social = String(input?.social ?? "").trim().slice(0, 200);
  const instruction = String(input?.instruction ?? "").trim().slice(0, 2000);
  let file: AiSource["file"];
  const raw = input?.file as { name?: unknown; mediaType?: unknown; base64?: unknown } | undefined;
  if (raw?.base64) {
    const mediaType = String(raw.mediaType ?? "");
    const base64 = String(raw.base64);
    if (!AI_FILE_TYPES.includes(mediaType)) {
      throw new Error("Format file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, atau TXT.");
    }
    if (base64.length * 0.75 > MAX_AI_FILE_BYTES) throw new Error("File terlalu besar (maks. 8 MB).");
    file = { name: String(raw.name ?? "file").slice(0, 200), mediaType, base64 };
  }
  return {
    url: url || undefined,
    social: social || undefined,
    instruction: instruction || undefined,
    file,
  };
}

/** Generate (but do not save) a brand profile for an existing client the user owns. */
export const aiGenerateClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: Record<string, unknown>) => {
    const clientId = String(input?.clientId ?? "");
    if (!UUID.test(clientId)) throw new Error("Client tidak valid.");
    const scope = String(input?.scope ?? "all") as AiScope;
    if (!AI_SCOPES.includes(scope)) throw new Error("Cakupan AI tidak valid.");
    return { clientId, scope, ...cleanSource(input) };
  })
  .handler(async ({ data, context }) =>
    generateClientProfile(context.supabase, context.userId, data),
  );

/** Generate (but do not save) a draft for a brand-new client from a name/URL/prompt. */
export const aiDraftNewClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: Record<string, unknown>) => {
    const prompt = String(input?.prompt ?? "").trim().slice(0, 1000);
    const source = cleanSource(input);
    if (!prompt && !source.url && !source.file && !source.instruction) {
      throw new Error("Isi nama client, URL, atau instruksi terlebih dahulu.");
    }
    return { prompt, ...source };
  })
  .handler(async ({ data }) => draftNewClient(data));
