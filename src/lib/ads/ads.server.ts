import type { Database, Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "../vault/crypto.server";
type Db = SupabaseClient<Database>;
export type AdsPlatform = "meta" | "google" | "tiktok" | "youtube" | "other";
export type AdsAssetType = AdsPlatform;
export type AdsEnvironment = "production" | "staging" | "development" | "local" | "other";
export type AdsStatus = "active" | "inactive" | "expired" | "revoked" | "maintenance" | "draft";
export type AdsAssetInput = {
  id: string | null;
  platform: AdsPlatform;
  name: string;
  value?: string | null;
  accountIdentifier?: string | null;
  websiteUrl?: string | null;
  environment?: AdsEnvironment;
  status?: AdsStatus;
  expiresAt?: string | null;
  description: string | null;
  projectId: string | null;
  metadata: Record<string, unknown>;
};
export interface AdsAsset {
  id: string;
  platform: AdsPlatform;
  name: string;
  accountIdentifier: string | null;
  websiteUrl: string | null;
  environment: AdsEnvironment;
  status: AdsStatus;
  expiresAt: string | null;
  hasValue: boolean;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}
export async function listAdsAssets(db: Db): Promise<AdsAsset[]> {
  const { data, error } = await db
    .from("ads_assets")
    .select(
      "id,platform,name,account_identifier,website_url,environment,status,expires_at,description,project_id,metadata,updated_at,created_at,projects(id,name,clients(id,name))",
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[ads assets list]", error);
    throw new Error("Gagal memuat aset Ads & Marketing.");
  }
  return (data ?? []).map((row) => {
    const relation = row.projects as unknown as
      | { id: string; name: string; clients?: { id: string; name: string } | null }
      | { id: string; name: string; clients?: { id: string; name: string } | null }[]
      | null;
    const project = Array.isArray(relation) ? relation[0] : relation;
    return {
      id: row.id,
      platform: row.platform as AdsPlatform,
      name: row.name,
      accountIdentifier: row.account_identifier,
      websiteUrl: row.website_url,
      environment: row.environment as AdsEnvironment,
      status: row.status as AdsStatus,
      expiresAt: row.expires_at,
      hasValue: true,
      description: row.description,
      projectId: row.project_id,
      projectName: project?.name ?? null,
      clientName: project?.clients?.name ?? null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  });
}
export async function saveAdsAsset(db: Db, userId: string, input: AdsAssetInput) {
  const payload: Database["public"]["Tables"]["ads_assets"]["Update"] = {
    user_id: userId,
    platform: input.platform,
    name: input.name,
    account_identifier: input.accountIdentifier || null,
    website_url: input.websiteUrl || null,
    environment: input.environment ?? "production",
    status: input.status ?? "active",
    expires_at: input.expiresAt || null,
    description: input.description,
    project_id: input.projectId,
    metadata: (input.metadata ?? {}) as Json,
  };
  if (input.value?.length) payload.value_enc = await encryptSecret(input.value);
  if (input.id) {
    const { data, error } = await db
      .from("ads_assets")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("[ads assets update]", error);
      throw new Error("Aset iklan tidak ditemukan atau gagal diperbarui.");
    }
    return { id: data.id };
  }
  if (!input.value?.length) throw new Error("Kredensial wajib diisi untuk aset baru.");
  const insertPayload: Database["public"]["Tables"]["ads_assets"]["Insert"] = {
    ...payload,
    name: input.name,
    platform: input.platform,
    value_enc: await encryptSecret(input.value),
  };
  const { data, error } = await db.from("ads_assets").insert(insertPayload).select("id").single();
  if (error || !data) {
    console.error("[ads assets insert]", error);
    throw new Error("Gagal menyimpan aset Ads & Marketing.");
  }
  return { id: data.id };
}
export async function revealAdsAsset(db: Db, id: string) {
  const { data, error } = await db
    .from("ads_assets")
    .select("value_enc")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.value_enc) throw new Error("Aset tidak ditemukan atau tidak dapat diakses.");
  return { value: await decryptSecret(data.value_enc) };
}
export async function deleteAdsAsset(db: Db, id: string) {
  const { data, error } = await db
    .from("ads_assets")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Aset tidak ditemukan atau gagal dihapus.");
  return { ok: true };
}
