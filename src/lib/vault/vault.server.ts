// Server-only email-vault logic: import/sync, listing, password facts for the AI audit.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { decryptSecret, encryptSecret, passwordFingerprint } from "./crypto.server";
import { normalizeCsv, passwordStrengthFacts, providerOf, type LovableStatus } from "./normalize";

type Db = SupabaseClient<Database>;

async function passwordColumns(password: string | null, email: string) {
  if (!password) {
    return { password_enc: null, pw_fingerprint: null, pw_length: null, pw_classes: null, pw_matches_email: false, pw_common_pattern: false };
  }
  const facts = passwordStrengthFacts(password, email);
  return {
    password_enc: await encryptSecret(password),
    pw_fingerprint: await passwordFingerprint(password),
    pw_length: facts.length,
    pw_classes: facts.classes,
    pw_matches_email: facts.matchesEmail,
    pw_common_pattern: facts.commonPattern,
  };
}

export async function importCsv(db: Db, userId: string, csv: string) {
  const result = normalizeCsv(csv);
  if (!result.accounts.length) throw new Error("Tidak ada baris email yang valid di file ini.");

  const { data: existing, error: existingError } = await db.from("email_accounts").select("email");
  if (existingError) throw new Error("Gagal membaca data lama.");
  const existingEmails = new Set((existing ?? []).map((r) => r.email));

  const rows = await Promise.all(
    result.accounts.map(async (a) => ({
      user_id: userId,
      email: a.email,
      provider: a.provider,
      ...(await passwordColumns(a.password, a.email)),
      alt_password_enc: a.altPassword ? await encryptSecret(a.altPassword) : null,
      lovable_status: a.lovableStatus,
      usage_tag: a.usageTag,
      note: a.note,
    })),
  );

  const { data: saved, error: saveError } = await db
    .from("email_accounts")
    .upsert(rows, { onConflict: "user_id,email" })
    .select("id, email");
  if (saveError) {
    console.error("[vault import] accounts", saveError);
    throw new Error("Gagal menyimpan akun email.");
  }
  const idByEmail = new Map((saved ?? []).map((r) => [r.email, r.id]));

  const projectRows = result.accounts.flatMap((a) =>
    a.projects.map((p) => ({ user_id: userId, account_id: idByEmail.get(a.email)!, name: p.name, url: p.url, note: p.note })),
  );
  if (projectRows.length) {
    const { error: projectError } = await db.from("lovable_projects").upsert(projectRows, { onConflict: "account_id,name" });
    if (projectError) {
      console.error("[vault import] projects", projectError);
      throw new Error("Akun tersimpan, tetapi proyek Lovable gagal disimpan.");
    }
  }

  return {
    totalRows: result.totalRows,
    accounts: result.accounts.length,
    added: result.accounts.filter((a) => !existingEmails.has(a.email)).length,
    updated: result.accounts.filter((a) => existingEmails.has(a.email)).length,
    projects: projectRows.length,
    skipped: result.skipped,
    cleaned: result.cleaned,
    merged: result.merged,
  };
}

const LIST_COLUMNS =
  "id, email, provider, password_enc, alt_password_enc, pw_fingerprint, pw_length, pw_classes, pw_matches_email, pw_common_pattern, lovable_status, usage_tag, note, created_at, updated_at, lovable_projects(id, name, url, note)";

export async function listAccounts(db: Db) {
  const { data, error } = await db.from("email_accounts").select(LIST_COLUMNS).order("email");
  if (error) {
    console.error("[vault list]", error);
    throw new Error("Gagal memuat daftar email.");
  }
  const reuse = new Map<string, number>();
  for (const r of data ?? []) if (r.pw_fingerprint) reuse.set(r.pw_fingerprint, (reuse.get(r.pw_fingerprint) ?? 0) + 1);

  // Never return ciphertext or fingerprints to the browser.
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    provider: r.provider,
    hasPassword: !!r.password_enc,
    hasAltPassword: !!r.alt_password_enc,
    passwordLength: r.pw_length,
    passwordClasses: r.pw_classes,
    passwordMatchesEmail: r.pw_matches_email,
    passwordCommonPattern: r.pw_common_pattern,
    passwordReusedBy: r.pw_fingerprint ? (reuse.get(r.pw_fingerprint) ?? 1) - 1 : 0,
    lovableStatus: r.lovable_status as LovableStatus,
    usageTag: r.usage_tag,
    note: r.note,
    updatedAt: r.updated_at,
    projects: (r.lovable_projects ?? []).map((p) => ({ id: p.id, name: p.name, url: p.url, note: p.note })),
  }));
}

