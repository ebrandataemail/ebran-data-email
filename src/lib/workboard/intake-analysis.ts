import { redactSecrets } from "@/lib/clients/client-ai-shared";

/** Free-text integration data must never deliver labelled secrets or bearer keys to AI. */
export function intakeAiText(value: unknown, max = 24000): string {
  return redactSecrets(String(value ?? ""))
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [disamarkan]")
    .replace(/\b(?:sk[-_]|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, "[disamarkan]")
    .replace(/https?:\/\/[^\s<>"']+/gi, (raw) => {
      try {
        const url = new URL(raw);
        url.username = "";
        url.password = "";
        for (const key of [...url.searchParams.keys()]) {
          if (/token|secret|password|key|code|signature/i.test(key)) url.searchParams.set(key, "[disamarkan]");
        }
        return url.toString();
      } catch { return "[tautan disamarkan]"; }
    }).trim().slice(0, max);
}

export function validTaskDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}