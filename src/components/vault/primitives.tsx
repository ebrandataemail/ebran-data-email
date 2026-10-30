import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export async function copyText(value: string, label = "Nilai") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`, { description: "Tersimpan di clipboard selama 30 detik." });
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
    <div className="flex items-center gap-1">
      <span className={cn("font-mono text-sm tracking-tight text-foreground", className)}>
        {shown ? value : `${prefix}${mask}`}
      </span>
      <RevealButton shown={shown} onToggle={() => setShown((s) => !s)} />
      {copy && <CopyButton value={value} label={label} />}
    </div>
  );
}

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
    <div className="group grid grid-cols-1 gap-1.5 px-5 py-3.5 transition-colors hover:bg-subtle sm:grid-cols-[220px_1fr] sm:items-center sm:gap-6">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        {icon && (
          <span className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground [&_svg]:size-3.5">
            {icon}
          </span>
        )}
        <div className="flex flex-col">
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
        </div>
      </div>
      <div className="flex min-h-7 flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
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
        "flex items-center gap-2.5 rounded-lg border border-border bg-background py-1 pl-2.5 pr-1 shadow-soft transition-colors hover:border-border-strong",
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
