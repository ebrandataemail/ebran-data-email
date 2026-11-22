import { useMemo, useState } from "react";
import { safeAccountUrl } from "@/lib/vault/access-safety";
import { useTransientSecret } from "@/lib/vault/use-transient-secret";
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
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { CopyButton, RevealButton } from "@/components/vault/primitives";
import { StatStrip } from "@/components/vault/StatStrip";
import { errorMessage } from "@/components/vault/use-ai";
import { adsDeleteAsset, adsRevealAsset } from "@/lib/ads/ads.functions";
import type { AdsAsset, AdsPlatform } from "@/lib/ads/ads.server";
import { cn } from "@/lib/utils";
import { ADS_ASSETS_KEY, useAdsAssets } from "./use-ads-assets";
import { AdsAssetDialog } from "./AdsAssetDialog";

/** L1 — satu bahasa card, sama dengan halaman Accounts, Developer, dan Proyek. */
const stateCard = "rounded-xl border border-border bg-card shadow-soft";

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
    <div className="min-h-screen bg-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <header className="z-20 border-b border-border bg-background/90 backdrop-blur-md sm:sticky sm:top-0">
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Ads & Marketing
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola akun iklan, token platform, dan relasi kampanye per proyek.
              </p>
            </div>
            <Button onClick={() => setDialog({ open: true, asset: null })}>
              <Plus />
              Tambah Aset
            </Button>
          </div>
        </header>
        <section className="mx-auto max-w-[1280px] space-y-4 px-4 py-6 pb-16 sm:px-8">
          {/* Ringkasan: satu card dengan pemisah garis (bukan tiga card identik) */}
          <StatStrip
            items={[
              { icon: <Megaphone />, value: assets.length, label: "Total aset iklan" },
              { icon: <ShieldCheck />, value: activeCount, label: "Aset aktif" },
              {
                icon: <TriangleAlert />,
                value: expiredCount,
                label: "Token kedaluwarsa / perlu diperiksa",
                attention: true,
              },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, account ID, platform, proyek, client..."
                className="bg-card pl-9"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full bg-card sm:w-44">
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
              <SelectTrigger className="w-full bg-card sm:w-40">
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
            <span className="self-center whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {filtered.length} / {assets.length} aset
            </span>
          </div>
          {isPending ? (
            <div
              className={cn(
                stateCard,
                "flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground",
              )}
            >
              <LoaderCircle className="size-5 animate-spin" />
              Memuat aset iklan...
            </div>
          ) : isError ? (
            <div className={cn(stateCard, "py-16 text-center")}>
              <p className="mb-4 text-sm text-destructive">{errorMessage(error)}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={cn(stateCard, "border-dashed py-16 text-center shadow-none")}>
              <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
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
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

/** Anatomi kartu sama dengan DevAssetCard dan AccountVaultCard: header · isi · footer satu garis pemisah. */
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
  const { secret: revealed, clear, request } = useTransientSecret<string>(asset.id);
  const [busy, setBusy] = useState(false);
  const reveal = async () => {
    if (revealed !== null) {
      clear();
      return;
    }
    setBusy(true);
    try {
      await request(async () => (await revealFn({ data: { id: asset.id } })).value);
    } catch (error) {
      toast.error("Gagal membuka kredensial", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-colors hover:border-border-strong">
      {/* Header: ikon · nama + platform · aksi (AI, edit, hapus) */}
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{asset.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {PLATFORM_LABELS[asset.platform]}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ai-ghost" size="icon-sm" asChild>
                <a href={`/ai?assetId=${asset.id}`} aria-label={`Tanya AI tentang ${asset.name}`}>
                  <Sparkles className="size-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tanya AI</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon-sm" aria-label="Edit aset" onClick={onEdit}>
            <Pencil />
          </Button>
          <Button variant="ghost-danger" size="icon-sm" aria-label="Hapus aset" onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </header>

      {/* Isi */}
      <div className="space-y-3 px-4 pb-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={asset.status === "active" ? "success" : "muted"}>
            {STATUS_LABELS[asset.status] ?? asset.status}
          </Badge>
          <Badge variant="outline">{asset.environment}</Badge>
          {asset.expiresAt && <Badge variant="outline">Exp: {asset.expiresAt}</Badge>}
        </div>
        <div className="space-y-1.5 text-xs">
          {asset.accountIdentifier && (
            <p className="break-all">
              <span className="text-muted-foreground">Account ID: </span>
              <span className="font-mono text-foreground">{asset.accountIdentifier}</span>
            </p>
          )}
          {safeAccountUrl(asset.websiteUrl) && (
            <a
              href={safeAccountUrl(asset.websiteUrl) ?? undefined}
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
        <div className="flex items-center gap-1 rounded-lg bg-muted/70 py-1.5 pl-3 pr-1.5">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80">
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
      </div>

      {/* Footer: satu garis pemisah */}
      <footer className="border-t border-border bg-subtle px-4 py-2.5">
        <span className="text-xs text-muted-foreground">
          Diperbarui {new Date(asset.updatedAt).toLocaleDateString("id-ID")}
        </span>
      </footer>
    </article>
  );
}
