import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
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
import { vaultAudit, vaultDeleteAccount, vaultRevealPassword } from "@/lib/vault/vault.functions";
import { cn } from "@/lib/utils";
import { AppSidebar, SidebarContents } from "../AppSidebar";
import { CopyButton } from "../primitives";
import { errorMessage } from "../use-ai";
import { AccountDialog } from "./AccountDialog";
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

function VaultAuditCard({ total }: { total: number }) {
  const auditFn = useServerFn(vaultAudit);
  const audit = useQuery({
    queryKey: ["vault", "audit"],
    queryFn: () => auditFn(),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const run = async () => {
    const res = await audit.refetch();
    if (res.error) toast.error("Audit gagal", { description: errorMessage(res.error) });
  };

  return (
    <section className="rounded-xl border border-ai/30 bg-gradient-ai-soft p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-ai shadow-ai">
            <Sparkles className="size-3.5 text-ai-contrast" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">Audit AI Brankas Email</h3>
          <Badge variant="ai">AI</Badge>
        </div>
        <Button
          variant={audit.data ? "ai-ghost" : "ai"}
          size="sm"
          onClick={run}
          disabled={audit.isFetching || total === 0}
        >
          {audit.isFetching ? (
            <LoaderCircle className="animate-spin" />
          ) : audit.data ? (
            <RefreshCw />
          ) : (
            <ShieldAlert />
          )}
          {audit.isFetching
            ? "Menganalisis…"
            : audit.data
              ? "Analisis ulang"
              : `Audit ${total} akun`}
        </Button>
      </div>

      {!audit.data && !audit.isFetching && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          AI membaca statistik brankas (pemakaian ulang password, pola lemah, akun kosong) — tanpa
          melihat password.
        </p>
      )}

      {audit.data && (
        <div
          className={cn(
            "mt-4 grid gap-5 lg:grid-cols-[180px_1fr_1fr]",
            audit.isFetching && "opacity-60",
          )}
        >
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {audit.data.score}
              </span>
              <span className="pb-1.5 text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-gradient-ai"
                style={{ width: `${audit.data.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {audit.data.headline}
            </p>
          </div>
          <ul className="space-y-3">
            {audit.data.insights.map((i) => (
              <li key={i.title} className="flex gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    i.tone === "warning"
                      ? "bg-warning"
                      : i.tone === "success"
                        ? "bg-success"
                        : "bg-border-strong",
                  )}
                />
                <div>
                  <p className="text-[13px] font-medium text-foreground">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <ol className="list-decimal space-y-1.5 pl-4 text-[13px] text-foreground marker:text-ai">
            {audit.data.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function AccountsView() {
  const { data: accounts = [], isPending, isError, error, refetch } = useAccounts();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(vaultDeleteAccount);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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

  const stats = useMemo(
    () => ({
      total: accounts.length,
      projects: accounts.reduce((n, a) => n + a.projects.length, 0),
      empty: accounts.filter((a) => a.lovableStatus === "empty").length,
      reused: accounts.filter((a) => a.passwordReusedBy > 0).length,
    }),
    [accounts],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteFn({ data: { id: deleting.id } });
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total akun", value: stats.total },
              { label: "Proyek Lovable", value: stats.projects },
              { label: "Lovable kosong", value: stats.empty },
              { label: "Password dipakai ulang", value: stats.reused },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <VaultAuditCard total={stats.total} />

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
              <span className="text-xs tabular-nums text-muted-foreground">
                {visible.length} / {accounts.length}
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
            ) : (
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
