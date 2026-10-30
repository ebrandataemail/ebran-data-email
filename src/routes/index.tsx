import { createFileRoute, redirect } from "@tanstack/react-router";

// The vault itself lives behind sign-in at /vault; the root just forwards there.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/vault" });
  },
  head: () => ({
    meta: [
      { title: "Hermes Asset Vault" },
      { name: "description", content: "Vault aset & akun digital bertenaga Hermes AI." },
      { property: "og:title", content: "Hermes Asset Vault" },
      { property: "og:description", content: "Kelola akun, kredensial, 2FA, API key, dan dokumen dengan Hermes AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
