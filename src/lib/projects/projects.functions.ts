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
    const [clientsResult, projectsResult, accountsResult] = await Promise.all([
      context.supabase
        .from("clients")
        .select("id,name,description,website,created_at,updated_at")
        .order("name"),
      context.supabase
        .from("projects")
        .select("id,name,description,status,client_id,created_at,updated_at")
        .order("name"),
      context.supabase.from("email_accounts").select("id,email,project_id").order("email"),
    ]);
    if (clientsResult.error || projectsResult.error || accountsResult.error)
      throw new Error("Gagal memuat data proyek dan client.");
    const clients = clientsResult.data ?? [];
    const projects = projectsResult.data ?? [];
    const accounts = accountsResult.data ?? [];
    return {
      clients: clients.map((client) => ({
        ...client,
        projectCount: projects.filter((project) => project.client_id === client.id).length,
      })),
      projects: projects.map((project) => ({
        ...project,
        clientName: clients.find((client) => client.id === project.client_id)?.name ?? null,
        emailCount: accounts.filter((account) => account.project_id === project.id).length,
      })),
      unassignedEmailCount: accounts.filter((account) => !account.project_id).length,
    };
  });

export const workspaceSaveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      description?: string | null;
      website?: string | null;
    }) => {
      const name = text(input?.name, 120);
      if (!name) throw new Error("Nama client wajib diisi.");
      return {
        id: input?.id ? uuid(input.id) : null,
        name,
        description: text(input?.description, 1000) || null,
        website: text(input?.website, 300) || null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const result = data.id
      ? await context.supabase
          .from("clients")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase.from("clients").insert(payload).select("id").single();
    if (result.error)
      throw new Error(
        result.error.code === "23505" ? "Nama client sudah digunakan." : "Gagal menyimpan client.",
      );
    return result.data;
  });

export const workspaceDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid(input?.id) }))
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
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus client.");
    return { ok: true };
  });

export const workspaceSaveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      description?: string | null;
      status?: string;
      clientId?: string | null;
    }) => {
      const name = text(input?.name, 120);
      const status = ["active", "paused", "archived"].includes(input?.status ?? "")
        ? input.status!
        : "active";
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

export const workspaceDeleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid(input?.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus proyek.");
    return { ok: true };
  });
