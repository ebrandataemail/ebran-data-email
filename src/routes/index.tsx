import { createFileRoute, redirect } from "@tanstack/react-router";

// The vault itself lives behind sign-in at /vault; the root just forwards there.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/vault" });
  },
  head: () => ({
    meta: [
      { title: "Ebran Aset Digital" },
      { name: "description", content: "Vault aset & akun digital bertenaga AI." },
      { property: "og:title", content: "Ebran Aset Digital" },
      { property: "og:description", content: "Kelola akun, kredensial, 2FA, API key, dan dokumen dengan AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
