import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  LoaderCircle,
  Mail,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { vaultDeleteAccount, vaultRevealPassword } from "@/lib/vault/vault.functions";
import { cn } from "@/lib/utils";
import { AppSidebar, SidebarContents } from "../AppSidebar";
import { triggerAssetCommandPalette } from "@/lib/vault/palette-trigger";
import { CopyButton } from "../primitives";
import { errorMessage } from "../use-ai";
import { AccountDialog } from "./AccountDialog";
import { AccountVaultCard } from "./AccountVaultCard";
import { ImportDialog } from "./ImportDialog";
import {
  ACCOUNTS_KEY,
  STATUS_LABEL,
  STATUS_VARIANT,
  useAccounts,
  type VaultAccount,
} from "./use-accounts";

type Filter = "all" | VaultAccount["lovableStatus"] | "reused" | "weak" | "no_password";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua akun" },
  { value: "has_project", label: "Ada proyek Lovable" },
  { value: "empty", label: "Lovable kosong" },
  { value: "not_registered", label: "Belum regis" },
  { value: "unknown", label: "Belum dicek" },
  { value: "reused", label: "Password dipakai ulang" },
  { value: "weak", label: "Pola password lemah" },
  { value: "no_password", label: "Tanpa password" },
];

function matchesFilter(a: VaultAccount, f: Filter) {
  if (f === "all") return true;
  if (f === "reused") return a.passwordReusedBy > 0;
  if (f === "weak") return a.passwordCommonPattern || a.passwordMatchesEmail;
  if (f === "no_password") return !a.hasPassword;
  return a.lovableStatus === f;
}

