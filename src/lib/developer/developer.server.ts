import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { decryptSecret, encryptSecret } from "../vault/crypto.server";

type Db = SupabaseClient<Database>;

import type { DevAssetEnvironment, DevAssetStatus, DevAssetType } from "./developer.types";
export type { DevAssetEnvironment, DevAssetStatus, DevAssetType } from "./developer.types";

export type DevAssetInput = {
  id: string | null;
  type: DevAssetType;
  name: string;
  value?: string | null;
  provider?: string | null;
  websiteUrl?: string | null;
  username?: string | null;
  environment?: DevAssetEnvironment;
  status?: DevAssetStatus;
  expiresAt?: string | null;
  description: string | null;
  projectId: string | null;
  metadata: Record<string, unknown>;
};

export interface DevAsset {
  id: string;
  type: DevAssetType;
  name: string;
  description: string | null;
  provider: string | null;
  websiteUrl: string | null;
  username: string | null;
  environment: DevAssetEnvironment;
  status: DevAssetStatus;
  expiresAt: string | null;
  hasValue: boolean;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export async function listDevAssets(db: Db): Promise<DevAsset[]> {
  const { data, error } = await db
    .from("developer_assets")
    .select(
      "id, type, name, description, provider, website_url, username, environment, status, expires_at, project_id, metadata, updated_at, created_at, projects(id, name, clients(id, name))",
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[developer assets list]", error);
    throw new Error("Gagal memuat aset developer.");
  }
  return (data ?? []).map((row) => {
    const project = row.projects as unknown as {
      id: string;
      name: string;
      clients?: { id: string; name: string } | null;
    } | null;
    return {
      id: row.id,
      type: row.type as DevAssetType,
      name: row.name,
      description: row.description,
      provider: row.provider,
      websiteUrl: row.website_url,
      username: row.username,
      environment: row.environment as DevAssetEnvironment,
      status: row.status as DevAssetStatus,
      expiresAt: row.expires_at,
      hasValue: true,
      projectId: row.project_id,
      projectName: project?.name ?? null,
      clientName: project?.clients?.name ?? null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  });
}

export async function saveDevAsset(db: Db, userId: string, input: DevAssetInput) {
  const payload: Database["public"]["Tables"]["developer_assets"]["Update"] = {
    user_id: userId,
    type: input.type,
    name: input.name,
    description: input.description,
    provider: input.provider ?? null,
    website_url: input.websiteUrl ?? null,
    username: input.username ?? null,
    environment: input.environment ?? "production",
    status: input.status ?? "active",
    expires_at: input.expiresAt || null,
    project_id: input.projectId,
    metadata: (input.metadata ?? {}) as Json,
  };

  if (input.value?.trim()) payload.value_enc = await encryptSecret(input.value);

  if (input.id) {
    const { data, error } = await db
      .from("developer_assets")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("[developer assets update]", error);
      throw new Error("Aset tidak ditemukan atau gagal diperbarui.");
    }
    return { id: data.id };
  }

  const secret = input.value?.trim();
  if (!secret) throw new Error("Nilai rahasia wajib diisi untuk aset baru.");
  const insertPayload: Database["public"]["Tables"]["developer_assets"]["Insert"] = {
    ...payload,
    name: input.name,
    type: input.type,
    value_enc: await encryptSecret(secret),
  };
  const { data, error } = await db
    .from("developer_assets")
    .insert(insertPayload)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[developer assets insert]", error);
    throw new Error(
      error?.code === "23505"
        ? "Aset dengan data tersebut sudah ada."
        : "Gagal menyimpan aset developer.",
    );
  }
  return { id: data.id };
}

export async function revealDevAsset(db: Db, id: string) {
  const { data, error } = await db
    .from("developer_assets")
    .select("value_enc")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.value_enc) throw new Error("Aset tidak ditemukan.");
  return { value: await decryptSecret(data.value_enc) };
}

export async function deleteDevAsset(db: Db, id: string) {
  const { data, error } = await db
    .from("developer_assets")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Aset tidak ditemukan atau gagal dihapus.");
  return { ok: true };
}
