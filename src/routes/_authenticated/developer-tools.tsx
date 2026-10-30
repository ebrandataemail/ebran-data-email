import { createFileRoute } from "@tanstack/react-router";
import { DeveloperToolsView } from "@/components/vault/developer/DeveloperToolsView";

export const Route = createFileRoute("/_authenticated/developer-tools")({
  head: () => ({ meta: [{ title: "Developer Tools · Ebran Aset Digital" }] }),
  component: () => <DeveloperToolsView />,
});
