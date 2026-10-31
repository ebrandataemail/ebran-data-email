import { describe, expect, it } from "vitest";

import { asset as baseAsset } from "@/data/asset";
import { buildAssetBrief, daysUntil, passwordFacts } from "@/lib/assistant/context";

const asset = {
  ...baseAsset,
  password: "Secret#Pass2026",
  security: { ...baseAsset.security, totpSecret: "JBSWY3DPEHPK3PXP", backupCodes: ["1111-2222", "3333-4444"] },
  api: { ...baseAsset.api, secretToken: "sk_live_testsecret123", publicKey: "pk_live_testpublic456" },
};

describe("AI asset brief", () => {
  const brief = JSON.stringify(buildAssetBrief(asset, new Date("2026-10-30T12:00:00Z")));

  it("never includes the account password", () => {
    expect(brief).not.toContain(asset.password);
  });

  it("never includes the TOTP secret or any backup code", () => {
    expect(brief).not.toContain(asset.security.totpSecret);
    for (const code of asset.security.backupCodes) expect(brief).not.toContain(code);
  });

  it("never includes the API secret token or the full public key", () => {
    expect(brief).not.toContain(asset.api.secretToken);
    expect(brief).not.toContain(asset.api.publicKey);
  });

  it("counts days until the API token expires", () => {
    expect(daysUntil("2026-12-12", new Date("2026-10-30T12:00:00Z"))).toBe(43);
  });

  it("flags a password that contains the account name", () => {
    expect(passwordFacts("Newt0n#Mabar2026", ["Newton", "Badminton"]).containsAccountName).toBe(
      true,
    );
    expect(passwordFacts("q7#Lp9!vRt2x", ["Newton", "Badminton"]).containsAccountName).toBe(false);
  });
});
