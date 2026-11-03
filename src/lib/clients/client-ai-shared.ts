// Pure helpers shared by the client AI server code, the chat context and the browser.
// No secrets, no network, no Supabase — safe to import anywhere and easy to test.

export type ClientAiMode = "file" | "url" | "social" | "prompt";
export type ClientAiCard = "brand" | "about" | "rules" | "notes";
export type SocialPlatform = "instagram" | "tiktok" | "facebook";

/** Structured client profile the AI produces. Empty string / empty list = unknown. */
export type ClientProfile = {
  name: string;
  legalName: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  city: string;
  overview: string;
  painPoints: string[];
  agencyGoals: string[];
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  fonts: string[];
  dos: string[];
  donts: string[];
  importantNotes: string[];
};

const SECRET_LABEL =
  /\b(password|passwd|pwd|pass|kata\s*sandi|sandi|2fa\s*secret|totp(?:\s*secret)?|secret(?:\s*key)?|token|api[\s_-]*key|backup\s*codes?|recovery\s*codes?|pin|otp)\b(\s*[:=]\s*)([^|\n]+)/gi;

/** Mask anything that looks like "Password: xyz" so free-text notes never leak secrets to AI. */
export function redactSecrets(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(SECRET_LABEL, (_m, label: string, sep: string) => `${label}${sep}[disamarkan]`);
}

/** Accept "#abc", "abc", "#AABBCC" → "#AABBCC"; anything else → null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

/** Bullet list text "• a\n• b" ⇄ string[]. */
export function toBullets(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `• ${item}`)
    .join("\n");
}

export function parseBullets(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[•\-*·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** Build the public profile URL for a social handle (handle may include @ or a full URL). */
export function socialProfileUrl(platform: SocialPlatform, handle: string): string | null {
  const input = handle.trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  const clean = input.replace(/^@+/, "").replace(/[^\w.]/g, "");
  if (!clean) return null;
  if (platform === "tiktok") return `https://www.tiktok.com/@${clean}`;
  if (platform === "facebook") return `https://www.facebook.com/${clean}`;
  return `https://www.instagram.com/${clean}/`;
}

/** Add https:// when missing; return null when it is not a usable web address. */
export function normalizeWebUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return isSafePublicUrl(url) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Block localhost, private/link-local IPs, credentials and odd ports before the server fetches a URL. */
export function isSafePublicUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !host.includes(":")) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  if (host.includes(":")) {
    // IPv6 literal: block loopback, link-local, unique-local and mapped addresses.
    return !/^(::1?$|fe80:|fc|fd|::ffff:)/.test(host);
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  return true;
}

/** Convert an AI profile into a client_brand_profiles row (only fields the AI actually filled). */
export function profileToBrandRow(profile: Partial<ClientProfile>) {
  const row: Record<string, string | string[]> = {};
  if (profile.overview?.trim()) row["company_overview"] = profile.overview.trim().slice(0, 4000);
  if (profile.painPoints?.length) row["pain_points"] = toBullets(profile.painPoints).slice(0, 3000);
  if (profile.agencyGoals?.length) row["agency_goals"] = toBullets(profile.agencyGoals).slice(0, 3000);
  if (profile.toneOfVoice?.trim()) row["tone_of_voice"] = profile.toneOfVoice.trim().slice(0, 1500);
  if (profile.dos?.length) row["do_rules"] = toBullets(profile.dos).slice(0, 3000);
  if (profile.donts?.length) row["dont_rules"] = toBullets(profile.donts).slice(0, 3000);
  if (profile.importantNotes?.length)
    row["important_notes"] = toBullets(profile.importantNotes).slice(0, 3000);
  const primary = normalizeHex(profile.primaryColor);
  const secondary = normalizeHex(profile.secondaryColor);
  if (primary) row["primary_color"] = primary;
  if (secondary) row["secondary_color"] = secondary;
  if (profile.fonts?.length)
    row["tags"] = profile.fonts
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((f) => `Font: ${f.slice(0, 60)}`);
  return row;
}
