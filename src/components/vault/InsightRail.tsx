import { useState } from "react";
import { CalendarClock, LoaderCircle, MessageSquareText, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { asset } from "@/data/asset";
import { cn } from "@/lib/utils";
import { HermesChatSheet } from "./HermesChat";
import { useHermesAudit } from "./use-hermes";

// Shown until Hermes runs its first live audit in this session.
const defaultInsights = [
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
  const { audit, running, run } = useHermesAudit();
  const [chatOpen, setChatOpen] = useState(false);
  const score = audit?.score ?? 86;
  const insights = audit?.insights ?? defaultInsights;

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
          <div className="flex items-center gap-1">
            <Button
              variant="ai-ghost"
              size="icon-sm"
              aria-label="Analisis ulang dengan Hermes AI"
              title="Analisis ulang dengan Hermes AI"
              onClick={run}
              disabled={running}
            >
              {running ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            </Button>
            <Badge variant="ai">{audit ? "Live" : "AI"}</Badge>
          </div>
        </div>

        <div className={cn("mt-4 flex items-end gap-2 transition-opacity", running && "opacity-50")}>
          <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">{score}</span>
          <span className="pb-1.5 text-sm text-muted-foreground">/ 100 skor keamanan</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-gradient-ai transition-[width] duration-700" style={{ width: `${score}%` }} />
        </div>
        {audit?.headline && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{audit.headline}</p>}

        <ul className={cn("mt-5 space-y-3.5 transition-opacity", running && "ai-shimmer opacity-60")}>
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

        {!audit && (
          <p className="mt-4 text-[11px] text-muted-foreground">Contoh insight. Tekan ↻ agar Hermes menganalisis data terbaru.</p>
        )}

        <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => setChatOpen(true)}>
          <MessageSquareText className="text-ai" />
          Tanya Hermes tentang aset ini
        </Button>
      </section>

      <HermesChatSheet open={chatOpen} onOpenChange={setChatOpen} />

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
