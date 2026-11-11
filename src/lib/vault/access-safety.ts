/** Navigation only: never use this as an SSRF/fetch allowlist. */
export function safeAccountUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function accountUrlInput(value: unknown): string | null {
  if (value == null || value === "") return null;
  const url = safeAccountUrl(value);
  if (!url) throw new Error("Tautan harus berupa HTTP/HTTPS tanpa kredensial di alamatnya.");
  return url;
}

/** Passwords are opaque: reject oversized input rather than silently changing it. */
export function passwordInput(value: unknown, max = 20_000): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new Error("Password tidak valid atau terlalu panjang.");
  return value;
}