import { useEffect, useState } from "react";
import {
  AtSign,
  ChevronsUpDown,
  CodeXml,
  Folder,
  KeyRound,
  Mail,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  Vault,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { categories, projects, tags } from "@/data/asset";
import { cn } from "@/lib/utils";
import { StatusDot } from "./primitives";

const categoryIcons = {
  email: Mail,
  dev: CodeXml,
  social: AtSign,
  ads: Megaphone,
} as const;

function SectionLabel({ children, action }: { children: string; action?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        {children}
      </span>
      {action && (
        <button
          type="button"
          aria-label={`Tambah ${children}`}
          className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-soft ring-1 ring-border"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "[&_svg]:size-4",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-[11px] tabular-nums text-muted-foreground/80">{count}</span>
      )}
    </a>
  );
}

function CommandBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background p-[1px] text-left shadow-soft transition-all hover:border-ai/50 hover:shadow-ai"
      >
        <span className="flex w-full items-center gap-1.5 rounded-[7px] bg-gradient-ai-soft px-2 py-2">
          <Sparkles className="size-3.5 shrink-0 text-ai" />
          <span className="flex-1 truncate text-[11px] tracking-tight text-muted-foreground group-hover:text-foreground">
            Ask Hermes AI or Search (Cmd+K)
          </span>
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="✨ Ask Hermes AI or Search (Cmd+K)" />
        <CommandList>
          <CommandEmpty>Tidak ada hasil. Tekan Enter untuk bertanya ke Hermes AI.</CommandEmpty>
          <CommandGroup heading="Hermes AI">
            <CommandItem onSelect={() => setOpen(false)}>
              <Sparkles className="text-ai" />
              Akun mana yang token API-nya hampir kedaluwarsa?
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <ShieldCheck className="text-ai" />
              Jalankan audit keamanan untuk semua akun #Production
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Aset">
            <CommandItem onSelect={() => setOpen(false)}>
              <AtSign />
              Instagram - Newton Badminton
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <Mail />
              Gmail - newton@gmail.com
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <KeyRound />
              SocioAPI - Production Keys
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function SidebarContents() {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
          <Vault className="size-4" />
          <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-gradient-ai ring-2 ring-sidebar">
            <Sparkles className="size-2 text-ai-contrast" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">Hermes Asset Vault</span>
          <span className="text-[11px] text-muted-foreground">Workspace Grey</span>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>

      <div className="px-2.5 pt-4">
        <CommandBar />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-5">
        <div>
          <SectionLabel action>PROYEK & CLIENT</SectionLabel>
          <div className="space-y-0.5">
            {projects.map((p) => (
              <NavItem key={p.name} icon={<Folder />} label={p.name} count={p.count} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>KATEGORI</SectionLabel>
          <div className="space-y-0.5">
            {categories.map((c) => {
              const Icon = categoryIcons[c.key];
              return (
                <NavItem
                  key={c.name}
                  icon={<Icon />}
                  label={c.name}
                  count={c.count}
                  active={"active" in c && c.active}
                />
              );
            })}
          </div>
        </div>

        <div>
          <SectionLabel action>TAGS</SectionLabel>
          <div className="flex flex-wrap gap-1.5 px-3">
            {tags.map((t) => (
              <button key={t.label} type="button" className="cursor-pointer">
                <Badge variant={t.tone} className="transition-opacity hover:opacity-80">
                  {t.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent">
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground ring-1 ring-border">
            GG
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold text-foreground">Grey Gandaw</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <StatusDot className="size-1.5" />
              Hermes Agent online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
      <SidebarContents />
    </aside>
  );
}
