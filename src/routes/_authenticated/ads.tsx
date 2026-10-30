import { createFileRoute } from "@tanstack/react-router";
import { AdsToolsView } from "@/components/vault/ads/AdsToolsView";

export const Route = createFileRoute("/_authenticated/ads")({
  head: () => ({
    meta: [
      { title: "Ads & Marketing · Ebran Aset Digital" },
      {
        name: "description",
        content: "Kelola aset iklan, API key platform iklan, dan proyek terkait.",
      },
      { property: "og:title", content: "Ads & Marketing · Ebran Aset Digital" },
      {
        property: "og:description",
        content: "Kelola aset iklan dan proyek dengan audit keamanan AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdsToolsView,
});
