import type { Database } from "@/integrations/supabase/types";
import { encryptSecret, decryptSecret } from "../vault/crypto.server";
import { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

export type DevAssetType =
  "api_key" | "webhook" | "env_var" | "ssh_key" | "db_connection" | "other";

export type DevAssetInput = {
  id: string | null;
  type: DevAssetType;
  name: string;
  value?: string | null;
  description: string | null;
  projectId: string | null;
  metadata: Record<string, unknown>;
};

export interface DevAsset {
  id: string;
  type: DevAssetType;
  name: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export async function listDevAssets(db: Db): Promise<DevAsset[]> {
  const { data, error } = await db
    .from("developer_assets")
    .select("*, projects(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Gagal memuat aset developer.");
  return data.map((r) => {
    const project = r.projects as unknown as { id: string; name: string } | null;
    return {
      id: r.id,
      type: r.type as DevAssetType,
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

export async function saveDevAsset(db: Db, userId: string, input: DevAssetInput) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    type: input.type,
    name: input.name,
    description: input.description,
    project_id: input.projectId,
    metadata: input.metadata,
  };

  if (input.value) {
    payload.value_enc = await encryptSecret(input.value);
  }

  if (input.id) {
    const { error } = await db.from("developer_assets").update(payload).eq("id", input.id);
    if (error) throw new Error("Gagal memperbarui aset developer.");
    return { id: input.id };
  }

  if (!input.value) throw new Error("Nilai wajib diisi untuk aset baru.");
  payload.value_enc = await encryptSecret(input.value);

  const { data, error } = await db.from("developer_assets").insert(payload).select("id").single();
  if (error) throw new Error("Gagal menyimpan aset developer.");
  return { id: data.id };
}

export async function revealDevAsset(db: Db, id: string) {
  const { data, error } = await db
    .from("developer_assets")
    .select("value_enc")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Aset tidak ditemukan.");
  return { value: await decryptSecret(data.value_enc) };
}

export async function deleteDevAsset(db: Db, id: string) {
  const { error } = await db.from("developer_assets").delete().eq("id", id);
  if (error) throw new Error("Gagal menghapus aset developer.");
  return { ok: true };
}
