import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Folder,
  Inbox,
  KeyRound,
  Link2,
  LoaderCircle,
  Mail,
  Paperclip,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  X,
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
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { vaultSaveAccount } from "@/lib/vault/vault.functions";
import { workspaceList } from "@/lib/projects/projects.functions";
import { CopyButton, FieldRow, VaultTabTrigger } from "../primitives";
import { errorMessage } from "../use-ai";
import { AssetAttachments } from "../AssetAttachments";
import {
  ACCOUNTS_KEY,
  STATUS_LABEL,
  STATUS_VARIANT,
  type VaultAccount,
} from "./use-accounts";
import { cn } from "@/lib/utils";
import { GmailInboxMonitor } from "./GmailInboxMonitor";
import { LinkedAccountsTab } from "./LinkedAccountsTab";

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Anatomi card (satu level elevasi saja):
 *
 *  ┌ header ─ avatar · email + badge · password · [Detail] [AI] [Edit] [Hapus]
 *  ├ (risk badges, hanya jika ada)
 *  └ detail ─ tab garis-bawah → baris label/nilai dipisah garis (tanpa kotak lagi)
 */
export function AccountVaultCard({
  account,
  onDelete,
  passwordCell,
  riskBadges,
}: {
  account: VaultAccount;
  onDelete: () => void;
  passwordCell: ReactNode;
  riskBadges: ReactNode;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(vaultSaveAccount);

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (!isEditing) setPassword("");
  }, [isEditing]);
  const [usageTag, setUsageTag] = useState(account.usageTag ?? "");
  const [note, setNote] = useState(account.note ?? "");
  const [projectId, setProjectId] = useState(account.projectId ?? "none");

  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });

  const [attachmentsCount, setAttachmentsCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(`account_attachments_${account.id}`);
      return stored ? JSON.parse(stored).length : 0;
    } catch {
      return 0;
    }
  });

  const startEditing = () => {
    setExpanded(true);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEmail(account.email);
    setPassword("");
    setUsageTag(account.usageTag ?? "");
    setNote(account.note ?? "");
    setProjectId(account.projectId ?? "none");
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveFn({
        data: {
          id: account.id,
          email,
          password: password || null,
          lovableStatus: account.lovableStatus,
          usageTag,
          note,
          projectId: projectId === "none" ? null : projectId,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      toast.success("Perubahan disimpan");
      setIsEditing(false);
    } catch (err) {
      toast.error("Gagal menyimpan", { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const linkedProject = workspace.data?.projects.find((p) => p.id === account.projectId);

  return (
    <article
      className={cn(
        // L1 — satu-satunya elemen yang punya border + radius + shadow di card ini
        "overflow-hidden rounded-xl border bg-card shadow-soft transition-colors",
        isEditing
          ? "border-primary/40 ring-2 ring-primary/10"
          : "border-border hover:border-border-strong",
      )}
    >
      {/* ───────── Header ───────── */}
      <header className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-foreground"
          >
            {account.email.slice(0, 1).toUpperCase()}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
                {account.email}
              </h3>
              <CopyButton value={account.email} label="Email" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {isEditing ? (
                <Badge variant="ai">Mode edit</Badge>
              ) : (
                <>
                  {account.lovableStatus !== "unknown" && (
                    <Badge variant={STATUS_VARIANT[account.lovableStatus]}>
                      {STATUS_LABEL[account.lovableStatus]}
                    </Badge>
                  )}
                  {account.usageTag && <Badge variant="ai">{account.usageTag}</Badge>}
                  {account.provider !== "gmail" && (
                    <Badge variant="muted" className="capitalize">
                      {account.provider}
                    </Badge>
                  )}
                  {riskBadges}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Password — ringkas, satu-satunya "nilai rahasia" yang tampil di header */}
        {!isEditing && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/70 py-0.5 pl-3 pr-1 sm:shrink-0">
            <KeyRound className="size-3.5 text-muted-foreground" />
            {passwordCell}
          </div>
        )}

        {/* Aksi: 1 aksi utama (Detail) + ikon sekunder. Tidak ada tombol berbingkai lain. */}
        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={busy}>
                <X className="size-3.5" />
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Simpan
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="gap-1.5"
              >
                Detail
                <ChevronDown
                  className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ai-ghost" size="icon-sm" asChild>
                    <a href={`/ai?assetId=${account.id}`} aria-label="Tanya AI tentang akun ini">
                      <Sparkles className="size-3.5" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tanya AI</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${account.email}`}
                    onClick={startEditing}
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
                    aria-label={`Hapus ${account.email}`}
                    onClick={onDelete}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hapus</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </header>

      {/* ───────── Detail (tanpa kotak tambahan) ───────── */}
      {expanded && (
        <div className="border-t border-border animate-in fade-in duration-150">
          <Tabs defaultValue="profil">
            <div className="overflow-x-auto border-b border-border bg-subtle px-2 sm:px-3">
              <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                <VaultTabTrigger value="profil" icon={<UserRound />}>
                  Profil
                </VaultTabTrigger>
                <VaultTabTrigger value="keamanan" icon={<ShieldCheck />}>
                  Keamanan
                </VaultTabTrigger>
                <VaultTabTrigger value="catatan" icon={<FileText />}>
                  Catatan
                </VaultTabTrigger>
                <VaultTabTrigger value="inbox" icon={<Inbox />}>
                  Kotak masuk
                </VaultTabTrigger>
                <VaultTabTrigger value="digital" icon={<Link2 />}>
                  Akun digital
                </VaultTabTrigger>
                <VaultTabTrigger value="attachments" icon={<Paperclip />}>
                  Lampiran{attachmentsCount > 0 ? ` (${attachmentsCount})` : ""}
                </VaultTabTrigger>
              </TabsList>
            </div>

            {/* Profil */}
            <TabsContent value="profil" className="mt-0 divide-y divide-border">
              <FieldRow icon={<Mail />} label="Email">
                {isEditing ? (
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-8 max-w-md font-mono text-sm"
                  />
                ) : (
                  <span className="font-mono text-sm">{account.email}</span>
                )}
              </FieldRow>

              <FieldRow icon={<Tag />} label="Label penggunaan">
                {isEditing ? (
                  <Input
                    value={usageTag}
                    onChange={(e) => setUsageTag(e.target.value)}
                    placeholder="mis. TIKTOK REPOST ARS"
                    className="h-8 max-w-md text-sm"
                  />
                ) : account.usageTag ? (
                  <Badge variant="ai">{account.usageTag}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Belum diberi label</span>
                )}
              </FieldRow>

              <FieldRow icon={<Folder />} label="Proyek workspace">
                {isEditing ? (
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="h-8 w-56 text-sm">
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum ditetapkan</SelectItem>
                      {workspace.data?.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn(!linkedProject && "text-muted-foreground")}>
                    {linkedProject?.name ?? "Belum ditetapkan"}
                  </span>
                )}
              </FieldRow>

              <FieldRow icon={<Calendar />} label="Terakhir diperbarui">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatDate(account.updatedAt)}
                </span>
              </FieldRow>
            </TabsContent>

            {/* Keamanan */}
            <TabsContent value="keamanan" className="mt-0 divide-y divide-border">
              <FieldRow icon={<KeyRound />} label={isEditing ? "Ganti password" : "Password"}>
                {isEditing ? (
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diganti"
                    className="h-8 max-w-md font-mono text-sm"
                  />
                ) : (
                  passwordCell
                )}
              </FieldRow>

              {!isEditing && (
                <>
                  <FieldRow icon={<ShieldCheck />} label="Kekuatan">
                    <span className="text-sm font-normal text-muted-foreground">
                      {account.passwordLength
                        ? `${account.passwordLength} karakter, ${account.passwordClasses ?? 0} jenis karakter`
                        : "Belum ada password tersimpan"}
                    </span>
                  </FieldRow>
                  <FieldRow icon={<ShieldAlert />} label="Penggunaan ulang">
                    {account.passwordReusedBy > 0 ? (
                      <span className="text-destructive">
                        Dipakai ulang di {account.passwordReusedBy + 1} akun
                      </span>
                    ) : (
                      <span className="text-success-foreground">Unik, tidak dipakai di akun lain</span>
                    )}
                  </FieldRow>
                </>
              )}
            </TabsContent>

            {/* Catatan (sebelumnya tab ini kosong — field `note` tidak pernah ditampilkan) */}
            <TabsContent value="catatan" className="mt-0 px-4 py-4 sm:px-5">
              {isEditing ? (
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tulis catatan untuk akun ini"
                  rows={5}
                  className="max-w-2xl text-sm"
                />
              ) : account.note ? (
                <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {account.note}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum ada catatan. Klik Edit untuk menambahkan.
                </p>
              )}
            </TabsContent>

            {/* Kotak masuk — dipindah dari atas tab menjadi tab sendiri, jadi dimuat hanya saat dibuka */}
            <TabsContent value="inbox" className="mt-0 p-4 sm:p-5">
              <GmailInboxMonitor emailAccountId={account.id} email={account.email} />
            </TabsContent>

            <TabsContent value="digital" className="mt-0 p-4 sm:p-5">
              <LinkedAccountsTab emailAccountId={account.id} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 p-4 sm:p-5">
              <AssetAttachments
                id={account.id}
                type="account"
                onFilesCountChange={setAttachmentsCount}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </article>
  );
}
