import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteAdsAsset, listAdsAssets, revealAdsAsset, saveAdsAsset, type AdsAssetInput } from "./ads.server";
const uuid = (value: unknown) => {
  const id = String(value ?? "").trim();
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("ID tidak valid.");
  return id;
};
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const platforms = ["meta","google","tiktok","youtube","other"] as const;
const environments = ["production","staging","development","local","other"] as const;
const statuses = ["active","inactive","expired","revoked","maintenance","draft"] as const;
export const adsListAssets = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => listAdsAssets(context.supabase));
export const adsSaveAsset = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: AdsAssetInput) => {
    const name = text(input?.name, 120);
    const platform = platforms.includes(input?.platform) ? input.platform : null;
    const environment = environments.includes(input?.environment ?? "production") ? (input?.environment ?? "production") : null;
    const status = statuses.includes(input?.status ?? "active") ? (input?.status ?? "active") : null;
    const value = typeof input?.value === "string" ? input.value : "";
    const websiteUrl = text(input?.websiteUrl, 500);
    if (!name) throw new Error("Nama aset wajib diisi.");
    if (!platform) throw new Error("Platform iklan tidak valid.");
    if (!input?.id && !value.length) throw new Error("Kredensial wajib diisi untuk aset baru.");
    if (value.length > 12000) throw new Error("Nilai kredensial terlalu panjang.");
    if (websiteUrl) { try { const url = new URL(websiteUrl); if (!["http:","https:"].includes(url.protocol)) throw new Error(); } catch { throw new Error("URL dashboard harus menggunakan HTTP atau HTTPS."); } }
    const expiresAt = input?.expiresAt ? String(input.expiresAt) : "";
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) throw new Error("Tanggal kedaluwarsa tidak valid.");
    const metadata = input?.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {};
    return { id: uuid(input?.id), platform, name, value: value || null,
      accountIdentifier: text(input?.accountIdentifier, 180) || null, websiteUrl: websiteUrl || null,
      environment: environment!, status: status!, expiresAt: expiresAt || null,
      description: text(input?.description, 1000) || null, projectId: uuid(input?.projectId), metadata };
  }).handler(async ({ data, context }) => saveAdsAsset(context.supabase, context.userId, data));
export const adsRevealAsset = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { const id = uuid(input?.id); if (!id) throw new Error("ID aset tidak valid."); return { id }; })
  .handler(async ({ data, context }) => revealAdsAsset(context.supabase, data.id));
export const adsDeleteAsset = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { const id = uuid(input?.id); if (!id) throw new Error("ID aset tidak valid."); return { id }; })
  .handler(async ({ data, context }) => deleteAdsAsset(context.supabase, data.id));
