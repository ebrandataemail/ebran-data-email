import type { Database } from "@/integrations/supabase/types";
import { encryptSecret, decryptSecret } from "../vault/crypto.server";
import { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

export type AdsPlatform = "meta" | "google" | "tiktok" | "youtube" | "other";

export type AdsAssetInput = {
  id: string | null;
  platform: AdsPlatform;
  name: string;
  value?: string | null;
  description: string | null;
  projectId: string | null;
  metadata: Record<string, unknown>;
};

export interface AdsAsset {
  id: string;
  platform: AdsPlatform;
  name: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export async function listAdsAssets(db: Db): Promise<AdsAsset[]> {
  const { data, error } = await db
    .from("ads_assets")
    .select("*, projects(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Gagal memuat aset iklan.");
  return data.map((r) => {
    const project = r.projects as unknown as { id: string; name: string } | null;
    return {
      id: r.id,
      platform: r.platform as AdsPlatform,
      name: r.name,
      description: r.description,
      projectId: r.project_id,
      projectName: project?.name ?? null,
      metadata: r.metadata as Record<string, unknown>,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    };
  });
}

export async function saveAdsAsset(db: Db, userId: string, input: AdsAssetInput) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    platform: input.platform,
    name: input.name,
    description: input.description,
    project_id: input.projectId,
    metadata: input.metadata,
  };

  if (input.value) {
    payload.value_enc = await encryptSecret(input.value);
  }

  if (input.id) {
    const { error } = await db.from("ads_assets").update(payload).eq("id", input.id);
    if (error) throw new Error("Gagal memperbarui aset iklan.");
    return { id: input.id };
  }

  if (!input.value) throw new Error("Nilai wajib diisi untuk aset baru.");
  payload.value_enc = await encryptSecret(input.value);

  const { data, error } = await db.from("ads_assets").insert(payload).select("id").single();
  if (error) throw new Error("Gagal menyimpan aset iklan.");
  return { id: data.id };
}

export async function revealAdsAsset(db: Db, id: string) {
  const { data, error } = await db.from("ads_assets").select("value_enc").eq("id", id).single();
  if (error || !data) throw new Error("Aset tidak ditemukan.");
  return { value: await decryptSecret(data.value_enc) };
}

export async function deleteAdsAsset(db: Db, id: string) {
  const { error } = await db.from("ads_assets").delete().eq("id", id);
  if (error) throw new Error("Gagal menghapus aset iklan.");
  return { ok: true };
}
