import { createFileRoute } from "@tanstack/react-router";
import { ProjectsClientsView } from "@/components/vault/ProjectsClientsView";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [
    { title: "Client · Ebran Data Email" },
    { name: "description", content: "Daftar client dan profil brand milik Anda." },
    { property: "og:title", content: "Client · Ebran Data Email" },
    { property: "og:description", content: "Daftar client dan profil brand milik Anda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <ProjectsClientsView mode="clients" />,
});
