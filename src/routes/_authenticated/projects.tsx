import { createFileRoute } from "@tanstack/react-router";
import { ProjectsClientsView } from "@/components/vault/ProjectsClientsView";
export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [
    { title: "Proyek · Ebran Aset Digital" },
    { name: "description", content: "Kelola proyek dan hubungan client dengan aset digital." },
    { property: "og:title", content: "Proyek · Ebran Aset Digital" },
    { property: "og:description", content: "Kelola proyek dan hubungan client dengan aset digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <ProjectsClientsView mode="projects" />,
});
