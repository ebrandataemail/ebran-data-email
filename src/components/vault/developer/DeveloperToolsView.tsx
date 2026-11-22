import { safeAccountUrl } from "@/lib/vault/access-safety";
import { useTransientSecret } from "@/lib/vault/use-transient-secret";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CodeXml,
  Database,
  FileText,
  KeyRound,
  LayoutGrid,
  List,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Terminal,
  Folder,
  Trash2,
  Webhook,
  Sparkles,
  ChevronDown,
  Calendar,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/vault/AppSidebar";
import {
  CopyButton,
  FieldRow,
  RevealButton,
  StatusDot,
  VaultTabTrigger,
} from "@/components/vault/primitives";
import { errorMessage } from "@/components/vault/use-ai";
import { devDeleteAsset, devRevealAsset } from "@/lib/developer/developer.functions";
import type { DevAsset } from "@/lib/developer/developer.server";
import { DEV_ASSETS_KEY, useDevAssets } from "./use-dev-assets";
import { DevAssetDialog } from "./DevAssetDialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";

/** L1 — satu bahasa card, sama dengan halaman Accounts dan Proyek. */
const stateCard = "rounded-xl border border-border bg-card shadow-soft";

const TYPE_ICONS: Record<string, typeof CodeXml> = {
  api_key: KeyRound,
  webhook: Webhook,
  env_var: Terminal,
  ssh_key: ShieldCheck,
  db_connection: Database,
  app_account: CodeXml,
  website: CodeXml,
  domain: CodeXml,
  hosting: Database,
  repository: CodeXml,
  package: CodeXml,
  oauth_app: KeyRound,
  cloud_service: Database,
  ai_model: Sparkles,
  ai_agent: Sparkles,
  robot: Terminal,
  automation: Webhook,
  other: CodeXml,
};

const TYPE_LABELS: Record<string, string> = {
  api_key: "API Key",
  webhook: "Webhook",
  env_var: "Env Var",
  ssh_key: "SSH Key",
  db_connection: "Database",
  app_account: "Akun Aplikasi",
  website: "Website",
  domain: "Domain",
  hosting: "Hosting / Server",
  repository: "Repository / Git",
  package: "Package / Library",
  oauth_app: "OAuth App",
  cloud_service: "Cloud Service",
  ai_model: "AI Model / Provider",
  ai_agent: "AI Agent",
  robot: "Bot / Robot / RPA",
  automation: "Automation",
  other: "Lainnya",
};

