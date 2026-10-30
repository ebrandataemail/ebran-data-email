// Builds the asset brief the AI sees. Raw secrets (password, TOTP secret, backup codes,
// secret token) are NEVER included — only derived, non-reversible facts about them.
import { asset as defaultAsset } from "@/data/asset";

type Asset = typeof defaultAsset;

export function passwordFacts(password: string, accountWords: string[]) {
  const lower = password.toLowerCase();
  const normalized = lower.replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");
  const containsAccountName = accountWords.some((w) => w.length >= 4 && normalized.includes(w.toLowerCase()));
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const containsYear = /(19|20)\d{2}/.test(password);
  return { length: password.length, characterClasses: classes, containsAccountName, containsYear };
}

export function daysUntil(isoDate: string, now: Date) {
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.ceil((target - now.getTime()) / 86_400_000);
}

export function buildAssetBrief(a: Asset = defaultAsset, now: Date = new Date()) {
  const accountWords = a.title.split(/[^A-Za-z]+/).filter(Boolean);
  const pw = passwordFacts(a.password, accountWords);
  return {
    today: now.toISOString().slice(0, 10),
    title: a.title,
    status: a.status,
    category: a.category,
    project: a.project,
    tags: a.tags,
    publicUrl: a.publicUrl,
    username: a.username,
    owner: "Grey Gandaw",
    profile: {
      role: a.profile.role,
      emailLogin: a.profile.emailLogin,
      phoneLinked: Boolean(a.profile.phone),
      whatsappLinked: Boolean(a.profile.whatsapp),
      currentNote: a.profile.note,
    },
    password: pw,
    security: {
      recoveryEmailSet: Boolean(a.security.recoveryEmail),
      recoveryEmailSameAsLogin: a.security.recoveryEmail === a.profile.emailLogin,
      twoFactorApp: a.security.authenticator,
      backupCodesTotal: a.security.backupCodes.length,
      backupCodesUnused: a.security.backupCodes.length,
    },
    api: {
      publicKeyPrefix: a.api.publicKey.slice(0, 8),
      hasSecretToken: Boolean(a.api.secretToken),
      webhookUrl: a.api.webhookUrl,
      expiresOn: a.api.expirationISO,
      daysUntilExpiry: daysUntil(a.api.expirationISO, now),
    },
    ops: {
      status: a.ops.status,
      proxyRegion: a.ops.proxyRegion,
      billingTag: a.ops.billing,
      createdAt: a.ops.createdAt,
      lastLogin: "3 jam lalu dari Malang",
    },
  };
}

export type AssetBrief = ReturnType<typeof buildAssetBrief>;
