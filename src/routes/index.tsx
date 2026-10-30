import { createFileRoute } from "@tanstack/react-router";
import { CodeXml, Paperclip, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { AssetHeader } from "@/components/vault/AssetHeader";
import { InsightRail } from "@/components/vault/InsightRail";
import { ApiTab } from "@/components/vault/tabs/ApiTab";
import { AttachmentsTab } from "@/components/vault/tabs/AttachmentsTab";
import { OpsTab } from "@/components/vault/tabs/OpsTab";
import { ProfileTab } from "@/components/vault/tabs/ProfileTab";
import { SecurityTab } from "@/components/vault/tabs/SecurityTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instagram - Newton Badminton · Hermes Asset Vault" },
      {
        name: "description",
        content: "Kelola akun, kredensial, 2FA, API key, dan dokumen digital dalam satu vault bertenaga Hermes AI.",
      },
      { property: "og:title", content: "Hermes Asset Vault" },
      {
        property: "og:description",
        content: "Vault aset & akun digital bertenaga Hermes AI — kredensial, 2FA, API key, dan dokumen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const tabs = [
  { value: "profil", label: "Info Profil", icon: UserRound, Content: ProfileTab },
  { value: "keamanan", label: "Keamanan & Recovery", icon: ShieldCheck, Content: SecurityTab },
  { value: "api", label: "API & Developer", icon: CodeXml, Content: ApiTab },
  { value: "ops", label: "Ops & Status", icon: SlidersHorizontal, Content: OpsTab },
  { value: "attachments", label: "Attachments", icon: Paperclip, Content: AttachmentsTab, count: 2 },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <AssetHeader />
        <Tabs defaultValue="profil" className="px-4 pb-16 sm:px-8">
          <div className="-mx-4 overflow-x-auto border-b border-border px-4 sm:-mx-8 sm:px-8">
            <TabsList className="h-auto gap-1 rounded-none bg-transparent p-0">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-3 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <t.icon className="size-4" />
                  {t.label}
                  {t.count && (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {t.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mx-auto mt-6 grid max-w-[1200px] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {tabs.map(({ value, Content }) => (
                <TabsContent
                  key={value}
                  value={value}
                  className="mt-0 animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  <Content />
                </TabsContent>
              ))}
            </div>
            <InsightRail />
          </div>
        </Tabs>
      </main>
    </div>
  );
}
