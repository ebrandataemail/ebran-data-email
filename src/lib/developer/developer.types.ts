export const DEV_ASSET_TYPES = [
  "api_key",
  "webhook",
  "env_var",
  "ssh_key",
  "db_connection",
  "app_account",
  "website",
  "domain",
  "hosting",
  "repository",
  "package",
  "oauth_app",
  "cloud_service",
  "ai_model",
  "ai_agent",
  "robot",
  "automation",
  "other",
] as const;

export type DevAssetType = (typeof DEV_ASSET_TYPES)[number];
export type DevAssetEnvironment = "production" | "staging" | "development" | "local" | "other";
export type DevAssetStatus =
  "active" | "inactive" | "expired" | "revoked" | "maintenance" | "draft";

export const DEV_ASSET_ENVIRONMENTS: DevAssetEnvironment[] = [
  "production",
  "staging",
  "development",
  "local",
  "other",
];
export const DEV_ASSET_STATUSES: DevAssetStatus[] = [
  "active",
  "inactive",
  "expired",
  "revoked",
  "maintenance",
  "draft",
];
