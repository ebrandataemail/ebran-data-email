import { createFileRoute } from "@tanstack/react-router";
import { WorkboardSettingsView } from "@/components/workboard/WorkboardSettingsView";

export const Route = createFileRoute("/_authenticated/workboard-settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan & Peringatan Dini · Ebran Aset Digital" },
      {
        name: "description",
        content: "Kelola alarm, notifikasi ntfy, dan pengingat deadline Workboard.",
      },
    ],
  }),
  component: WorkboardSettingsView,
});
