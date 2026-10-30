import { createFileRoute } from "@tanstack/react-router";
import { SocialMediaView } from "@/components/vault/social/SocialMediaView";
export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social Media · Ebran Aset Digital" },
      { name: "description", content: "Kelola akun media sosial, statistik, dan performa post." },
    ],
  }),
  component: SocialMediaView,
});
