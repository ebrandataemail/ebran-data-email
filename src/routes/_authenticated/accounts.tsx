import { createFileRoute } from "@tanstack/react-router";

import { AccountsView } from "@/components/vault/accounts/AccountsView";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Email (Core) · Ebran Aset Digital" },
      {
        name: "description",
        content: "Daftar akun email, password terenkripsi, dan proyek Lovable yang terhubung.",
      },
      { property: "og:title", content: "Email (Core) · Ebran Aset Digital" },
      {
        property: "og:description",
        content: "Kelola akun email dan proyek Lovable dengan audit keamanan AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsView,
});
