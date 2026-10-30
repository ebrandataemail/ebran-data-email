import { CalendarClock, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { asset } from "@/data/asset";

const insights = [
  {
    icon: CalendarClock,
    title: "Token API kedaluwarsa 12 Des 2026",
    body: "Jadwalkan rotasi Secret Token sebelum webhook SocioAPI berhenti.",
    tone: "warning" as const,
  },
  {
    icon: ShieldCheck,
    title: "2FA aktif & backup codes lengkap",
    body: "8 dari 8 kode belum terpakai.",
    tone: "success" as const,
  },
  {
    icon: TrendingUp,
    title: "Login konsisten dari Malang",
    body: "Tidak ada aktivitas mencurigakan 30 hari terakhir.",
    tone: "muted" as const,
  },
];

const toneDot = {
  warning: "bg-warning",
  success: "bg-success",
  muted: "bg-border-strong",
};

export function InsightRail() {
  return (
    <aside className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-ai/30 bg-gradient-ai-soft p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-ai shadow-ai">
              <Sparkles className="size-3.5 text-ai-contrast" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">Hermes Insight</h3>
          </div>
          <Badge variant="ai">AI</Badge>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">86</span>
          <span className="pb-1.5 text-sm text-muted-foreground">/ 100 skor keamanan</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full w-[86%] rounded-full bg-gradient-ai" />
        </div>

        <ul className="mt-5 space-y-3.5">
          {insights.map((i) => (
            <li key={i.title} className="flex gap-3">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toneDot[i.tone]}`} />
              <div>
                <p className="text-[13px] font-medium leading-snug text-foreground">{i.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <Button variant="outline" size="sm" className="mt-5 w-full">
          <Sparkles className="text-ai" />
          Tanya Hermes tentang aset ini
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Ringkasan</h3>
        <dl className="mt-4 space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Kategori</dt>
            <dd className="font-medium text-foreground">{asset.category}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Proyek</dt>
            <dd className="text-right font-medium text-foreground">{asset.project}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Tags</dt>
            <dd className="flex gap-1">
              {asset.tags.map((t) => (
                <Badge key={t} variant="success">
                  {t}
                </Badge>
              ))}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Pemilik</dt>
            <dd className="font-medium text-foreground">Grey Gandaw</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Diperbarui</dt>
            <dd className="font-medium text-foreground">Hari ini, 17.42</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
