import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import {
  LogOut,
  AtSign,
  CodeXml,
  Folder,
  LayoutDashboard,
  Mail,
  Megaphone,
  Sparkles,
  Settings2,
  Users,
  Menu,
  Search,
} from "lucide-react";

import appMark from "@/assets/app-mark.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { triggerAssetCommandPalette } from "@/lib/vault/palette-trigger";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { categories, tags } from "@/data/asset";
import { cn } from "@/lib/utils";
import { StatusDot } from "./primitives";
import { useAccounts } from "./accounts/use-accounts";
import { useDevAssets } from "./developer/use-dev-assets";
import { useAdsAssets } from "./ads/use-ads-assets";

const categoryIcons = {
  email: Mail,
  dev: CodeXml,
  ads: Megaphone,
  social: AtSign,
} as const;

/** Label seksi: sentence case, tanpa tombol palsu. */
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-1.5 px-3">
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
    </div>
  );
}

type NavTarget =
  | "/vault"
  | "/accounts"
  | "/ai"
  | "/projects"
  | "/workboard"
  | "/workboard-settings"
  | "/clients"
  | "/developer-tools"
  | "/ads"
  | "/social";

/** "Tanya AI" adalah fitur utama, bukan sekadar menu: ia punya bahasa visual emas sendiri. */
function AskAiItem() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === "/ai";
  return (
    <Link
      to="/ai"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-semibold text-ai-foreground transition-colors",
        active
          ? "border-ai/40 bg-ai-soft"
          : "border-transparent bg-ai-soft/60 hover:border-ai/30 hover:bg-ai-soft",
      )}
    >
      <Sparkles className="size-4" />
      <span className="flex-1">Tanya AI</span>
    </Link>
  );
}

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
    "group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
    active
      ? "bg-background font-semibold text-foreground shadow-soft ring-1 ring-border before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
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

const categoryRoutes: Partial<Record<string, NavTarget>> = {
  email: "/accounts",
  dev: "/developer-tools",
  ads: "/ads",
  social: "/social",
};

export function SidebarContents({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { data: accounts } = useAccounts();
  const { data: devAssets } = useDevAssets();
  const { data: adsAssets } = useAdsAssets();

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img src={appMark} alt="" width={32} height={32} className="size-8 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">Ebran Aset Digital</span>
          <span className="truncate text-[11px] text-muted-foreground">
            Arsip Data Pribadi Aman
          </span>
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 space-y-6 overflow-y-auto px-2 py-5"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a[href]")) onNavigate?.();
        }}
      >
        <div className="px-1">
          <AskAiItem />
        </div>
        <div>
          <SectionLabel>Proyek & client</SectionLabel>
          <div className="space-y-0.5">
            <NavItem icon={<Folder />} label="Semua Proyek" to="/projects" />
            <NavItem icon={<LayoutDashboard />} label="Papan Kerja" to="/workboard" />
            <NavItem icon={<Settings2 />} label="Pengaturan & Peringatan" to="/workboard-settings" />
            <NavItem icon={<Users />} label="Client" to="/clients" />
          </div>
        </div>

        <div>
          <SectionLabel>Kategori</SectionLabel>
          <div className="space-y-0.5">
            {categories.map((c) => {
              const Icon = categoryIcons[c.key as keyof typeof categoryIcons];
              const count =
                c.key === "email"
                  ? accounts?.length
                  : c.key === "dev"
                    ? devAssets?.length
                    : c.key === "ads"
                      ? adsAssets?.length
                      : c.count;
              return (
                <NavItem
                  key={c.name}
                  icon={<Icon />}
                  label={c.name}
                  count={count}
                  to={categoryRoutes[c.key]}
                />
              );
            })}
          </div>
        </div>

        <div>
          <SectionLabel>Tag</SectionLabel>
          {/* Tag belum punya aksi (filter), jadi tampil sebagai label biasa, bukan tombol. */}
          <div className="flex flex-wrap gap-1.5 px-3">
            {tags.map((t) => (
              <Badge key={t.label} variant={t.tone}>
                {t.label}
              </Badge>
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
    <div className="shrink-0 border-t border-sidebar-border p-3">
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarContents />
      </aside>
      <div className="mobile-app-navigation sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Buka navigasi" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <Link to="/workboard" className="flex min-w-0 items-center gap-2">
          <img src={appMark} alt="" width={28} height={28} className="size-7 shrink-0" />
          <span className="truncate text-sm font-semibold">Ebran Aset Digital</span>
        </Link>
        <Button variant="ghost" size="icon" aria-label="Cari aset" onClick={triggerAssetCommandPalette}>
          <Search />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[calc(100vw-2rem)] p-0">
          <SheetTitle className="sr-only">Navigasi Ebran Aset Digital</SheetTitle>
          <SheetDescription className="sr-only">
            Halaman akun, client, proyek, dan papan kerja.
          </SheetDescription>
          <SidebarContents onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
