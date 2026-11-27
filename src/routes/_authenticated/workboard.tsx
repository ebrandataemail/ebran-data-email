import { createFileRoute } from "@tanstack/react-router";
import { WorkboardView } from "@/components/workboard/WorkboardView";

function WorkboardRouteView() {
  const { view } = Route.useSearch();
  return <WorkboardView section={view} />;
}

export const Route = createFileRoute("/_authenticated/workboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "inbox" || search.view === "calendar" ? search.view : "tasks",
  }),
  head: () => ({
    meta: [
      { title: "Papan Kerja · Ebran Aset Digital" },
      {
        name: "description",
        content:
          "Graphic workspace, timeline tugas, kalender, dan sekretaris AI dalam satu halaman.",
      },
      { property: "og:title", content: "Papan Kerja · Ebran Aset Digital" },
      {
        property: "og:description",
        content:
          "Graphic workspace, timeline tugas, kalender, dan sekretaris AI dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkboardRouteView,
});
