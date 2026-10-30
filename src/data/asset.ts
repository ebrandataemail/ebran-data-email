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
  username: "greygandaw123",
  password: "Newt0n#Mabar2026",
  profile: {
    role: "Super Admin",
    emailLogin: "newton@gmail.com",
    phone: "+62 812-3456-7890",
    whatsapp: "+62 812-3456-7890",
    note: "Akun dipakai untuk posting jadwal mabar tiap Sabtu di GOR Galaxi.",
  },
  security: {
    recoveryEmail: "greygandaw@gmail.com",
    authenticator: "Google Authenticator",
    totpSecret: "JBSW Y3DP EHPK 3PXP",
    backupCodes: [
      "8241-3307",
      "5590-1186",
      "7013-4429",
      "3368-9052",
      "1147-6631",
      "9925-0874",
      "4402-7718",
      "6680-2295",
    ],
  },
  api: {
    publicKey: "pk_live_12345abcde67890fghij",
    secretToken: "sk_live_9f8e7d6c5b4a3210zyxw",
    webhookUrl: "https://socioapi.com/webhook",
    expiration: "12-Desember-2026",
    expirationISO: "2026-12-12",
  },
  ops: {
    status: "Active",
    proxy: "192.168.1.x",
    proxyRegion: "ID / Malang",
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
