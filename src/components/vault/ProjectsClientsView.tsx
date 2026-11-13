import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronRight,
  CodeXml,
  Flame,
  FolderKanban,
  Globe,
  LayoutGrid,
  Mail,
  Megaphone,
  Pencil,
  Plus,
  Trello,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { StatStrip } from "@/components/vault/StatStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  workspaceDeleteClient,
  workspaceDeleteProject,
  workspaceList,
  workspaceSaveClient,
  workspaceSaveProject,
} from "@/lib/projects/projects.functions";
import {
  formatProjectDescription,
  getPriorityInfo,
  parseProjectDescription,
  type PriorityLevel,
} from "@/lib/projects/deadline";
import { cn } from "@/lib/utils";
import { ClientDetailWorkspace } from "./clients/ClientDetailWorkspace";
import { ClientDialog, type ClientData } from "./clients/ClientDialog";
import { KanbanBoard } from "./projects/KanbanBoard";

const KEY = ["workspace", "projects-clients"] as const;
type Workspace = Awaited<ReturnType<typeof workspaceList>>;
type Client = Workspace["clients"][number];
type Project = Workspace["projects"][number];

/** L1 — satu bahasa card untuk seluruh halaman ini (sama dengan AccountVaultCard). */
const surface = "rounded-xl border border-border bg-card shadow-soft";

