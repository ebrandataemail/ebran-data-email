// Server-only password encryption (AES-256-GCM, WebCrypto — works on Workers).
// Key comes from the HERMES_VAULT_KEY secret; ciphertext format: "v1:<base64(iv | ciphertext)>".

const enc = new TextEncoder();
const dec = new TextDecoder();

function secret() {
  const value = process.env["HERMES_VAULT_KEY"];
  if (!value) throw new Error("Kunci enkripsi vault belum diatur.");
  return value;
}

async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`aes:${secret()}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function hmacKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`hmac:${secret()}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function encryptSecret(plain: string) {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv);
  packed.set(cipher, iv.length);
  return `v1:${toBase64(packed)}`;
}

export async function decryptSecret(value: string) {
  if (!value.startsWith("v1:")) throw new Error("Format sandi tidak dikenal.");
  const packed = fromBase64(value.slice(3));
  const key = await aesKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) }, key, packed.slice(12));
  return dec.decode(plain);
}

/** Keyed fingerprint so reused passwords can be counted without decrypting them. */
export async function passwordFingerprint(plain: string) {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(plain)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
