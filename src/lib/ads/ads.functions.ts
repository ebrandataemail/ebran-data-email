import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteAdsAsset,
  listAdsAssets,
  revealAdsAsset,
  saveAdsAsset,
  type AdsAssetInput,
} from "./ads.server";

const uuid = (v: unknown) => {
  const s = String(v ?? "");
  if (s && !/^[0-9a-f-]{36}$/i.test(s)) throw new Error("ID tidak valid.");
  return s || null;
};

export const adsListAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listAdsAssets(context.supabase));

export const adsSaveAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdsAssetInput) => {
    if (!input.name.trim()) throw new Error("Nama wajib diisi.");
    if (!input.id && !input.value?.trim()) throw new Error("Nilai wajib diisi.");
    return {
      ...input,
      id: uuid(input.id),
      projectId: uuid(input.projectId),
      name: input.name.trim().slice(0, 120),
      description: (input.description ?? "").trim().slice(0, 500) || null,
      metadata: input.metadata || {},
    };
  })
  .handler(async ({ data, context }) => saveAdsAsset(context.supabase, context.userId, data));

export const adsRevealAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(uuid(input?.id)) }))
  .handler(async ({ data, context }) => revealAdsAsset(context.supabase, data.id));

export const adsDeleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(uuid(input?.id)) }))
  .handler(async ({ data, context }) => deleteAdsAsset(context.supabase, data.id));
