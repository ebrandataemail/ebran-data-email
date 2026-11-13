import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * ELEVASI — 3 level, tiap level punya "bahasa" visual sendiri:
 *
 *  L0  Canvas   bg-canvas                         (latar halaman)
 *  L1  Card     rounded-xl + border + shadow-soft (satu entitas: 1 akun, 1 proyek)
 *  L2  Isi card TANPA kotak lagi: pemisah garis (divide-y), bukan border+radius+shadow
 *
 * Aturan emas: jangan pernah "kotak di dalam kotak di dalam kotak".
 */

export async function copyText(value: string, label = "Nilai") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`);
  } catch {
    toast.error("Gagal menyalin ke clipboard");
  }
}

export function CopyButton({ value, label }: { value: string; label?: string | undefined }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Salin ${label ?? ""}`.trim()}
          onClick={() => {
            copyText(value, label);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Tersalin" : "Salin"}</TooltipContent>
    </Tooltip>
  );
}

export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={shown ? "Sembunyikan" : "Tampilkan"}
          onClick={onToggle}
        >
          {shown ? <EyeOff /> : <Eye />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{shown ? "Sembunyikan" : "Tampilkan"}</TooltipContent>
    </Tooltip>
  );
}

export function SecretValue({
  value,
  label,
  mask = "•••••••••",
  prefix = "",
  copy = true,
  className,
}: {
  value: string;
  label?: string;
  mask?: string;
  prefix?: string;
  copy?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex min-w-0 max-w-full items-center gap-1">
      <span className={cn("min-w-0 break-all font-mono text-sm text-foreground", className)}>
        {shown ? value : `${prefix}${mask}`}
      </span>
      <RevealButton shown={shown} onToggle={() => setShown((s) => !s)} />
      {copy && <CopyButton value={value} label={label} />}
    </div>
  );
}

/** Baris label → nilai. Ikon dibuat polos (tanpa kotak) supaya tidak jadi "kotak kecil" ekstra. */
export function FieldRow({
  icon,
  label,
  hint,
  children,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 px-4 py-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center sm:gap-6 sm:px-5">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        {icon && <span className="[&_svg]:size-4">{icon}</span>}
        <div className="flex flex-col">
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
        </div>
      </div>
      <div className="flex min-h-7 min-w-0 flex-wrap items-center gap-2 break-all text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

/**
 * Panel dengan dua varian:
 *  - "card" (default): L1, berdiri sendiri di atas canvas.
 *  - "flat": dipakai DI DALAM card/tab — tanpa border, radius, dan shadow.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  variant = "card",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "card" | "flat";
}) {
  const flat = variant === "flat";
  return (
    <section
      className={cn(
        flat ? "bg-transparent" : "overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      <header
        className={cn(
          "grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5",
          !flat && "border-b border-border",
        )}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Satu-satunya definisi gaya tab garis-bawah, supaya semua tab di vault konsisten. */
export function VaultTabTrigger({
  value,
  icon,
  children,
}: {
  value: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-11 flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3.5 text-[13px] font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none [&_svg]:size-4"
    >
      {icon}
      {children}
    </TabsTrigger>
  );
}

export function StatusDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  );
}

export function QuickChip({
  icon,
  label,
  children,
  className,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-background py-1 pl-2.5 pr-1 shadow-soft transition-colors hover:border-border-strong",
        className,
      )}
    >
      <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="h-4 w-px bg-border" />
      {children}
    </div>
  );
}
