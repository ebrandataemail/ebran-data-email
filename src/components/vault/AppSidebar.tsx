import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import {
  LogOut,
  AtSign,
  ChevronsUpDown,
  CodeXml,
  Folder,
  Mail,
  Megaphone,
  Plus,
  Sparkles,
} from "lucide-react";

import appMark from "@/assets/app-mark.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { categories, projects, tags } from "@/data/asset";
import { cn } from "@/lib/utils";
import { StatusDot } from "./primitives";
import { useAccounts } from "./accounts/use-accounts";

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

type NavTarget = "/vault" | "/accounts" | "/ai";

function NavItem({
  icon,
  label,
  count,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number | undefined;
  to?: NavTarget | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = !!to && pathname === to;
  const className = cn(
    "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
    active
      ? "bg-background text-foreground shadow-soft ring-1 ring-border"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  );
  const inner = (
    <>
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
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-current={active ? "page" : undefined} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href="#" onClick={(e) => e.preventDefault()} className={className}>
      {inner}
    </a>
  );
}

const categoryRoutes: Partial<Record<string, NavTarget>> = { email: "/accounts", social: "/vault" };

export function SidebarContents() {
  const { data: accounts } = useAccounts();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img src={appMark} alt="" width={32} height={32} className="size-8 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">Ebran Aset Digital</span>
          <span className="truncate text-[11px] text-muted-foreground">
            Arsip Data Pribadi Aman
          </span>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-5">
        <div className="px-1">
          <NavItem icon={<Sparkles />} label="Tanya AI" to="/ai" />
        </div>
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
                  count={c.key === "email" ? accounts?.length : c.count}
                  to={categoryRoutes[c.key]}
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
      <UserFooter />
    </div>
  );
}

function UserFooter() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const email = user.email ?? "Pengguna";
  const initials = email.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "/vault" }, replace: true });
  };

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent">
        <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground ring-1 ring-border">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[13px] font-semibold text-foreground">{email}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <StatusDot className="size-1.5" />
            AI aktif
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Keluar" onClick={signOut}>
              <LogOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keluar</TooltipContent>
        </Tooltip>
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
