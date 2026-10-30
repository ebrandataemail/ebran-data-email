import { createFileRoute } from "@tanstack/react-router";
import { ProjectsClientsView } from "@/components/vault/ProjectsClientsView";
export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Proyek · Ebran Data Email" }] }),
  component: () => <ProjectsClientsView mode="projects" />,
});
