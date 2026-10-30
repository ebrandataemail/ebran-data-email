import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Chrome,
  CodeXml,
  Facebook,
  LoaderCircle,
  Megaphone,
  Music,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { CopyButton, RevealButton } from "@/components/vault/primitives";
import { errorMessage } from "@/components/vault/use-ai";
import { adsDeleteAsset, adsRevealAsset } from "@/lib/ads/ads.functions";
import type { AdsAsset, AdsPlatform } from "@/lib/ads/ads.server";
import { ADS_ASSETS_KEY, useAdsAssets } from "./use-ads-assets";
import { AdsAssetDialog } from "./AdsAssetDialog";
const PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  youtube: "YouTube Ads",
  other: "Lainnya",
};
const PLATFORM_ICONS = {
  meta: Facebook,
  google: Chrome,
  tiktok: Music,
  youtube: Youtube,
  other: CodeXml,
};
const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Tidak aktif",
  expired: "Kedaluwarsa",
  revoked: "Dicabut",
  maintenance: "Maintenance",
  draft: "Draft",
};
export function AdsToolsView() {
  const { data: assets = [], isPending, isError, error, refetch } = useAdsAssets();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(adsDeleteAsset);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; asset: AdsAsset | null }>({
    open: false,
    asset: null,
  });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((item) => {
      const matches =
        !q ||
        [
          item.name,
          item.accountIdentifier,
          item.description,
          item.websiteUrl,
          item.projectName,
          item.clientName,
          item.platform,
          item.status,
        ].some((v) => v?.toLowerCase().includes(q));
      return (
        matches &&
        (platformFilter === "all" || item.platform === platformFilter) &&
        (statusFilter === "all" || item.status === statusFilter)
      );
    });
  }, [assets, search, platformFilter, statusFilter]);
  const removeAsset = async (id: string) => {
    if (!window.confirm("Hapus aset Ads & Marketing ini? Tindakan ini tidak dapat dibatalkan."))
      return;
    try {
      await deleteFn({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ADS_ASSETS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success("Aset Ads & Marketing dihapus.");
    } catch (error) {
      toast.error("Gagal menghapus aset", { description: errorMessage(error) });
    }
  };
  const activeCount = assets.filter((a) => a.status === "active").length;
  const expiredCount = assets.filter(
    (a) =>
      a.status === "expired" ||
      (a.expiresAt && a.expiresAt <= new Date().toISOString().slice(0, 10)),
  ).length;
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <header className="z-20 border-b border-border bg-background/90 backdrop-blur-md sm:sticky sm:top-0">
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
                <Megaphone className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Ads & Marketing</h1>
                <p className="text-sm text-muted-foreground">
                  Kelola akun iklan, token platform, dan relasi kampanye per proyek.
                </p>
              </div>
            </div>
            <Button onClick={() => setDialog({ open: true, asset: null })}>
              <Plus />
              Tambah Aset
            </Button>
          </div>
        </header>
        <section className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-16 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-semibold tabular-nums">{assets.length}</p>
              <p className="text-xs text-muted-foreground">Total aset iklan</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-semibold tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aset aktif</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-semibold tabular-nums">{expiredCount}</p>
              <p className="text-xs text-muted-foreground">Token kedaluwarsa / perlu diperiksa</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, account ID, platform, proyek, client..."
                className="pl-9"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Semua platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua platform</SelectItem>
                {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPending ? (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              Memuat aset iklan...
            </div>
          ) : isError ? (
            <div className="py-20 text-center">
              <p className="mb-4 text-sm text-destructive">{errorMessage(error)}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <p className="font-medium">
                {assets.length ? "Tidak ada aset yang cocok" : "Belum ada aset Ads & Marketing"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan akun iklan atau kredensial platform untuk mulai mengelola.
              </p>
              {!assets.length && (
                <Button className="mt-4" onClick={() => setDialog({ open: true, asset: null })}>
                  <Plus />
                  Tambah Aset Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <AdsAssetCard
                  key={item.id}
                  asset={item}
                  onEdit={() => setDialog({ open: true, asset: item })}
                  onDelete={() => removeAsset(item.id)}
                />
              ))}
            </div>
          )}
        </section>
        <AdsAssetDialog
          open={dialog.open}
          asset={dialog.asset}
          onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        />
      </main>
    </div>
  );
}
function AdsAssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: AdsAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = PLATFORM_ICONS[asset.platform] ?? CodeXml;
  const revealFn = useServerFn(adsRevealAsset);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reveal = async () => {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setBusy(true);
    try {
      const r = await revealFn({ data: { id: asset.id } });
      setRevealed(r.value);
    } catch (error) {
      toast.error("Gagal membuka kredensial", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-xl border border-border bg-card shadow-card transition-colors hover:border-border-strong">
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{asset.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {PLATFORM_LABELS[asset.platform]}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit aset" onClick={onEdit}>
              <Pencil />
            </Button>
            <Button
              variant="ghost-danger"
              size="icon-sm"
              aria-label="Hapus aset"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={asset.status === "active" ? "success" : "muted"}>
            {STATUS_LABELS[asset.status] ?? asset.status}
          </Badge>
          <Badge variant="outline">{asset.environment}</Badge>
          {asset.expiresAt && <Badge variant="outline">Exp: {asset.expiresAt}</Badge>}
        </div>
        <div className="space-y-2 text-xs">
          {asset.accountIdentifier && (
            <p>
              <span className="text-muted-foreground">Account ID: </span>
              <span className="font-mono">{asset.accountIdentifier}</span>
            </p>
          )}
          {asset.websiteUrl && (
            <a
              href={asset.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-primary hover:underline"
            >
              {asset.websiteUrl}
            </a>
          )}
          <p className="text-muted-foreground">
            {asset.projectName ?? "Tanpa proyek"}
            {asset.clientName ? ` · ${asset.clientName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-subtle p-3">
          <code className="min-w-0 flex-1 truncate text-xs">
            {busy ? "Mendekripsi..." : (revealed ?? "••••••••••••••••")}
          </code>
          <RevealButton shown={revealed !== null} onToggle={reveal} />
          {revealed !== null && <CopyButton value={revealed} label="Kredensial iklan" />}
        </div>
        {asset.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {asset.description}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">
            Diperbarui {new Date(asset.updatedAt).toLocaleDateString("id-ID")}
          </span>
          <a
            href={`/ai?assetId=${asset.id}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-accent"
          >
            <Sparkles className="size-3.5" />
            Tanya AI
          </a>
        </div>
      </div>
    </article>
  );
}
