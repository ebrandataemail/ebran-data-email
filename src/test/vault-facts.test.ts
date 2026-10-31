import { describe, expect, it } from "vitest";

import { vaultFacts, type VaultAccount } from "@/lib/vault/vault.server";

const acc = (over: Partial<VaultAccount>): VaultAccount => ({
  id: crypto.randomUUID(),
  email: "x@gmail.com",
  projectId: null,
  provider: "gmail",
  hasPassword: true,
  hasAltPassword: false,
  passwordLength: 10,
  passwordClasses: 4,
  passwordMatchesEmail: false,
  passwordCommonPattern: false,
  passwordReusedBy: 0,
  lovableStatus: "unknown",
  usageTag: null,
  note: null,
  updatedAt: "",
  projects: [],
  ...over,
});

describe("vault facts sent to the AI", () => {
  it("counts shared-password groups, not accounts", () => {
    const facts = vaultFacts([
      acc({ passwordReusedBy: 1 }),
      acc({ passwordReusedBy: 1 }),
      acc({ passwordReusedBy: 2 }),
      acc({ passwordReusedBy: 2 }),
      acc({ passwordReusedBy: 2 }),
      acc({}),
    ]);
    expect(facts.passwords.accountsSharingAPassword).toBe(5);
    expect(facts.passwords.sharedPasswordGroupsBySize).toEqual({ "2 akun": 1, "3 akun": 1 });
  });

  it("counts accounts with no saved password", () => {
    expect(
      vaultFacts([acc({ hasPassword: false, passwordLength: null }), acc({})]).passwords.missing,
    ).toBe(1);
  });
});
