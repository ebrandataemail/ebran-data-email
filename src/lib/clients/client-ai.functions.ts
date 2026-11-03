import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toAiError } from "@/lib/ai/lovable.server";
import type { ClientAiCard, ClientAiMode, SocialPlatform } from "./client-ai-shared";
import {
  buildClientProfile,
  generateClientCard,
  loadClientBrief,
  saveClientProfile,
} from "./client-ai.server";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];
const MODES: ClientAiMode[] = ["file", "url", "social", "prompt"];
const CARDS: ClientAiCard[] = ["brand", "about", "rules", "notes"];
const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "facebook"];

const uuidOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const id = String(value);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("ID client tidak valid.");
  return id;
};

/** Run an AI step and turn provider/network failures into a safe Indonesian message. */
async function safely<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    throw new Error(toAiError(error).message);
  }
}

/**
 * AI Profile Builder. With a clientId the result is saved directly to that client;
 * without one (the "Tambah Client" form) it is only returned to fill the form.
 */
export const aiClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      clientId?: string | null;
      mode: ClientAiMode;
      text?: string;
      platform?: SocialPlatform;
      file?: { fileName: string; mediaType: string; base64: string } | null;
    }) => {
      const mode = MODES.includes(input?.mode) ? input.mode : "prompt";
      const platform = PLATFORMS.includes(input?.platform as SocialPlatform)
        ? (input.platform as SocialPlatform)
        : "instagram";
      let file: { fileName: string; mediaType: string; base64: string } | null = null;
      if (mode === "file") {
        const mediaType = String(input?.file?.mediaType ?? "");
        const base64 = String(input?.file?.base64 ?? "");
        if (!FILE_TYPES.includes(mediaType))
          throw new Error("Format file belum didukung. Gunakan PDF, JPG, PNG, atau TXT.");
        if (!base64) throw new Error("File kosong.");
        if (base64.length * 0.75 > MAX_FILE_BYTES) throw new Error("File terlalu besar (maks. 8 MB).");
        file = { fileName: String(input?.file?.fileName ?? "dokumen").slice(0, 200), mediaType, base64 };
      }
      return {
        clientId: uuidOrNull(input?.clientId),
        mode,
        platform,
        text: String(input?.text ?? "").slice(0, 3000),
        file,
      };
    },
  )
  .handler(async ({ data, context }) =>
    safely(async () => {
      const brief = data.clientId
        ? await loadClientBrief(context.supabase, context.userId, data.clientId)
        : null;
      if (data.clientId && !brief) throw new Error("Client tidak ditemukan.");
      const result = await buildClientProfile({ ...data, brief });
      if (data.clientId) {
        await saveClientProfile(context.supabase, context.userId, data.clientId, result.profile, true);
      }
      return { ...result, saved: Boolean(data.clientId) };
    }),
  );

/** One AI button on a profile card: generate that card's fields and save them directly. */
export const aiClientCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { clientId: string; card: ClientAiCard }) => {
    const clientId = uuidOrNull(input?.clientId);
    if (!clientId) throw new Error("ID client tidak valid.");
    if (!CARDS.includes(input?.card)) throw new Error("Kartu tidak dikenal.");
    return { clientId, card: input.card };
  })
  .handler(async ({ data, context }) =>
    safely(async () => {
      const brief = await loadClientBrief(context.supabase, context.userId, data.clientId);
      if (!brief) throw new Error("Client tidak ditemukan.");
      const result = await generateClientCard(data.card, brief);
      await saveClientProfile(context.supabase, context.userId, data.clientId, result.fields, false);
      return { card: data.card, sources: result.sources };
    }),
  );