export type VaultAccount = Awaited<ReturnType<typeof listAccounts>>[number];

export async function revealPassword(db: Db, id: string) {
  const { data, error } = await db.from("email_accounts").select("password_enc, alt_password_enc").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Akun tidak ditemukan.");
  return {
    password: data.password_enc ? await decryptSecret(data.password_enc) : null,
    altPassword: data.alt_password_enc ? await decryptSecret(data.alt_password_enc) : null,
  };
}

export type AccountInput = {
  id: string | null;
  email: string;
  password: string | null;
  lovableStatus: LovableStatus;
  usageTag: string | null;
  note: string | null;
};

export async function saveAccount(db: Db, userId: string, input: AccountInput) {
  const base = {
    lovable_status: input.lovableStatus,
    usage_tag: input.usageTag,
    note: input.note,
  };
  const pw = input.password ? await passwordColumns(input.password, input.email) : null;
  if (input.id) {
    const { error } = await db.from("email_accounts").update({ ...base, ...(pw ?? {}) }).eq("id", input.id);
    if (error) throw new Error("Gagal memperbarui akun.");
    return { id: input.id };
  }
  const { data, error } = await db
    .from("email_accounts")
    .insert({ user_id: userId, email: input.email, provider: providerOf(input.email), ...base, ...(pw ?? (await passwordColumns(null, input.email))) })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23505" ? "Email ini sudah ada di vault." : "Gagal menambah akun.");
  return { id: data.id };
}

/** Non-secret facts about the whole vault, for the AI audit. */
export function vaultFacts(accounts: VaultAccount[]) {
  const withPw = accounts.filter((a) => a.hasPassword);
  const reusedGroups = new Map<number, number>();
  for (const a of withPw) if (a.passwordReusedBy > 0) reusedGroups.set(a.passwordReusedBy + 1, (reusedGroups.get(a.passwordReusedBy + 1) ?? 0) + 1);
  const count = (f: (a: VaultAccount) => boolean) => accounts.filter(f).length;
  const providers: Record<string, number> = {};
  for (const a of accounts) providers[a.provider] = (providers[a.provider] ?? 0) + 1;
  return {
    totalAccounts: accounts.length,
    providers,
    lovable: {
      hasProject: count((a) => a.lovableStatus === "has_project"),
      empty: count((a) => a.lovableStatus === "empty"),
      notRegistered: count((a) => a.lovableStatus === "not_registered"),
      unknown: count((a) => a.lovableStatus === "unknown"),
      totalProjects: accounts.reduce((n, a) => n + a.projects.length, 0),
      projectsWithoutLink: accounts.reduce((n, a) => n + a.projects.filter((p) => !p.url).length, 0),
    },
    usageTags: count((a) => !!a.usageTag),
    passwords: {
      missing: count((a) => !a.hasPassword),
      withAlternative: count((a) => a.hasAltPassword),
      accountsSharingAPassword: count((a) => a.passwordReusedBy > 0),
      // reusedGroups counts accounts per group size; divide to get the number of groups.
      sharedPasswordGroupsBySize: Object.fromEntries(Array.from(reusedGroups, ([size, n]) => [`${size} akun`, Math.round(n / size)])),
      followNameYearSymbolPattern: count((a) => a.passwordCommonPattern),
      containNameFromEmail: count((a) => a.passwordMatchesEmail),
      shorterThan10: count((a) => a.hasPassword && (a.passwordLength ?? 0) < 10),
      averageLength: withPw.length ? Math.round((withPw.reduce((n, a) => n + (a.passwordLength ?? 0), 0) / withPw.length) * 10) / 10 : 0,
    },
  };
}
