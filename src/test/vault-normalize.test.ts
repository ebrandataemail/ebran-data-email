import { describe, expect, it } from "vitest";

import { cleanEmail, normalizeCsv, passwordStrengthFacts } from "@/lib/vault/normalize";

// Synthetic rows mirroring the quirks of the real "Data Email" sheet (no real credentials).
const CSV = [
  "Link,Kode,Proyek Lovable ,Link Lovable ,Catatan ",
  "satu@gmail.com,Satu2025*,,,",
  "dua@gmail.com.,Dua2025*,Lovable Kosong,,",
  "tiga@ilkomers.comGambar profil,!Abc2025=,Lovable Kosong ,,",
  "empat@gmail.com,Empat2025*,Lovable Happy Meter ,https://happy.lovable.app,",
  "lima@gmail.com,Lima2025*,Lovable Grand Opening ,https://grand.lovable.app,Akun Vendor",
  "lima@gmail.com,Lima2025*,Lovable Perpus,https://perpus.lovable.app,",
  "enam@gmail.com,Enam2025*,,,",
  "enam@gmail.com,Lain2025*,,,",
  "tujuh@gmail.com,Tujuh2025*,AKUN TIKTOK REPOST ARS,,",
  "delapan@gmail.com,Delapan2025*,LOvable Kosong Belum Regis ,,",
  "sembilan@gmail.com,Sembilan2025*,LOvable kosong ada bonus,Godaddy Sriwijaya,",
  "sepuluh@gmail.com,Sepuluh2025*,https://sintesa-testing.lovable.app,Ada Vercel,",
  "bukan-email,xx,,,",
  "sebelas@gmail.com,,,,",
].join("\n");

describe("Data Email CSV normalization", () => {
  const res = normalizeCsv(CSV);
  const by = (email: string) => res.accounts.find((a) => a.email === email)!;

  it("counts every data row and skips rows without a valid email", () => {
    expect(res.totalRows).toBe(14);
    expect(res.skipped).toHaveLength(1);
    expect(res.skipped[0]?.row).toBe(14);
  });

  it("merges duplicate emails into one account", () => {
    expect(res.accounts).toHaveLength(11);
  });

  it("cleans a trailing dot and the 'Gambar profil' suffix from emails", () => {
    expect(cleanEmail("dua@gmail.com.")).toBe("dua@gmail.com");
    expect(cleanEmail("tiga@ilkomers.comGambar profil")).toBe("tiga@ilkomers.com");
    expect(by("tiga@ilkomers.com").provider).toBe("ilkomers.com");
  });

  it("keeps a second, different password as the alternative password", () => {
    expect(by("enam@gmail.com").password).toBe("Enam2025*");
    expect(by("enam@gmail.com").altPassword).toBe("Lain2025*");
  });

  it("collects several Lovable projects for one email and strips the 'Lovable' prefix", () => {
    expect(by("lima@gmail.com").projects.map((p) => p.name)).toEqual(["Grand Opening", "Perpus"]);
    expect(by("lima@gmail.com").note).toBe("Akun Vendor");
    expect(by("empat@gmail.com").projects[0]).toEqual({ name: "Happy Meter", url: "https://happy.lovable.app", note: null });
  });

  it("maps 'Lovable Kosong' variants to Lovable status", () => {
    expect(by("dua@gmail.com").lovableStatus).toBe("empty");
    expect(by("delapan@gmail.com").lovableStatus).toBe("not_registered");
    expect(by("sembilan@gmail.com").lovableStatus).toBe("empty");
    expect(by("sembilan@gmail.com").note).toBe("Godaddy Sriwijaya · Ada bonus");
    expect(by("satu@gmail.com").lovableStatus).toBe("unknown");
  });

  it("treats TikTok rows as a usage tag, not a project", () => {
    expect(by("tujuh@gmail.com").usageTag).toBe("TIKTOK REPOST ARS");
    expect(by("tujuh@gmail.com").projects).toHaveLength(0);
  });

  it("uses a project URL typed in the project column as the project link", () => {
    const acc = by("sepuluh@gmail.com");
    expect(acc.projects[0]?.url).toBe("https://sintesa-testing.lovable.app");
    expect(acc.lovableStatus).toBe("has_project");
    expect(acc.note).toBe("Ada Vercel");
  });

  it("keeps accounts with no password", () => {
    expect(by("sebelas@gmail.com").password).toBeNull();
  });
});

describe("password facts", () => {
  it("flags the Name+year+symbol pattern and names taken from the email", () => {
    expect(passwordStrengthFacts("Febri2025*", "febrirhema53@gmail.com")).toEqual({
      length: 10,
      classes: 4,
      matchesEmail: true,
      commonPattern: true,
    });
    expect(passwordStrengthFacts("q7#Lp9!vRt2x", "febrirhema53@gmail.com").commonPattern).toBe(false);
  });
});
