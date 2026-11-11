import { createFileRoute } from "@tanstack/react-router";
import { SocialMediaView } from "@/components/vault/social/SocialMediaView";
export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social Media · Ebran Aset Digital" },
      { property: "og:title", content: "Social Media · Ebran Aset Digital" },
      { property: "og:description", content: "Kelola akun media sosial, statistik, dan performa post." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Kelola akun media sosial, statistik, dan performa post." },
    ],
  }),
  component: SocialMediaView,
});
