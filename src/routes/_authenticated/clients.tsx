import { createFileRoute } from "@tanstack/react-router";
import { ProjectsClientsView } from "@/components/vault/ProjectsClientsView";
export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Client · Ebran Data Email" }] }),
  component: () => <ProjectsClientsView mode="clients" />,
});