function ClientLogoAvatar({ logoPath, name }: { logoPath?: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!logoPath) return;
    if (logoPath.startsWith("http")) {
      setUrl(logoPath);
      return;
    }
    supabase.storage
      .from("client-files")
      .createSignedUrl(logoPath, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [logoPath]);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-10 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-foreground"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Status client memakai varian Badge dari design system, bukan warna Tailwind mentah.
const statusBadgeStyles: Record<
  string,
  { label: string; variant: "success" | "warning" | "muted" | "secondary" | "danger" }
> = {
  active: { label: "Active Partner", variant: "success" },
  prospect: { label: "New Lead / Prospek", variant: "warning" },
  "on-hold": { label: "On Hold", variant: "muted" },
  completed: { label: "Completed", variant: "secondary" },
  inactive: { label: "Tidak Aktif", variant: "danger" },
};

export function ProjectsClientsView({ mode }: { mode: "projects" | "clients" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listFn = useServerFn(workspaceList);
  const saveClient = useServerFn(workspaceSaveClient);
  const deleteClient = useServerFn(workspaceDeleteClient);
  const saveProject = useServerFn(workspaceSaveProject);
  const deleteProject = useServerFn(workspaceDeleteProject);
  const query = useQuery({ queryKey: KEY, queryFn: () => listFn(), staleTime: 30_000 });
  const data = query.data;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [website, setWebsite] = useState("");
  const [clientId, setClientId] = useState("none");
  const [status, setStatus] = useState("on-process");
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    if (mode === "clients") {
      void navigate({ to: "/clients/new" });
      return;
    }
    setEditingClient(null);
    setEditingProject(null);
    setName("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setWebsite("");
    setClientId("none");
    setStatus("on-process");
    setOpen(true);
  };

  const startClientEdit = (client: Client) => {
    setEditingClient(client);
    setEditingProject(null);
    setName(client.name);
    setDescription(client.description ?? "");
    setWebsite(client.website ?? "");
    setOpen(true);
  };

  const startProjectEdit = (project: Project) => {
    setEditingProject(project);
    setEditingClient(null);
    setName(project.name);
    const parsed = parseProjectDescription(project.description);
    setDescription(parsed.cleanDescription);
    setDueDate(parsed.dueDate ?? "");
    setPriority(parsed.priority ?? "medium");
    setClientId(project.client_id ?? "none");
    setStatus(project.status ?? "on-process");
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "clients") {
        await saveClient({ data: { id: editingClient?.id ?? null, name, description, website } });
      } else {
        const fullDesc = formatProjectDescription(description, dueDate, priority);
        await saveProject({
          data: {
            id: editingProject?.id ?? null,
            name,
            description: fullDesc,
            clientId: clientId === "none" ? null : clientId,
            status,
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(mode === "clients" ? "Client tersimpan" : "Proyek tersimpan");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (
      !window.confirm(
        mode === "clients"
          ? "Hapus client ini?"
          : "Hapus proyek ini? Akun Email, aset Developer, dan aset Ads yang terhubung akan menjadi belum ditetapkan.",
      )
    )
      return;
    try {
      if (mode === "clients") await deleteClient({ data: { id } });
      else await deleteProject({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Data dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data.");
    }
  };

  const isClients = mode === "clients";

  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        {/* Header */}
        <header className="border-b border-border bg-background/90 px-4 py-5 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isClients ? "Daftar Client & Perusahaan" : "Proyek & Workflows"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isClients
                  ? "Kelola data perusahaan, profil, kontak, aset digital, dan dokumen kerjasama."
                  : "Kelola status proyek, prioritas, tenggat waktu, dan data client yang tersinkronisasi."}
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
              {!isClients && (
                <div className="grid grid-cols-2 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-soft sm:flex">
                  <button
                    type="button"
                    aria-pressed={viewMode === "kanban"}
                    onClick={() => setViewMode("kanban")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      viewMode === "kanban"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Trello className="size-3.5" />
                    Kanban
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      viewMode === "grid"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                    Grid
                  </button>
                </div>
              )}

              <Button
                onClick={() => (isClients ? void navigate({ to: "/clients/new" }) : startCreate())}
              >
                <Plus className="mr-1 size-4" />
                Tambah {isClients ? "Client Baru" : "Proyek"}
              </Button>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <section className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 pb-16 sm:px-8">
          {isClients &&
          selectedClientId &&
          data?.clients.some((client) => client.id === selectedClientId) ? (
            <ClientDetailWorkspace
              client={
                data.clients.find((client) => client.id === selectedClientId)! as Client &
                  ClientData
              }
              onBack={() => setSelectedClientId(null)}
              onEdit={() =>
                startClientEdit(data.clients.find((client) => client.id === selectedClientId)!)
              }
            />
          ) : (
            <>
              {!isClients && (
                <StatStrip
                  items={[
                    {
                      icon: <BriefcaseBusiness />,
                      value: data?.projects.length ?? 0,
                      label: "Total proyek",
                    },
                    { icon: <Users />, value: data?.clients.length ?? 0, label: "Total client" },
                    {
                      icon: <Mail />,
                      value: data?.unassignedEmailCount ?? 0,
                      label: "Email belum terhubung proyek",
                      attention: true,
                    },
                    {
                      icon: <CodeXml />,
                      value: data?.unassignedDeveloperAssetCount ?? 0,
                      label: "Aset developer belum terhubung",
                      attention: true,
                    },
                    {
                      icon: <Megaphone />,
                      value: data?.unassignedAdsAssetCount ?? 0,
                      label: "Aset Ads belum terhubung",
                      attention: true,
                    },
                  ]}
                />
              )}

              {query.isPending ? (
                <div className={cn(surface, "py-16 text-center text-sm text-muted-foreground")}>
                  Memuat data…
                </div>
              ) : query.isError ? (
                <div className={cn(surface, "p-6 text-center")}>
                  <p className="text-sm text-destructive">Gagal memuat data workspace.</p>
                  <Button className="mt-3" variant="outline" onClick={() => query.refetch()}>
                    Coba lagi
                  </Button>
                </div>
              ) : !isClients && viewMode === "kanban" ? (
                /* Kanban Board View */
                <KanbanBoard
                  projects={data?.projects ?? []}
                  clients={data?.clients ?? []}
                  queryKey={KEY}
                  onEditProject={startProjectEdit}
                  onAddProject={startCreate}
                />
              ) : (
                /* Grid View */
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(isClients ? data!.clients : data!.projects).map((item) => {
                    const client = isClients ? (item as Client) : null;
                    const project = isClients ? null : (item as Project);
                    const title = client?.name ?? project!.name;
                    const parsedDesc = project
                      ? parseProjectDescription(project.description)
                      : null;
                    const priorityInfo = parsedDesc ? getPriorityInfo(parsedDesc.priority) : null;
                    const clientStatusMeta = client?.clientStatus
                      ? statusBadgeStyles[client.clientStatus]
                      : null;

                    return (
                      <article
                        key={item.id}
                        className={cn(
                          surface,
                          "flex min-w-0 flex-col transition-colors",
                          isClients && "cursor-pointer hover:border-border-strong",
                        )}
                        onClick={(e) => {
                          if (isClients && !(e.target as HTMLElement).closest("button")) {
                            setSelectedClientId(item.id);
                          }
                        }}
                      >
                        {/* Header */}
                        <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {isClients ? (
                              <ClientLogoAvatar
                                logoPath={client?.logoPath}
                                name={client?.name ?? "Client"}
                              />
                            ) : (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                                <FolderKanban className="size-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-foreground">
                                {title}
                              </h3>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {isClients
                                  ? client?.legalName
                                    ? `${client.legalName} ${client.city ? `· ${client.city}` : ""}`
                                    : client!.website || "Client"
                                  : project!.clientName || "Tanpa client"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() =>
                                isClients ? startClientEdit(client!) : startProjectEdit(project!)
                              }
                              aria-label={`Edit ${title}`}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost-danger"
                              onClick={() => void remove(item.id)}
                              aria-label={`Hapus ${title}`}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </header>

                        {/* Body: badge + deskripsi, tanpa kotak tambahan */}
                        <div className="flex-1 space-y-2.5 px-4 pb-4">
                          {isClients && (clientStatusMeta || client?.industry) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {clientStatusMeta && (
                                <Badge variant={clientStatusMeta.variant}>
                                  {clientStatusMeta.label}
                                </Badge>
                              )}
                              {client?.industry && (
                                <Badge variant="secondary" className="text-xs">
                                  <Building2 className="mr-1 size-3 text-muted-foreground" />
                                  {client.industry}
                                </Badge>
                              )}
                            </div>
                          )}

                          {!isClients && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {priorityInfo && (
                                <Badge variant="outline" className={priorityInfo.badgeClass}>
                                  <span
                                    className={`mr-1 size-1.5 rounded-full ${priorityInfo.dotClass}`}
                                  />
                                  {priorityInfo.label}
                                </Badge>
                              )}
                              <Badge variant="muted" className="capitalize">
                                {project!.status}
                              </Badge>
                            </div>
                          )}

                          <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">
                            {parsedDesc
                              ? parsedDesc.cleanDescription || "Belum ada deskripsi."
                              : item.description || "Belum ada deskripsi."}
                          </p>

                          {isClients && (client?.contactEmail || client?.contactPhone) && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              {client.contactEmail && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="size-3 shrink-0" />
                                  {client.contactEmail}
                                </span>
                              )}
                              {client.contactPhone && (
                                <span className="flex items-center gap-1 truncate">
                                  <Globe className="size-3 shrink-0" />
                                  {client.contactPhone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer: satu garis pemisah, ringkasan di kiri, satu aksi di kanan */}
                        <footer className="flex items-center justify-between gap-2 border-t border-border bg-subtle px-4 py-2.5">
                          {isClients ? (
                            <>
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {client!.projectCount} proyek · {(client as any).digitalAssetCount ?? 0}{" "}
                                aset · {(client as any).documentCount ?? 0} dokumen
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => setSelectedClientId(item.id)}
                              >
                                Buka
                                <ChevronRight className="size-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {project!.emailCount} email · {project!.developerAssetCount} dev ·{" "}
                              {project!.adsAssetCount} ads
                            </span>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                  {(isClients ? data!.clients : data!.projects).length === 0 && (
                    <div
                      className={cn(
                        surface,
                        "col-span-full border-dashed p-12 text-center shadow-none",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">
                        Belum ada {isClients ? "client" : "proyek"}.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isClients
                          ? "Klik 'Tambah Client Baru' untuk membuka Formulir Pendaftaran Klien & Proyek Baru."
                          : "Tambahkan data pertama untuk mulai menghubungkan akun email dan status proyek."}
                      </p>
                      {isClients && (
                        <Button className="mt-4" onClick={() => void navigate({ to: "/clients/new" })}>
                          <Plus className="mr-1.5 size-4" />
                          Tambah Client Baru
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Client Edit Dialog */}
      <ClientDialog
        open={open && isClients}
        onOpenChange={setOpen}
        client={editingClient as ClientData | null}
        busy={busy}
        onSave={async (clientData) => {
          setBusy(true);
          try {
            await saveClient({
              data: {
                id: editingClient?.id ?? null,
                name: clientData.name,
                description: clientData.description,
                website: clientData.website,
              },
            });
            await queryClient.invalidateQueries({ queryKey: KEY });
            toast.success("Client tersimpan");
            setOpen(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal menyimpan data.");
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* Project Dialog */}
      <Dialog open={open && !isClients} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Proyek" : "Tambah Proyek"}</DialogTitle>
            <DialogDescription>
              Perubahan langsung disimpan dan disinkronkan ke Kanban board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Proyek</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder="Contoh: Campaign Ramadhan 2026"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Client Terhubung</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa client</SelectItem>
                    {data?.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Flame className="size-3.5 text-amber-500" />
                  Tingkat Prioritas
                </Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">⚪ Rendah (Low)</SelectItem>
                    <SelectItem value="medium">🔵 Sedang (Medium)</SelectItem>
                    <SelectItem value="high">🔴 Tinggi (High / Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status Proyek</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="things-to-do">Things To Do / Antrian</SelectItem>
                    <SelectItem value="on-process">On Process (Sedang Dikerjakan)</SelectItem>
                    <SelectItem value="pending">Pending (Tertunda)</SelectItem>
                    <SelectItem value="revision">Revisi / Review</SelectItem>
                    <SelectItem value="finished">Finished (Selesai)</SelectItem>
                    <SelectItem value="cancel">Cancel / STOP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Tenggat Waktu / Due Date
                </Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi / Scope Proyek</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Catatan scope, goal, atau instruksi pengerjaan…"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan Proyek"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
