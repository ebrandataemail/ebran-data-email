import { createFileRoute } from "@tanstack/react-router";

import { AccountsView } from "@/components/vault/accounts/AccountsView";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Email (Core) · Hermes Asset Vault" },
      { name: "description", content: "Daftar akun email, password terenkripsi, dan proyek Lovable yang terhubung." },
      { property: "og:title", content: "Email (Core) · Hermes Asset Vault" },
      { property: "og:description", content: "Kelola akun email dan proyek Lovable dengan audit keamanan Hermes AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsView,
});
