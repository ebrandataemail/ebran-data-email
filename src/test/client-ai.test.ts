import { describe, expect, it } from "vitest";

import {
  isSafePublicUrl,
  normalizeHex,
  normalizeWebUrl,
  parseBullets,
  profileToBrandRow,
  redactSecrets,
  socialProfileUrl,
} from "@/lib/clients/client-ai-shared";

describe("client AI: secrets never reach the AI", () => {
  it("masks passwords and 2FA secrets in client asset notes", () => {
    const notes = "Password: SultanHaramain2026! | Recovery HP: 0812 | 2FA Secret: JBSWY3DPEHPK3PXP";
    const out = redactSecrets(notes);
    expect(out).not.toContain("SultanHaramain2026!");
    expect(out).not.toContain("JBSWY3DPEHPK3PXP");
    expect(out).toContain("Recovery HP: 0812");
  });

  it("masks Indonesian 'kata sandi' and token labels", () => {
    const out = redactSecrets("kata sandi = rahasia123\nAPI key: sk_live_abc");
    expect(out).not.toContain("rahasia123");
    expect(out).not.toContain("sk_live_abc");
  });
});

describe("client AI: website fetching is limited to public sites", () => {
  it("blocks localhost and private networks", () => {
    for (const url of [
      "http://localhost/",
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.20.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://intranet/",
      "https://user:pw@example.com/",
      "https://example.com:8443/",
      "ftp://example.com/",
    ]) {
      expect(isSafePublicUrl(new URL(url)), url).toBe(false);
    }
  });

  it("allows normal public websites and adds https://", () => {
    expect(normalizeWebUrl("sultanharamaingresik.com")).toBe("https://sultanharamaingresik.com/");
    expect(normalizeWebUrl("http://localhost:3000")).toBeNull();
  });

  it("builds public social profile URLs from handles", () => {
    expect(socialProfileUrl("instagram", "@sultanharamain_gresik")).toBe(
      "https://www.instagram.com/sultanharamain_gresik/",
    );
    expect(socialProfileUrl("tiktok", "brand")).toBe("https://www.tiktok.com/@brand");
  });
});

describe("client AI: saving results", () => {
  it("normalizes brand colors and drops invalid ones", () => {
    expect(normalizeHex("c9a75d")).toBe("#C9A75D");
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("gold")).toBeNull();
  });

  it("only writes the fields the AI actually filled", () => {
    const row = profileToBrandRow({ overview: "Biro umrah resmi.", primaryColor: "nope", dos: ["A", "B"] });
    expect(row).toEqual({ company_overview: "Biro umrah resmi.", do_rules: "• A\n• B" });
  });

  it("round-trips bullet lists", () => {
    expect(parseBullets("• Satu\n- Dua\n3) Tiga")).toEqual(["Satu", "Dua", "Tiga"]);
  });
});
