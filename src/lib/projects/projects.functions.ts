import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = (value: unknown) => {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("ID tidak valid.");
  return id;
};
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export const workspaceList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [clientsResult, projectsResult, accountsResult, developerAssetsResult, adsAssetsResult] =
      await Promise.all([
        context.supabase
          .from("clients" as any)
          .select("id,name,description,website,legal_name,industry,contact_name,contact_email,contact_phone,address,city,logo_path,company_profile,scope_of_work,internal_notes,client_status,created_at,updated_at")
          .order("name"),
        context.supabase
          .from("projects")
          .select("id,name,description,status,client_id,created_at,updated_at")
          .order("name"),
        context.supabase.from("email_accounts").select("id,email,project_id").order("email"),
        context.supabase
          .from("developer_assets")
          .select("id,project_id")
          .order("created_at", { ascending: false }),
        context.supabase
          .from("ads_assets")
          .select("id,project_id")
          .order("created_at", { ascending: false }),
      ]);
    if (
      clientsResult.error ||
      projectsResult.error ||
      accountsResult.error ||
      developerAssetsResult.error ||
      adsAssetsResult.error
    )
      throw new Error("Gagal memuat data proyek dan client.");
    const clients = clientsResult.data ?? [];
    const projects = projectsResult.data ?? [];
    const accounts = accountsResult.data ?? [];
    const developerAssets = developerAssetsResult.data ?? [];
    const adsAssets = adsAssetsResult.data ?? [];
    return {
      clients: clients.map((client) => {
        const clientProjects = projects.filter((project) => project.client_id === client.id);
        const projectIds = new Set(clientProjects.map((project) => project.id));
        return {
          ...client,
          legalName: client.legal_name,
          industry: client.industry,
          contactName: client.contact_name,
          contactEmail: client.contact_email,
          contactPhone: client.contact_phone,
          address: client.address,
          city: client.city,
          logoPath: client.logo_path,
          companyProfile: client.company_profile,
          scopeOfWork: client.scope_of_work,
          internalNotes: client.internal_notes,
          clientStatus: client.client_status,
          projectCount: clientProjects.length,
          emailCount: accounts.filter((account) => projectIds.has(account.project_id ?? "")).length,
          developerAssetCount: developerAssets.filter((item) =>
            projectIds.has(item.project_id ?? ""),
          ).length,
          adsAssetCount: adsAssets.filter((item) => projectIds.has(item.project_id ?? "")).length,
        };
      }),
      projects: projects.map((project) => ({
        ...project,
        clientName: clients.find((client) => client.id === project.client_id)?.name ?? null,
        emailCount: accounts.filter((account) => account.project_id === project.id).length,
        developerAssetCount: developerAssets.filter((item) => item.project_id === project.id)
          .length,
        adsAssetCount: adsAssets.filter((item) => item.project_id === project.id).length,
      })),
      unassignedEmailCount: accounts.filter((account) => !account.project_id).length,
      unassignedDeveloperAssetCount: developerAssets.filter((item) => !item.project_id).length,
      unassignedAdsAssetCount: adsAssets.filter((item) => !item.project_id).length,
    };
  });

export const workspaceSaveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      id?: string | null;
      name: string;
      description?: string | null;
      website?: string | null;
      legalName?: string | null; industry?: string | null; contactName?: string | null;
      contactEmail?: string | null; contactPhone?: string | null; address?: string | null;
      city?: string | null; logoPath?: string | null; companyProfile?: string | null;
      scopeOfWork?: string | null; internalNotes?: string | null; clientStatus?: string;
    }) => {
      const name = text(input?.name, 120);
      if (!name) throw new Error("Nama client wajib diisi.");
      return {
        id: input?.id ? uuid(input.id) : null,
        name,
        description: text(input?.description, 1000) || null,
        website: text(input?.website, 300) || null,
        legal_name: text(input?.legalName, 180) || null,
        industry: text(input?.industry, 120) || null,
        contact_name: text(input?.contactName, 120) || null,
        contact_email: text(input?.contactEmail, 254) || null,
        contact_phone: text(input?.contactPhone, 40) || null,
        address: text(input?.address, 500) || null,
        city: text(input?.city, 120) || null,
        logo_path: text(input?.logoPath, 500) || null,
        company_profile: text(input?.companyProfile, 5000) || null,
        scope_of_work: text(input?.scopeOfWork, 5000) || null,
        internal_notes: text(input?.internalNotes, 3000) || null,
        client_status: ["prospect","active","on-hold","completed","inactive"].includes(input?.clientStatus ?? "") ? input!.clientStatus! : "active",
      };
    },
  )
  .handler(async ({ data, context }) => {
    // Never send id: null on INSERT: PostgreSQL must generate the UUID default.
    const { id, ...clientFields } = data;
    const payload = { ...clientFields, user_id: context.userId };
    const result = id
      ? await context.supabase
          .from("clients" as any)
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await context.supabase.from("clients" as any).insert(payload).select("id").single();
    if (result.error) {
      console.error("[workspaceSaveClient] Supabase error:", result.error);
      if (result.error.code === "23505") throw new Error("Nama client sudah digunakan.");
      if (result.error.code === "23502") throw new Error("Ada kolom wajib yang belum terisi.");
      if (result.error.code === "42501") throw new Error("Tidak memiliki izin untuk menyimpan client. Silakan login ulang.");
      throw new Error(result.error.message || "Gagal menyimpan client.");
    }
    return result.data;
  });

export const workspaceDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: uuid(input?.id) }))
  .handler(async ({ data, context }) => {
    const { data: projects, error: checkError } = await context.supabase
      .from("projects")
      .select("id")
      .eq("client_id", data.id)
      .limit(1);
    if (checkError) throw new Error("Gagal memeriksa proyek client.");
    if (projects?.length)
      throw new Error(
        "Client masih memiliki proyek. Pindahkan atau hapus proyeknya terlebih dahulu.",
      );
    const { error } = await context.supabase.from("clients" as any).delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus client.");
    return { ok: true };
  });

export const workspaceSaveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      id?: string | null;
      name: string;
      description?: string | null;
      status?: string;
      clientId?: string | null;
    }) => {
      const name = text(input?.name, 120);
      const allowedStatuses = [
        "things-to-do",
        "on-process",
        "queue-on-process",
        "pending",
        "revision",
        "done",
        "finished",
        "cancel",
        "active",
        "paused",
        "archived",
      ];
      const status = allowedStatuses.includes(input?.status ?? "") ? input!.status! : "on-process";
      if (!name) throw new Error("Nama proyek wajib diisi.");
      return {
        id: input?.id ? uuid(input.id) : null,
        name,
        description: text(input?.description, 1000) || null,
        status,
        client_id: input?.clientId ? uuid(input.clientId) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      description: data.description,
      status: data.status,
      client_id: data.client_id,
      user_id: context.userId,
    };
    const result = data.id
      ? await context.supabase
          .from("projects")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase.from("projects").insert(payload).select("id").single();
    if (result.error)
      throw new Error(
        result.error.code === "23505" ? "Nama proyek sudah digunakan." : "Gagal menyimpan proyek.",
      );
    return result.data;
  });

export const workspaceUpdateProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; status: string }) => {
    const id = uuid(input?.id);
    const status = text(input?.status, 50);
    if (!status) throw new Error("Status wajib diisi.");
    return { id, status };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Gagal memperbarui status proyek.");
    return { ok: true };
  });

export const workspaceDeleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: uuid(input?.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus proyek.");
    return { ok: true };
  });
