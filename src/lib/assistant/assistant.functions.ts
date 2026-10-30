import { createServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asset } from "@/data/asset";
import { extractDocument, formatEnv, generateNote, runAudit } from "./assistant.server";

const MAX_OCR_BYTES = 8 * 1024 * 1024;
const OCR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

const cleanAssetId = (value: unknown) => {
  const id = String(value ?? "").trim();
  if (!id || id.length > 100) throw new Error("Aset tidak ditemukan.");
  return id;
};

export const aiGenerateNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draft: string }) => ({
    draft: String(input?.draft ?? "").slice(0, 2000),
  }))
  .handler(async ({ data }) => ({ note: await generateNote(data.draft) }));

export const aiSecurityAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => runAudit());

export const aiFormatEnv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => formatEnv());

export const aiExtractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; mediaType: string; base64: string }) => {
    const fileName = String(input?.fileName ?? "dokumen").slice(0, 200);
    const mediaType = String(input?.mediaType ?? "");
    const base64 = String(input?.base64 ?? "");
    if (!OCR_TYPES.includes(mediaType))
      throw new Error("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.");
    if (!base64) throw new Error("File kosong.");
    if (base64.length * 0.75 > MAX_OCR_BYTES) throw new Error("File terlalu besar (maks. 8 MB).");
    return { fileName, mediaType, base64 };
  })
  .handler(async ({ data }) => extractDocument(data));

export const aiChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assetId: string }) => ({ assetId: cleanAssetId(input?.assetId) }))
  .handler(async ({ data, context }) => {
    let owned = data.assetId === asset.id;
    if (!owned) {
      const { data: email } = await context.supabase.from("email_accounts").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(email);
    }
    if (!owned) {
      const { data: developer } = await context.supabase.from("developer_assets").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(developer);
    }
    if (!owned) {
      const { data: ads } = await context.supabase.from("ads_assets").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(ads);
    }
    if (!owned) throw new Error("Aset tidak ditemukan atau tidak dapat diakses.");
    const { data: rows, error } = await context.supabase
      .from("ai_chat_messages")
      .select("message_id, role, parts")
      .eq("asset_id", data.assetId)
      .eq("user_id", context.userId)
      .order("seq", { ascending: true })
      .limit(200);
    if (error) {
      console.error("[AI chat history]", error);
      throw new Error("Gagal memuat riwayat chat.");
    }
    // Serialize as JSON text: UIMessage parts are free-form JSON.
    const messages = (rows ?? []).map((r) => ({
      id: r.message_id,
      role: r.role as UIMessage["role"],
      parts: r.parts as UIMessage["parts"],
    }));
    return { json: JSON.stringify(messages) };
  });

export const aiClearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assetId: string }) => ({ assetId: cleanAssetId(input?.assetId) }))
  .handler(async ({ data, context }) => {
    let owned = data.assetId === asset.id;
    if (!owned) {
      const { data: email } = await context.supabase.from("email_accounts").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(email);
    }
    if (!owned) {
      const { data: developer } = await context.supabase.from("developer_assets").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(developer);
    }
    if (!owned) {
      const { data: ads } = await context.supabase.from("ads_assets").select("id").eq("id", data.assetId).eq("user_id", context.userId).maybeSingle();
      owned = Boolean(ads);
    }
    if (!owned) throw new Error("Aset tidak ditemukan atau tidak dapat diakses.");
    const { error } = await context.supabase
      .from("ai_chat_messages")
      .delete()
      .eq("asset_id", data.assetId)
      .eq("user_id", context.userId);
    if (error) {
      console.error("[AI chat clear]", error);
      throw new Error("Gagal menghapus riwayat chat.");
    }
    return { ok: true };
  });