export function DeveloperToolsView() {
  const { data: assets = [], isPending, isError, error, refetch } = useDevAssets();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(devDeleteAsset);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [editing, setEditing] = useState<{ open: boolean; asset: DevAsset | null }>({
    open: false,
    asset: null,
  });

  const filtered = assets.filter((a) => {
    const q = query.toLowerCase();
    const m =
      a.name.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q) ||
      (a.provider ?? "").toLowerCase().includes(q) ||
      (a.username ?? "").toLowerCase().includes(q) ||
      (a.websiteUrl ?? "").toLowerCase().includes(q) ||
      a.environment.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q) ||
      (a.projectName ?? "").toLowerCase().includes(q) ||
      (a.clientName ?? "").toLowerCase().includes(q);
    const t = filter === "all" || a.type === filter;
    return m && t;
  });

  const confirmDelete = async (id: string) => {
    if (!window.confirm("Hapus aset developer ini?")) return;
    try {
      await deleteFn({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: DEV_ASSETS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success("Aset dihapus");
    } catch (err) {
      toast.error("Gagal menghapus", { description: errorMessage(err) });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <header className="z-20 border-b border-border bg-background/90 backdrop-blur-md sm:sticky sm:top-0">
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Developer Tools
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola akun aplikasi, website, API, AI, Agent, Bot, dan kredensial developer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setEditing({ open: true, asset: null })}>
                <Plus />
                Tambah Aset
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-6 pb-16 sm:px-8">
          {/* Toolbar: datar di atas canvas, sama dengan halaman Accounts */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama aset, deskripsi..."
                className="bg-card pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full bg-card sm:w-48">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-soft">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-pressed={viewMode === "card"}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  viewMode === "card"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  viewMode === "table"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Tampilan Tabel"
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {filtered.length} / {assets.length} aset
            </span>
          </div>

          {isPending ? (
            <div
              className={cn(
                stateCard,
                "flex flex-col items-center justify-center py-20 text-sm text-muted-foreground",
              )}
            >
              <LoaderCircle className="mb-3 size-6 animate-spin" />
              <p>Memuat aset developer...</p>
            </div>
          ) : isError ? (
            <div className={cn(stateCard, "flex flex-col items-center justify-center py-20 text-center")}>
              <p className="mb-4 text-sm text-destructive">{errorMessage(error)}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className={cn(
                stateCard,
                "flex flex-col items-center justify-center border-dashed py-20 text-center shadow-none",
              )}
            >
              <CodeXml className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Tidak ada aset ditemukan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Coba sesuaikan pencarian atau tambah aset baru.
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <DevAssetCard
                  key={a.id}
                  asset={a}
                  onEdit={() => setEditing({ open: true, asset: a })}
                  onDelete={() => confirmDelete(a.id)}
                />
              ))}
            </div>
          ) : (
            <div className={cn(stateCard, "overflow-hidden")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Aset</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Environment / Status</TableHead>
                    <TableHead>Proyek / Client</TableHead>
                    <TableHead>Terakhir Update</TableHead>
                    <TableHead className="pr-6 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="pl-6 font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {TYPE_LABELS[a.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.provider ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="capitalize">{a.environment}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="capitalize">{a.status}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.projectName ?? "—"}
                        {a.clientName ? ` · ${a.clientName}` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.updatedAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${a.name}`}
                            onClick={() => setEditing({ open: true, asset: a })}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost-danger"
                            size="icon-sm"
                            aria-label={`Hapus ${a.name}`}
                            onClick={() => confirmDelete(a.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DevAssetDialog
          open={editing.open}
          asset={editing.asset}
          onOpenChange={(o) => setEditing((s) => ({ ...s, open: o }))}
        />
      </main>
    </div>
  );
}

/**
 * Anatomi kartu sama dengan AccountVaultCard (satu level elevasi):
 *  header (ikon · nama + tipe · aksi) → isi (deskripsi, nilai rahasia, badge) → detail (tab, baris dipisah garis)
 * Nama, tipe, status, dan environment tampil sekali (di header/badge), tidak diulang di tab detail.
 */
function DevAssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: DevAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[asset.type] || CodeXml;
  const { secret: revealedValue, clear, request } = useTransientSecret<string>(asset.id);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const revealFn = useServerFn(devRevealAsset);

  const toggleReveal = async () => {
    if (revealedValue !== null) {
      clear();
      return;
    }
    setBusy(true);
    try {
      await request(async () => (await revealFn({ data: { id: asset.id } })).value);
    } catch (error) {
      toast.error("Gagal membuka nilai", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-colors hover:border-border-strong">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{asset.name}</h3>
            <span className="text-xs text-muted-foreground">{TYPE_LABELS[asset.type]}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            title={expanded ? "Tutup Detail" : "Lihat Detail"}
            aria-label={expanded ? "Tutup detail aset" : "Lihat detail aset"}
          >
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit aset">
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit aset</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost-danger"
            size="icon-sm"
            onClick={onDelete}
            title="Hapus"
            aria-label="Hapus aset"
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      {/* Isi: deskripsi, nilai rahasia (inset), badge */}
      <div className="space-y-3 px-4 pb-4">
        <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
          {asset.description || "Tidak ada deskripsi."}
        </p>

        <div className="flex items-center justify-between gap-3 overflow-hidden rounded-lg bg-muted/70 py-1.5 pl-3 pr-1.5">
          <code className="flex-1 truncate font-mono text-xs text-foreground/80">
            {busy ? "Mendekripsi..." : (revealedValue ?? "••••••••••••••••")}
          </code>
          <div className="flex shrink-0 items-center gap-0.5">
            <RevealButton shown={revealedValue !== null} onToggle={toggleReveal} />
            {revealedValue !== null && <CopyButton value={revealedValue} label="Kredensial" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={asset.status === "active" ? "success" : "muted"} className="capitalize">
            {asset.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {asset.environment}
          </Badge>
          {asset.projectName ? (
            <Badge variant="muted" className="max-w-full gap-1">
              <StatusDot className="size-1" />
              <span className="truncate">{asset.projectName}</span>
            </Badge>
          ) : (
            <span className="text-xs italic text-muted-foreground">Belum ditautkan</span>
          )}
        </div>
      </div>

      {/* Detail: tab garis-bawah yang sama dengan kartu akun, baris dipisah garis (tanpa Panel bergaris) */}
      {expanded && (
        <div className="animate-in fade-in border-t border-border duration-150">
          <Tabs defaultValue="info">
            <div className="overflow-x-auto border-b border-border bg-subtle px-2">
              <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                <VaultTabTrigger value="info" icon={<CodeXml />}>
                  Info aset
                </VaultTabTrigger>
                <VaultTabTrigger value="catatan" icon={<FileText />}>
                  Catatan
                </VaultTabTrigger>
              </TabsList>
            </div>
            <TabsContent value="info" className="mt-0 divide-y divide-border">
              <FieldRow icon={<CodeXml />} label="Provider / Platform">
                {asset.provider || "—"}
              </FieldRow>
              <FieldRow icon={<CodeXml />} label="Website / Dashboard">
                {safeAccountUrl(asset.websiteUrl) ? (
                  <a
                    className="break-all text-primary hover:underline"
                    href={safeAccountUrl(asset.websiteUrl) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {asset.websiteUrl}
                  </a>
                ) : (
                  "—"
                )}
              </FieldRow>
              <FieldRow icon={<Terminal />} label="Username / Account ID">
                {asset.username || "—"}
              </FieldRow>
              <FieldRow icon={<Calendar />} label="Kedaluwarsa">
                {asset.expiresAt
                  ? new Date(asset.expiresAt).toLocaleDateString("id-ID")
                  : "Tidak ditentukan"}
              </FieldRow>
              <FieldRow icon={<Folder />} label="Proyek Workspace">
                {asset.projectName || "—"}
              </FieldRow>
              <FieldRow icon={<Folder />} label="Client">
                {asset.clientName || "—"}
              </FieldRow>
              <FieldRow icon={<Calendar />} label="Dibuat Pada">
                {new Date(asset.createdAt).toLocaleDateString("id-ID")}
              </FieldRow>
            </TabsContent>
            <TabsContent value="catatan" className="mt-0 px-4 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {asset.description || "Tidak ada deskripsi."}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </article>
  );
}
