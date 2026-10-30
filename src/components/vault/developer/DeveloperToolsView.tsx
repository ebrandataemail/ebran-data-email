import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CodeXml,
  Database,
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
  ChevronUp,
  Calendar,
  X,
  Check,
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
import { CopyButton, RevealButton, StatusDot } from "@/components/vault/primitives";
import { errorMessage } from "@/components/vault/use-ai";
import { devDeleteAsset, devRevealAsset, devSaveAsset } from "@/lib/developer/developer.functions";
import type { DevAsset, DevAssetType } from "@/lib/developer/developer.server";
import { DEV_ASSETS_KEY, useDevAssets } from "./use-dev-assets";
import { DevAssetDialog } from "./DevAssetDialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, FieldRow } from "@/components/vault/primitives";
import { workspaceList } from "@/lib/projects/projects.functions";
import { useQuery } from "@tanstack/react-query";

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
      toast.success("Aset dihapus");
    } catch (err) {
      toast.error("Gagal menghapus", { description: errorMessage(err) });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <header className="z-20 border-b border-border bg-background/90 backdrop-blur-md sm:sticky sm:top-0">
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
                <CodeXml className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Developer Tools
                </h1>
                <p className="text-sm text-muted-foreground">
                  Kelola akun aplikasi, website, API, AI, Agent, Bot, dan kredensial developer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setEditing({ open: true, asset: null })}>
                <Plus />
                Tambah Aset
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-16 sm:px-8">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama aset, deskripsi..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="sm:w-48">
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
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                onClick={() => setViewMode("card")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === "card"
                    ? "bg-background shadow-soft text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === "table"
                    ? "bg-background shadow-soft text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {isPending ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <LoaderCircle className="size-8 animate-spin mb-4" />
              <p>Memuat aset developer...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-destructive mb-4">{errorMessage(error)}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
              <CodeXml className="size-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm font-medium text-foreground">Tidak ada aset ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coba sesuaikan pencarian atau tambah aset baru.
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Aset</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Environment / Status</TableHead>
                    <TableHead>Proyek / Client</TableHead>
                    <TableHead>Terakhir Update</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
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
                      <TableCell className="text-muted-foreground text-xs">{a.provider ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        <span className="capitalize">{a.environment}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="capitalize">{a.status}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {a.projectName ?? "—"}{a.clientName ? ` · ${a.clientName}` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(a.updatedAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditing({ open: true, asset: a })}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost-danger"
                            size="icon-sm"
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
  const queryClient = useQueryClient();
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  // Form states
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description ?? "");
  const [type, setType] = useState(asset.type);
  const [projectId, setProjectId] = useState(asset.projectId ?? "none");

  const revealFn = useServerFn(devRevealAsset);
  const saveFn = useServerFn(devSaveAsset);

  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });

  const toggleReveal = async () => {
    if (revealedValue) {
      setRevealedValue(null);
      return;
    }
    setBusy(true);
    try {
      const res = await revealFn({ data: { id: asset.id } });
      setRevealedValue(res.value);
    } catch (err) {
      toast.error("Gagal membuka nilai", { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setSaveBusy(true);
    try {
      await saveFn({
        data: {
          id: asset.id,
          name,
          description,
          type,
          provider: asset.provider,
          websiteUrl: asset.websiteUrl,
          username: asset.username,
          environment: asset.environment,
          status: asset.status,
          expiresAt: asset.expiresAt,
          projectId: projectId === "none" ? null : projectId,
          metadata: asset.metadata,
        },
      });
      await queryClient.invalidateQueries({ queryKey: DEV_ASSETS_KEY });
      toast.success("Aset diperbarui");
      setIsEditing(false);
    } catch (err) {
      toast.error("Gagal menyimpan", { description: errorMessage(err) });
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCancel = () => {
    setName(asset.name);
    setDescription(asset.description ?? "");
    setType(asset.type);
    setProjectId(asset.projectId ?? "none");
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border bg-card shadow-card transition-all",
        isEditing
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border hover:border-border-strong",
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg shadow-sm transition-colors",
                isEditing
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground line-clamp-1">{asset.name}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {TYPE_LABELS[asset.type]}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {!isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setExpanded(!expanded)}
                  title={expanded ? "Tutup Detail" : "Lihat Detail"}
                >
                  {expanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onEdit}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit, Refine & Adjust</TooltipContent>
                </Tooltip>
                <Button variant="ghost-danger" size="icon-xs" onClick={onDelete} title="Hapus">
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon-xs" onClick={handleCancel} disabled={saveBusy}>
                  <X className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={handleSave} disabled={saveBusy}>
                  {saveBusy ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-8 mb-3">
            {asset.description || "Tidak ada deskripsi."}
          </p>
          <div className="rounded-lg bg-subtle p-3 flex items-center justify-between gap-3 overflow-hidden">
            <code className="text-xs font-mono truncate text-foreground/80 flex-1">
              {busy ? "Mendekripsi..." : (revealedValue ?? "••••••••••••••••")}
            </code>
            <div className="flex items-center gap-1 shrink-0">
              <RevealButton shown={!!revealedValue} onToggle={toggleReveal} />
              {revealedValue && <CopyButton value={revealedValue} label="Kredensial" />}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {asset.status && <Badge variant={asset.status === "active" ? "default" : "muted"} className="text-[10px]">{asset.status}</Badge>}
            {asset.projectName ? (
              <Badge variant="muted" className="text-[10px] gap-1 px-1.5 py-0">
                <StatusDot className="size-1" />
                {asset.projectName}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">Belum ditautkan ke proyek</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ai-ghost" size="icon-xs" asChild>
                  <a href={`/ai?assetId=${asset.id}`}>
                    <Sparkles className="size-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tanya AI</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-subtle/30 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <Tabs defaultValue="info">
            <TabsList className="h-8 gap-4 bg-transparent p-0 border-b border-border w-full justify-start rounded-none mb-4">
              <TabsTrigger
                value="info"
                className="relative h-8 rounded-none border-b-2 border-transparent px-2 pb-2 pt-0 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent shadow-none"
              >
                Info Asset
              </TabsTrigger>
              <TabsTrigger
                value="catatan"
                className="relative h-8 rounded-none border-b-2 border-transparent px-2 pb-2 pt-0 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent shadow-none"
              >
                Catatan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-0 space-y-4">
              <Panel
                title="Konfigurasi Teknis"
                description="Detail identitas dan tipe aset developer."
              >
                <div className="divide-y divide-border">
                  <FieldRow icon={<Terminal />} label="Nama Aset">
                    {isEditing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-sm font-medium">{asset.name}</span>
                    )}
                  </FieldRow>
                  <FieldRow icon={<Database />} label="Tipe Aset">
                    {isEditing ? (
                      <Select value={type} onValueChange={(next) => setType(next as DevAssetType)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[asset.type]}
                      </Badge>
                    )}
                  </FieldRow>
                  <FieldRow icon={<CodeXml />} label="Provider / Platform">
                    <span className="text-sm">{asset.provider || "—"}</span>
                  </FieldRow>
                  <FieldRow icon={<CodeXml />} label="Website / Dashboard">
                    {asset.websiteUrl ? <a className="text-sm text-primary hover:underline" href={asset.websiteUrl} target="_blank" rel="noreferrer">{asset.websiteUrl}</a> : <span>—</span>}
                  </FieldRow>
                  <FieldRow icon={<Terminal />} label="Username / Account ID">
                    <span className="text-sm">{asset.username || "—"}</span>
                  </FieldRow>
                  <FieldRow icon={<ShieldCheck />} label="Environment">
                    <Badge variant="outline">{asset.environment}</Badge>
                  </FieldRow>
                  <FieldRow icon={<ShieldCheck />} label="Status">
                    <Badge variant={asset.status === "active" ? "default" : "muted"}>{asset.status}</Badge>
                  </FieldRow>
                  <FieldRow icon={<Calendar />} label="Kedaluwarsa">
                    <span className="text-xs text-muted-foreground">{asset.expiresAt ? new Date(asset.expiresAt).toLocaleDateString("id-ID") : "Tidak ditentukan"}</span>
                  </FieldRow>
                  <FieldRow icon={<Folder />} label="Proyek Workspace">
                    {isEditing ? (
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Belum ditetapkan</SelectItem>
                          {workspace.data?.projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{asset.projectName ?? "—"}</span>
                    )}
                  </FieldRow>
                  <FieldRow icon={<Calendar />} label="Dibuat Pada">
                    <span className="text-xs text-muted-foreground">
                      {new Date(asset.createdAt).toLocaleDateString("id-ID")}
                    </span>
                  </FieldRow>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="catatan" className="mt-0">
              <Panel title="Deskripsi & Catatan" description="Konteks penggunaan kredensial ini.">
                <div className="p-4">
                  {isEditing ? (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tambahkan deskripsi teknis atau catatan di sini..."
                      className="text-xs min-h-[100px]"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {asset.description || "Tidak ada deskripsi."}
                    </p>
                  )}
                </div>
              </Panel>
            </TabsContent>

          </Tabs>
        </div>
      )}
    </div>
  );
}
