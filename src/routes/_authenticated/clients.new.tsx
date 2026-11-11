import { createFileRoute } from "@tanstack/react-router";
import { ClientCreatePage } from "@/components/vault/clients/ClientCreatePage";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({ meta: [
    { title: "Tambah Client · Ebran Data Email" },
    { name: "description", content: "Tambahkan client dan informasi brand baru." },
    { property: "og:title", content: "Tambah Client · Ebran Data Email" },
    { property: "og:description", content: "Tambahkan client dan informasi brand baru." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ClientCreatePage,
});
