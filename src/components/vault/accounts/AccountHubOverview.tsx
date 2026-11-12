import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AtSign, CodeXml, Mail, Megaphone, ArrowUpRight, Layers3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Summary = { count: number; recent: { id: string; name: string; detail: string }[] };

const db = supabase as any;

function useAssetSummary(key: string, table: string, columns: string, nameField: string, detailField: string) {
  return useQuery({
    queryKey: ["accounts-hub", key],
    staleTime: 30_000,
    queryFn: async (): Promise<Summary> => {
      const { count, error: countError } = await db.from(table).select("id", { count: "exact", head: true });
      if (countError) throw countError;
      const { data, error } = await db.from(table).select(columns).order("updated_at", { ascending: false }).limit(4);
      if (error) throw error;
      return {
        count: count ?? 0,
        recent: (data ?? []).map((row: Record<string, any>) => ({
          id: row.id,
          name: String(row[nameField] ?? "Tanpa nama"),
          detail: String(row[detailField] ?? ""),
        })),
      };
    },
  });
}

function CategoryCard({
  title, description, count, recent, href, icon: Icon, statusLabel,
}: {
  title: string; description: string; count: number; recent: Summary["recent"];
  href: "/accounts" | "/social" | "/developer-tools" | "/ads";
  icon: typeof Mail; statusLabel: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
          <Badge variant="secondary">{count} akun</Badge>
        </div>
        <CardTitle className="pt-2 text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-4 space-y-2">
          {recent.length ? recent.map((item) => (
            <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.detail}</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">Belum ada data tersimpan.</p>}
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
          <Link to={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Kelola <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function AccountHubOverview({ emailAccounts }: { emailAccounts: { id: string; email: string; provider: string }[] }) {
  const emailRecent = emailAccounts.slice(0, 4).map((account) => ({ id: account.id, name: account.email, detail: account.provider }));
  const social = useAssetSummary("social", "social_accounts", "id,display_name,platform", "display_name", "platform");
  const developer = useAssetSummary("developer", "developer_assets", "id,name,provider", "name", "provider");
  const ads = useAssetSummary("ads", "ads_assets", "id,name,platform", "name", "platform");

  const cards = [
    { key: "email", title: "Email (Core)", description: "Gmail dan akun email utama beserta proyek terkait.", count: emailAccounts.length, recent: emailRecent, href: "/accounts" as const, icon: Mail, statusLabel: "Password tersimpan terenkripsi" },
    { key: "social", title: "Social Media", description: "Instagram, TikTok, YouTube, Facebook, X, LinkedIn, dan lainnya.", count: social.data?.count ?? 0, recent: social.data?.recent ?? [], href: "/social" as const, icon: AtSign, statusLabel: "Manual maupun koneksi API" },
    { key: "developer", title: "Developer & Tools", description: "GitHub, Supabase, Vercel, hosting, domain, API, AI, dan tools.", count: developer.data?.count ?? 0, recent: developer.data?.recent ?? [], href: "/developer-tools" as const, icon: CodeXml, statusLabel: "Credential terenkripsi" },
    { key: "ads", title: "Ads & Marketing", description: "Akun iklan, platform marketing, dan akses API.", count: ads.data?.count ?? 0, recent: ads.data?.recent ?? [], href: "/ads" as const, icon: Megaphone, statusLabel: "Credential terenkripsi" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Layers3 className="size-4 text-primary" /> Accounts · Pusat Akun Digital</div>
          <p className="text-sm text-muted-foreground">Satu tempat untuk menemukan dan mengelola seluruh akun digital. Data dibaca dari tabel masing-masing kategori, tanpa membuat duplikat.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <CategoryCard key={card.key} title={card.title} description={card.description} count={card.count} recent={card.recent} href={card.href} icon={card.icon} statusLabel={card.statusLabel} />
        ))}
      </div>
    </section>
  );
}
