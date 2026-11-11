// Synthetic credentials only; no environment keys or production values are read.
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
vi.mock("../lib/vault/crypto.server", () => ({
  encryptSecret: vi.fn(), passwordFingerprint: vi.fn(), decryptSecret: vi.fn(),
}));
import { listAccounts, revealPassword } from "../lib/vault/vault.server";
import { decryptSecret } from "../lib/vault/crypto.server";

describe("vault storage boundaries", () => {
  it("does not include ciphertext or fingerprints in list responses", async () => {
    const row = { id: "synthetic-id", email: "test@example.com", password_enc: "synthetic-ciphertext", alt_password_enc: "synthetic-alt", pw_fingerprint: "synthetic-fingerprint", lovable_projects: [{ id: "p", name: "project", url: "javascript:alert(1)", note: null }] };
    const db = { from: () => ({ select: () => ({ order: async () => ({ data: [row], error: null }) }) }) };
    const accounts = await listAccounts(db as unknown as SupabaseClient<Database>);
    expect(accounts[0]).not.toHaveProperty("password_enc");
    expect(accounts[0]).not.toHaveProperty("alt_password_enc");
    expect(accounts[0]).not.toHaveProperty("pw_fingerprint");
    expect(accounts[0]?.hasPassword).toBe(true);
    expect(accounts[0]?.projects[0]?.url).toBeNull();
    expect(decryptSecret).not.toHaveBeenCalled();
  });
  it("refuses reveal when RLS returns no accessible account", async () => {
    const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };
    await expect(revealPassword(db as unknown as SupabaseClient<Database>, "other-account")).rejects.toThrow("Akun tidak ditemukan.");
    expect(decryptSecret).not.toHaveBeenCalled();
  });
});