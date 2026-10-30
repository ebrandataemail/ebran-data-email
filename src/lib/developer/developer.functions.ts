import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteDevAsset,
  listDevAssets,
  revealDevAsset,
  saveDevAsset,
  type DevAssetInput,
  type DevAssetType,
} from "./developer.server";

const uuid = (v: unknown) => {
  const s = String(v ?? "");
  if (s && !/^[0-9a-f-]{36}$/i.test(s)) throw new Error("ID tidak valid.");
  return s || null;
};

export const devListAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listDevAssets(context.supabase));

export const devSaveAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DevAssetInput) => {
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
  .handler(async ({ data, context }) => saveDevAsset(context.supabase, context.userId, data));

export const devRevealAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(uuid(input?.id)) }))
  .handler(async ({ data, context }) => revealDevAsset(context.supabase, data.id));

export const devDeleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(uuid(input?.id)) }))
  .handler(async ({ data, context }) => deleteDevAsset(context.supabase, data.id));
