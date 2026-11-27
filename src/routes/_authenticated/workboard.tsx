import { createFileRoute } from "@tanstack/react-router";
import { WorkboardView } from "@/components/workboard/WorkboardView";

function WorkboardRouteView() {
  const { view } = Route.useSearch();
  const { taskId } = Route.useSearch();
  return <WorkboardView section={view} taskId={taskId} />;
}

export const Route = createFileRoute("/_authenticated/workboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "manager" || search.view === "inbox" || search.view === "calendar" ? search.view : "board",
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
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
