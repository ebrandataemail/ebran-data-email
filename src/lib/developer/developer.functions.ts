import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteDevAsset,
  listDevAssets,
  revealDevAsset,
  saveDevAsset,
  type DevAssetInput,
  type DevAssetEnvironment,
  type DevAssetStatus,
} from "./developer.server";
import { DEV_ASSET_TYPES, DEV_ASSET_ENVIRONMENTS, DEV_ASSET_STATUSES } from "./developer.types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function optionalUuid(value: unknown) {
  if (value == null || value === "") return null;
  const id = String(value);
  if (!UUID_PATTERN.test(id)) throw new Error("ID tidak valid.");
  return id;
}
function requiredUuid(value: unknown) {
  const id = optionalUuid(value);
  if (!id) throw new Error("ID aset tidak valid.");
  return id;
}
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export const devListAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listDevAssets(context.supabase));

export const devSaveAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: DevAssetInput) => {
    const name = clean(input?.name, 120);
    if (!name) throw new Error("Nama aset wajib diisi.");
    if (!input?.id && !clean(input?.value, 20_000)) throw new Error("Nilai rahasia wajib diisi.");
    if (!DEV_ASSET_TYPES.includes(input.type)) throw new Error("Jenis aset tidak valid.");
    const environment = input.environment ?? "production";
    const status = input.status ?? "active";
    if (!DEV_ASSET_ENVIRONMENTS.includes(environment)) throw new Error("Environment tidak valid.");
    if (!DEV_ASSET_STATUSES.includes(status)) throw new Error("Status aset tidak valid.");
    const websiteUrl = clean(input.websiteUrl, 500);
    if (websiteUrl) {
      try {
        new URL(websiteUrl);
      } catch {
        throw new Error("URL website harus menggunakan format URL lengkap.");
      }
    }
    const expiresAt = clean(input.expiresAt, 10);
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt))
      throw new Error("Tanggal kedaluwarsa tidak valid.");
    const metadata =
      input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? input.metadata
        : {};
    return {
      id: optionalUuid(input.id),
      type: input.type,
      name,
      value: clean(input.value, 20_000) || null,
      provider: clean(input.provider, 120) || null,
      websiteUrl: websiteUrl || null,
      username: clean(input.username, 200) || null,
      environment,
      status,
      expiresAt: expiresAt || null,
      description: clean(input.description, 2000) || null,
      projectId: optionalUuid(input.projectId),
      metadata,
    };
  })
  .handler(async ({ data, context }) => saveDevAsset(context.supabase, context.userId, data));

export const devRevealAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: requiredUuid(input?.id) }))
  .handler(async ({ data, context }) => revealDevAsset(context.supabase, data.id));

export const devDeleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: requiredUuid(input?.id) }))
  .handler(async ({ data, context }) => deleteDevAsset(context.supabase, data.id));
