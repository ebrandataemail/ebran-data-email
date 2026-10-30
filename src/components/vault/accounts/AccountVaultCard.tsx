import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Folder,
  KeyRound,
  LoaderCircle,
  Mail,
  Paperclip,
  Pencil,
  Plus,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { vaultSaveAccount } from "@/lib/vault/vault.functions";
import { workspaceList } from "@/lib/projects/projects.functions";
import { CopyButton, FieldRow, Panel, QuickChip, StatusDot } from "../primitives";
import { errorMessage } from "../use-ai";
import { AssetAttachments } from "../AssetAttachments";
import { ACCOUNTS_KEY, STATUS_LABEL, STATUS_VARIANT, type VaultAccount } from "./use-accounts";
import { cn } from "@/lib/utils";

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

  // Form states
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(account.lovableStatus);
  const [usageTag, setUsageTag] = useState(account.usageTag ?? "");
  const [note, setNote] = useState(account.note ?? "");
  const [projects, setProjects] = useState(account.projects);
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const startEditing = () => {
    setExpanded(true);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEmail(account.email);
    setPassword("");
    setStatus(account.lovableStatus);
    setUsageTag(account.usageTag ?? "");
    setNote(account.note ?? "");
    setProjects(account.projects);
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
          lovableStatus: status,
          usageTag,
          note,
          projectId: projectId === "none" ? null : projectId,
          projects: projects.map((p) => ({
            id: p.id.startsWith("new-") ? null : p.id,
            name: p.name,
            url: p.url,
            note: p.note,
          })),
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

  const updateProject = (id: string, patch: Partial<(typeof projects)[number]>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addProject = () => {
    const id = `new-${Date.now()}`;
    setProjects((prev) => [...prev, { id, name: "", url: "", note: "" }]);
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-card transition-all",
        isEditing
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border hover:border-border-strong",
      )}
    >
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-card transition-colors",
                isEditing ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
              )}
            >
              <Mail className="size-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {account.email}
                </h3>
                {isEditing ? (
                  <Badge variant="ai" className="animate-pulse">
                    Mode Edit Aktif
                  </Badge>
                ) : (
                  <>
                    <Badge variant={STATUS_VARIANT[account.lovableStatus]} className="gap-1.5">
                      <StatusDot className="size-1.5" />
                      {STATUS_LABEL[account.lovableStatus]}
                    </Badge>
                    {account.provider !== "gmail" && (
                      <Badge variant="muted" className="capitalize">
                        {account.provider}
                      </Badge>
                    )}
                    {account.usageTag && <Badge variant="ai">{account.usageTag}</Badge>}
                  </>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{account.projects.length} proyek Lovable</span>
                <span>·</span>
                <span>Diperbarui {formatDate(account.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isEditing ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ai-ghost" size="icon-sm" asChild>
                      <a href={`/ai?assetId=${account.id}`}>
                        <Sparkles className="size-3.5" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tanya AI tentang akun ini</TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded((v) => !v)}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  {expanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  {expanded ? "Tutup Detail" : "Lihat Detail"}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Edit</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit, Refine & Adjust</TooltipContent>
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
                  <TooltipContent>Hapus Akun</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={busy}>
                  <X className="size-3.5 mr-1" />
                  Batal
                </Button>
                <Button size="sm" onClick={handleSave} disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="size-3.5 mr-1" />
                  )}
                  Simpan Perubahan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <QuickChip icon={<Mail />} label="Email">
            <span className="font-mono text-xs text-foreground">{account.email}</span>
            <CopyButton value={account.email} label="Email" />
          </QuickChip>

          <QuickChip icon={<KeyRound />} label="Password">
            {passwordCell}
          </QuickChip>

          <QuickChip icon={<Folder />} label="Proyek">
            <span className="text-xs font-medium text-foreground">
              {account.projects.length} Proyek
            </span>
          </QuickChip>

          <QuickChip icon={<Paperclip />} label="Attachments">
            <span className="text-xs font-medium text-foreground">{attachmentsCount} dokumen</span>
          </QuickChip>

          {!isEditing && riskBadges}
        </div>
      </div>

      {/* Expandable Vault Detail Tabs */}
      {expanded && (
        <div className="border-t border-border bg-subtle/50 p-4 sm:p-6 animate-in fade-in duration-200">
          <Tabs defaultValue="profil">
            <div className="overflow-x-auto border-b border-border">
              <TabsList className="h-auto gap-1 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="profil"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <UserRound className="size-3.5" />
                  Info Profil & Akun
                </TabsTrigger>
                <TabsTrigger
                  value="keamanan"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <ShieldCheck className="size-3.5" />
                  Keamanan & Password
                </TabsTrigger>
                <TabsTrigger
                  value="proyek"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Folder className="size-3.5" />
                  Proyek Lovable ({projects.length})
                </TabsTrigger>
                <TabsTrigger
                  value="catatan"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <FileText className="size-3.5" />
                  Catatan
                </TabsTrigger>
                <TabsTrigger
                  value="attachments"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Paperclip className="size-3.5" />
                  Attachments ({attachmentsCount})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-4">
              {/* Info Profil & Akun Tab */}
              <TabsContent value="profil" className="mt-0">
                <Panel
                  title="Identitas & Akses Email"
                  description="Informasi dasar kredensial dan provider akun."
                >
                  <div className="divide-y divide-border">
                    <FieldRow icon={<Mail />} label="Email Utama">
                      <span className="font-mono text-sm">{account.email}</span>
                      <CopyButton value={account.email} label="Email" />
                    </FieldRow>

                    <FieldRow icon={<Tag />} label="Label / Usage Tag">
                      {isEditing ? (
                        <Input
                          value={usageTag}
                          onChange={(e) => setUsageTag(e.target.value)}
                          placeholder="mis. TIKTOK REPOST ARS"
                          className="h-8 text-sm max-w-md"
                        />
                      ) : account.usageTag ? (
                        <Badge variant="ai">{account.usageTag}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </FieldRow>

                    <FieldRow icon={<Folder />} label="Workspace Project">
                      {isEditing ? (
                        <Select value={projectId} onValueChange={setProjectId}>
                          <SelectTrigger className="h-8 text-sm w-48">
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {workspace.data?.projects.find((p) => p.id === account.projectId)
                              ?.name ?? "Belum ditetapkan"}
                          </span>
                          {account.projectId && (
                            <Badge variant="muted" className="text-[10px]">
                              Workspace Linked
                            </Badge>
                          )}
                        </div>
                      )}
                    </FieldRow>

                    <FieldRow icon={<Sparkles />} label="Status Lovable">
                      {isEditing ? (
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(v as VaultAccount["lovableStatus"])}
                        >
                          <SelectTrigger className="h-8 text-sm w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABEL).map(([k, label]) => (
                              <SelectItem key={k} value={k}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={STATUS_VARIANT[account.lovableStatus]} className="gap-1.5">
                          <StatusDot className="size-1.5" />
                          {STATUS_LABEL[account.lovableStatus]}
                        </Badge>
                      )}
                    </FieldRow>

                    <FieldRow icon={<Calendar />} label="Terakhir Diperbarui">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(account.updatedAt)}
                      </span>
                    </FieldRow>
                  </div>
                </Panel>
              </TabsContent>

              {/* Keamanan & Password Tab */}
              <TabsContent value="keamanan" className="mt-0">
                <Panel
                  title="Keamanan Kredensial"
                  description="Status enkripsi password dan audit resiko keamanan."
                >
                  <div className="divide-y divide-border">
                    <FieldRow icon={<KeyRound />} label={isEditing ? "Ganti Password" : "Password"}>
                      {isEditing ? (
                        <Input
                          type="text"
                          autoComplete="off"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Kosongkan jika tidak diganti"
                          className="h-8 text-sm font-mono max-w-md"
                        />
                      ) : (
                        passwordCell
                      )}
                    </FieldRow>
                    {!isEditing && (
                      <>
                        <FieldRow icon={<ShieldCheck />} label="Kekuatan Password">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {account.passwordLength
                                ? `Panjang: ${account.passwordLength} karakter (${account.passwordClasses ?? 0} jenis karakter)`
                                : "Belum ada password yang tersimpan"}
                            </span>
                            {riskBadges}
                          </div>
                        </FieldRow>
                        <FieldRow icon={<ShieldAlert />} label="Penggunaan Ulang">
                          <span className="text-xs text-muted-foreground">
                            {account.passwordReusedBy > 0 ? (
                              <span className="text-destructive font-medium">
                                Dipakai ulang di {account.passwordReusedBy + 1} akun lain
                              </span>
                            ) : (
                              <span className="text-success font-medium">
                                Password unik (tidak digunakan di akun lain)
                              </span>
                            )}
                          </span>
                        </FieldRow>
                      </>
                    )}
                  </div>
                </Panel>
              </TabsContent>

              {/* Proyek Lovable Tab */}
              <TabsContent value="proyek" className="mt-0">
                <Panel
                  title="Daftar Proyek Lovable"
                  description="Proyek yang terhubung dengan akun email ini."
                  action={
                    isEditing && (
                      <Button variant="outline" size="xs" onClick={addProject}>
                        <Plus className="size-3 mr-1" />
                        Tambah Proyek
                      </Button>
                    )
                  }
                >
                  <div className="divide-y divide-border">
                    {projects.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Belum ada proyek Lovable yang terhubung.
                      </div>
                    ) : (
                      projects.map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-col gap-3 p-4 transition-colors hover:bg-subtle"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-1 items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                                <Folder className="size-4" />
                              </div>
                              {isEditing ? (
                                <div className="grid flex-1 grid-cols-2 gap-2">
                                  <Input
                                    value={p.name}
                                    onChange={(e) => updateProject(p.id, { name: e.target.value })}
                                    placeholder="Nama Proyek"
                                    className="h-8 text-xs"
                                  />
                                  <Input
                                    value={p.url ?? ""}
                                    onChange={(e) => updateProject(p.id, { url: e.target.value })}
                                    placeholder="URL Proyek (opsional)"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium text-foreground">{p.name}</p>
                                  {p.note && (
                                    <p className="text-xs text-muted-foreground">{p.note}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <Button
                                  variant="ghost-danger"
                                  size="icon-xs"
                                  onClick={() => removeProject(p.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : (
                                p.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="gap-1.5 text-xs"
                                    >
                                      Buka Proyek
                                      <ExternalLink className="size-3.5" />
                                    </a>
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                          {isEditing && (
                            <Textarea
                              value={p.note ?? ""}
                              onChange={(e) => updateProject(p.id, { note: e.target.value })}
                              placeholder="Catatan proyek..."
                              rows={2}
                              className="text-xs resize-none"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </TabsContent>

              {/* Catatan Tab */}
              <TabsContent value="catatan" className="mt-0">
                <Panel title="Catatan Akun" description="Informasi atau konteks tambahan dari tim.">
                  <div className="p-5">
                    {isEditing ? (
                      <div className="space-y-2">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Edit Catatan
                        </span>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Tambahkan catatan di sini..."
                          rows={4}
                          className="text-sm resize-none bg-background border-border"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                          Catatan ini membantu tim memahami penggunaan akun.
                        </p>
                      </div>
                    ) : note ? (
                      <div className="rounded-lg bg-background p-3.5 text-sm leading-relaxed text-foreground border border-border">
                        {note}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Tidak ada catatan untuk akun ini. Klik tombol Edit untuk menambahkan
                        catatan.
                      </p>
                    )}
                  </div>
                </Panel>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="mt-0">
                <AssetAttachments
                  id={account.id}
                  type="account"
                  onFilesCountChange={setAttachmentsCount}
                />
              </TabsContent>
            </div>

            {/* Editing footer inside expanded area */}
            {isEditing && (
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-6">
                <Button variant="ghost" onClick={handleCancel} disabled={busy}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin mr-2" />
                  ) : (
                    <Check className="size-4 mr-2" />
                  )}
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