function PasswordCell({ account }: { account: VaultAccount }) {
  const revealFn = useServerFn(vaultRevealPassword);
  const [shown, setShown] = useState<{
    password: string | null;
    altPassword: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!account.hasPassword) return <span className="text-xs text-muted-foreground">—</span>;

  const fetchSecret = async () => {
    setLoading(true);
    try {
      return await revealFn({ data: { id: account.id } });
    } catch (err) {
      toast.error("Gagal membuka password", { description: errorMessage(err) });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    if (shown) return setShown(null);
    const res = await fetchSecret();
    if (!res) return;
    setShown(res);
    setTimeout(() => setShown(null), 20_000);
  };

  const copy = async () => {
    const res = shown ?? (await fetchSecret());
    if (!res?.password) return;
    try {
      await navigator.clipboard.writeText(res.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Password disalin");
    } catch {
      toast.error("Gagal menyalin ke clipboard");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex min-w-[96px] flex-col">
        <span className="font-mono text-[13px] text-foreground">
          {shown?.password ?? "••••••••"}
        </span>
        {shown?.altPassword && (
          <span className="font-mono text-[11px] text-muted-foreground">
            alt: {shown.altPassword}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={shown ? "Sembunyikan" : "Tampilkan"}
        onClick={toggle}
        disabled={loading}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : shown ? <EyeOff /> : <Eye />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Salin password"
        onClick={copy}
        disabled={loading}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </div>
  );
}

function RiskBadges({ a }: { a: VaultAccount }) {
  const items: string[] = [];
  if (a.passwordReusedBy > 0) items.push(`Dipakai ${a.passwordReusedBy + 1} akun`);
  if (a.passwordCommonPattern) items.push("Pola Nama+tahun");
  else if (a.passwordMatchesEmail) items.push("Mirip email");
  if (a.hasAltPassword) items.push("Ada password alt");
  if (!items.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map((t) => (
        <Badge
          key={t}
          variant={t.startsWith("Dipakai") ? "danger" : "muted"}
          className="px-1.5 py-0 text-[10px]"
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}

export function AccountsView() {
  const { data: accounts = [], isPending, isError, error, refetch } = useAccounts();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(vaultDeleteAccount);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<{ open: boolean; account: VaultAccount | null }>({
    open: false,
    account: null,
  });
  const [deleting, setDeleting] = useState<VaultAccount | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        matchesFilter(a, filter) &&
        (!q ||
          a.email.includes(q) ||
          (a.note ?? "").toLowerCase().includes(q) ||
          (a.usageTag ?? "").toLowerCase().includes(q) ||
          a.projects.some((p) => p.name.toLowerCase().includes(q) || (p.url ?? "").includes(q))),
    );
  }, [accounts, query, filter]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteFn({ data: { id: deleting.id } });
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast(`${deleting.email} dihapus`);
    } catch (err) {
      toast.error("Gagal menghapus", { description: errorMessage(err) });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <header className="z-20 border-b border-border bg-background/90 backdrop-blur-md sm:sticky sm:top-0">
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label="Buka menu"
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Navigasi</SheetTitle>
                  <SidebarContents />
                </SheetContent>
              </Sheet>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
                <Mail className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Email (Core)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Akun email & proyek Lovable yang terhubung.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={triggerAssetCommandPalette}
                className="gap-2 text-muted-foreground"
                aria-label="Cari aset digital (Cmd+K)"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Cari Aset</span>
                <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  ⌘K
                </kbd>
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload />
                Impor CSV
              </Button>
              <Button onClick={() => setEditing({ open: true, account: null })}>
                <Plus />
                Tambah akun
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-16 sm:px-8">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {/* Toolbar: Search, Filters, View Switcher */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari email, proyek, catatan…"
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Switcher: Card (Vault Style) vs Table */}
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    viewMode === "card"
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Tampilan Kartu Vault"
                >
                  <LayoutGrid className="size-3.5" />
                  <span className="hidden sm:inline">Kartu Vault</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    viewMode === "table"
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Tampilan Tabel"
                >
                  <List className="size-3.5" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
              </div>

              <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                {visible.length} / {accounts.length} akun
              </span>
            </div>

            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Memuat akun…
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
                {errorMessage(error)}
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">Vault email masih kosong</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Impor sheet "Data Email" (CSV) untuk memasukkan semua akun dan proyek Lovable
                  sekaligus.
                </p>
                <Button onClick={() => setImportOpen(true)}>
                  <Upload />
                  Impor CSV
                </Button>
              </div>
            ) : viewMode === "card" ? (
              /* /vault Card Style List */
              <div className="space-y-4 p-4 sm:p-6 bg-subtle/40">
                {visible.map((a) => (
                  <AccountVaultCard
                    key={a.id}
                    account={a}
                    onDelete={() => setDeleting(a)}
                    passwordCell={<PasswordCell account={a} />}
                    riskBadges={<RiskBadges a={a} />}
                  />
                ))}
                {visible.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Mail className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      Tidak ada akun yang cocok
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coba sesuaikan kata kunci pencarian atau filter status.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                      className="mt-3 text-xs"
                    >
                      Reset Filter
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Table View Option */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Proyek Lovable</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="w-24 pr-5 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((a) => (
                    <TableRow key={a.id} className="align-top">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{a.email}</span>
                          <CopyButton value={a.email} label="Email" />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge
                            variant={STATUS_VARIANT[a.lovableStatus]}
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {STATUS_LABEL[a.lovableStatus]}
                          </Badge>
                          {a.provider !== "gmail" && (
                            <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                              {a.provider}
                            </Badge>
                          )}
                          {a.usageTag && (
                            <Badge variant="ai" className="px-1.5 py-0 text-[10px]">
                              {a.usageTag}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PasswordCell account={a} />
                        <RiskBadges a={a} />
                      </TableCell>
                      <TableCell>
                        {a.projects.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {a.projects.map((p) => (
                              <li key={p.id} className="text-[13px]">
                                {p.url ? (
                                  <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                                  >
                                    {p.name}
                                    <ExternalLink className="size-3 text-muted-foreground" />
                                  </a>
                                ) : (
                                  <span className="font-medium text-foreground">{p.name}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {a.note ?? "—"}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${a.email}`}
                                onClick={() => setEditing({ open: true, account: a })}
                              >
                                <Pencil />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost-danger"
                                size="icon-sm"
                                aria-label={`Hapus ${a.email}`}
                                onClick={() => setDeleting(a)}
                              >
                                <Trash2 />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada akun yang cocok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      </main>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <AccountDialog
        open={editing.open}
        account={editing.account}
        onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun, password terenkripsi, dan proyek Lovable-nya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
