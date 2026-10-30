import {
  ArrowUpRight,
  ChevronRight,
  Ellipsis,
  ExternalLink,
  Instagram,
  KeyRound,
  LogIn,
  Menu,
  SquarePen,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { asset } from "@/data/asset";
import { SidebarContents } from "./AppSidebar";
import { CopyButton, SecretValue, StatusDot } from "./primitives";

function QuickChip({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background py-1 pl-2.5 pr-1 shadow-soft transition-colors hover:border-border-strong">
      <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="h-4 w-px bg-border" />
      {children}
    </div>
  );
}

export function AssetHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      {/* Breadcrumb bar */}
      <div className="flex h-12 items-center gap-2 border-b border-border px-4 sm:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Buka menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
            <SidebarContents />
          </SheetContent>
        </Sheet>
        <nav className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Kategori</span>
          <ChevronRight className="hidden size-3.5 sm:inline" />
          <span>{asset.category}</span>
          <ChevronRight className="size-3.5" />
          <span className="truncate font-medium text-foreground">{asset.title}</span>
        </nav>
        <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span>Disinkronkan oleh</span>
          <Badge variant="ai">
            <span className="text-[10px]">✨</span> Hermes Agent
          </Badge>
          <span>· 2 menit lalu</span>
        </div>
      </div>

      {/* Title row */}
      <div className="flex flex-col gap-5 px-4 pb-4 pt-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-instagram text-brand-contrast shadow-card">
              <Instagram className="size-7" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {asset.title}
                </h1>
                <Badge variant="success">
                  <StatusDot className="size-1.5" />
                  {asset.status}
                </Badge>
              </div>
              <a
                href={`https://${asset.publicUrl}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
              >
                {asset.publicUrl}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Opsi lainnya">
              <Ellipsis />
            </Button>
            <Button>
              <SquarePen />
              Edit Aset
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <QuickChip icon={<UserRound />} label="Username">
            <span className="font-mono text-sm text-foreground">{asset.username}</span>
            <CopyButton value={asset.username} label="Username" />
          </QuickChip>
          <QuickChip icon={<KeyRound />} label="Password">
            <SecretValue value={asset.password} label="Password" />
          </QuickChip>
          <Button variant="outline" size="sm" className="h-9" asChild>
            <a href={asset.loginUrl} target="_blank" rel="noreferrer">
              <LogIn />
              Link Login
              <ArrowUpRight className="text-muted-foreground" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
