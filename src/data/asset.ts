// Dummy data for the asset detail view. Will be replaced by real asset storage.

export const projects = [
  { name: "Content Center Web Salute Malang", count: 24 },
  { name: "SocioAPI Playground", count: 11 },
  { name: "Sultan Barokah", count: 8 },
  { name: "Internal / Pribadi", count: 37 },
];

export const categories = [
  { name: "Email (Core)", key: "email", count: 0 },
  { name: "Developer Tools", key: "dev", count: 0 },
  { name: "Ads & Marketing", key: "ads", count: 0 },
  { name: "Social Media", key: "social", count: 0 },
] as const;

export const tags = [
  { label: "#Production", tone: "success" },
  { label: "#Banned", tone: "danger" },
  { label: "#Urgent", tone: "warning" },
] as const;

export const asset = {
  id: "ig-newton-badminton",
  title: "Instagram - Newton Badminton",
  status: "Active",
  publicUrl: "instagram.com/newtonbadminton",
  loginUrl: "https://www.instagram.com/accounts/login/",
  category: "Social Media",
  project: "Internal / Pribadi",
  tags: ["#Production"],
  username: "demo-account",
  password: "",
  profile: {
    role: "Super Admin",
    emailLogin: "",
    phone: "",
    whatsapp: "",
    note: "",
  },
  security: {
    recoveryEmail: "",
    authenticator: "Not configured",
    totpSecret: "",
    backupCodes: [],
  },
  api: {
    publicKey: "",
    secretToken: "",
    webhookUrl: "",
    expiration: "12-Desember-2026",
    expirationISO: "2026-12-12",
  },
  ops: {
    status: "Active",
    proxy: "",
    proxyRegion: "",
    billing: "Visa - 4242",
    createdAt: "15 Agustus 2024",
  },
  attachments: [
    {
      id: "1",
      name: "invoice-newton.pdf",
      size: "248 KB",
      type: "pdf",
      status: "done",
      fields: 12,
    },
    {
      id: "2",
      name: "ktp-verifikasi.jpg",
      size: "1.4 MB",
      type: "image",
      status: "done",
      fields: 7,
    },
  ],
};

export type Attachment = (typeof asset.attachments)[number];
