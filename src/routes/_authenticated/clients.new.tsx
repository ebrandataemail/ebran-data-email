import { createFileRoute } from "@tanstack/react-router";
import { ClientCreatePage } from "@/components/vault/clients/ClientCreatePage";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({ meta: [{ title: "Tambah Client · Ebran Data Email" }] }),
  component: ClientCreatePage,
});
