import {
  ArrowUpRight,
  ChevronRight,
  Ellipsis,
  ExternalLink,
  Instagram,
  KeyRound,
  LogIn,
  Menu,
  Search,
  SquarePen,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { asset } from "@/data/asset";
import { SidebarContents } from "./AppSidebar";
import { triggerAssetCommandPalette } from "@/lib/vault/palette-trigger";
import { CopyButton, QuickChip, SecretValue, StatusDot } from "./primitives";

export function AssetHeader() {
  return (
    <header className="z-20 border-b sm:sticky sm:top-0 border-border bg-background/90 backdrop-blur-md">
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
        <div className="ml-auto flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerAssetCommandPalette}
            className="h-8 gap-2 border-border/80 bg-background/80 px-2.5 text-xs text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
            aria-label="Cari aset digital (Cmd+K)"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Cari aset digital...</span>
            <span className="sm:hidden">Cari</span>
            <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </Button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span>Disinkronkan oleh</span>
            <Badge variant="ai">
              <span className="text-[10px]">✨</span> AI
            </Badge>
            <span>· 2 menit lalu</span>
          </div>
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
