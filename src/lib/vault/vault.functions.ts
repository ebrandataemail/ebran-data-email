import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runVaultAudit } from "@/lib/assistant/assistant.server";
import { cleanEmail, type LovableStatus } from "./normalize";
import { importCsv, listAccounts, revealPassword, saveAccount, vaultFacts } from "./vault.server";

const STATUSES: LovableStatus[] = ["unknown", "empty", "has_project", "not_registered"];
const MAX_CSV_CHARS = 2_000_000;

const uuid = (v: unknown) => {
  const s = String(v ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("ID tidak valid.");
  return s;
};
const optionalText = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || null;
};

export const vaultListAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listAccounts(context.supabase));

export const vaultImportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { csv: string }) => {
    const csv = String(input?.csv ?? "");
    if (!csv.trim()) throw new Error("File CSV kosong.");
    if (csv.length > MAX_CSV_CHARS) throw new Error("File CSV terlalu besar (maks. 2 MB).");
    return { csv };
  })
  .handler(async ({ data, context }) => importCsv(context.supabase, context.userId, data.csv));

export const vaultRevealPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: uuid(input?.id) }))
  .handler(async ({ data, context }) => revealPassword(context.supabase, data.id));

export const vaultSaveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      id: string | null;
      email: string;
      password: string | null;
      lovableStatus: string;
      usageTag: string | null;
      note: string | null;
      projectId?: string | null;
      projects?: { id: string | null; name: string; url: string | null; note: string | null }[];
    }) => {
      const id = input?.id ? uuid(input.id) : null;
      const email = cleanEmail(String(input?.email ?? ""));
      if (!id && !email) throw new Error("Email tidak valid.");
      const lovableStatus = STATUSES.includes(input?.lovableStatus as LovableStatus)
        ? (input.lovableStatus as LovableStatus)
        : "unknown";
      return {
        id,
        email: email ?? "",
        password: optionalText(input?.password, 200),
        lovableStatus,
        usageTag: optionalText(input?.usageTag, 80),
        note: optionalText(input?.note, 1000),
        projectId:
          input?.projectId === undefined
            ? undefined
            : input.projectId
              ? uuid(input.projectId)
              : null,
        projects: input?.projects?.map((p) => ({
          id: p.id ? uuid(p.id) : null,
          name: String(p.name || "Proyek Tanpa Nama").slice(0, 100),
          url: optionalText(p.url, 500),
          note: optionalText(p.note, 1000),
        })),
      };
    },
  )
  .handler(async ({ data, context }) => saveAccount(context.supabase, context.userId, data));

export const vaultDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: uuid(input?.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("email_accounts").delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus akun.");
    return { ok: true };
  });

export const vaultAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const accounts = await listAccounts(context.supabase);
    if (!accounts.length) throw new Error("Vault masih kosong. Impor data dulu.");
    return runVaultAudit(vaultFacts(accounts));
  });
