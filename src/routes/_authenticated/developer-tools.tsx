import { createFileRoute } from "@tanstack/react-router";
import { DeveloperToolsView } from "@/components/vault/developer/DeveloperToolsView";

export const Route = createFileRoute("/_authenticated/developer-tools")({
  head: () => ({ meta: [
    { title: "Developer Tools · Ebran Aset Digital" },
    { name: "description", content: "Kelola kredensial developer dan tautan dashboard secara aman." },
    { property: "og:title", content: "Developer Tools · Ebran Aset Digital" },
    { property: "og:description", content: "Kelola kredensial developer dan tautan dashboard secara aman." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <DeveloperToolsView />,
});
