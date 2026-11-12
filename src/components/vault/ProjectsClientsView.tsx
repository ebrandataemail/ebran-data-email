import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  CodeXml,
  ExternalLink,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClientDetailWorkspace } from "./clients/ClientDetailWorkspace";
import { ClientDialog, type ClientData } from "./clients/ClientDialog";
import { KanbanBoard } from "./projects/KanbanBoard";

const KEY = ["workspace", "projects-clients"] as const;
type Workspace = Awaited<ReturnType<typeof workspaceList>>;
type Client = Workspace["clients"][number];
type Project = Workspace["projects"][number];

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
        className="size-10 rounded-lg object-cover border border-slate-200"
      />
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm dark:bg-emerald-950 dark:text-emerald-200 shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

const statusBadgeStyles: Record<string, { label: string; class: string }> = {
  active: {
    label: "Active Partner",
    class:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  },
  prospect: {
    label: "New Lead / Prospek",
    class: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  },
  "on-hold": {
    label: "On Hold",
    class: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  },
  completed: {
    label: "Completed",
    class: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
  },
  inactive: {
    label: "Tidak Aktif",
    class: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200",
  },
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
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        {/* Header */}
        <header className="border-b border-border bg-background/90 px-4 py-6 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {isClients ? <Users /> : <FolderKanban />}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold">
                  {isClients ? "Daftar Client & Perusahaan" : "Proyek & Workflows"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isClients
                    ? "Kelola data perusahaan, profil, kontak, aset digital, dan dokumen kerjasama."
                    : "Kelola status proyek, prioritas, tenggat waktu, dan data client yang tersinkronisasi."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
              {!isClients && (
                <div className="grid grid-cols-2 items-center rounded-lg border bg-muted p-1 text-xs sm:flex">
                  <Button
                    size="sm"
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("kanban")}
                    className="h-7 px-2.5 text-xs font-medium"
                  >
                    <Trello className="mr-1.5 size-3.5" />
                    Kanban Board
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("grid")}
                    className="h-7 px-2.5 text-xs font-medium"
                  >
                    <LayoutGrid className="mr-1.5 size-3.5" />
                    Daftar Grid
                  </Button>
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
        <section className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-8">
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
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <BriefcaseBusiness className="text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-semibold">{data?.projects.length ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Total proyek</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Users className="text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-semibold">{data?.clients.length ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Total client</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Mail className="text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-semibold">
                            {data?.unassignedEmailCount ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Email belum terhubung proyek
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <CodeXml className="text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-semibold">
                            {data?.unassignedDeveloperAssetCount ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aset developer belum terhubung proyek
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Megaphone className="text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-semibold">
                            {data?.unassignedAdsAssetCount ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aset Ads belum terhubung proyek
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {query.isPending ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Memuat data…</p>
              ) : query.isError ? (
                <div className="rounded-xl border p-6 text-center">
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
                      <Card
                        key={item.id}
                        className={
                          isClients
                            ? "group cursor-pointer shadow-sm transition hover:border-emerald-500/60 hover:shadow-md"
                            : "shadow-sm"
                        }
                        onClick={(e) => {
                          if (isClients && !(e.target as HTMLElement).closest("button")) {
                            setSelectedClientId(item.id);
                          }
                        }}
                      >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isClients ? (
                              <ClientLogoAvatar
                                logoPath={client?.logoPath}
                                name={client?.name ?? "Client"}
                              />
                            ) : (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <FolderKanban className="size-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-semibold truncate">
                                {isClients ? (
                                  <button
                                    type="button"
                                    className="text-left font-bold text-slate-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400"
                                    onClick={() => setSelectedClientId(item.id)}
                                  >
                                    {title}
                                  </button>
                                ) : (
                                  title
                                )}
                              </CardTitle>
                              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                {isClients
                                  ? client?.legalName
                                    ? `${client.legalName} ${client.city ? `· ${client.city}` : ""}`
                                    : client!.website || "Client"
                                  : project!.clientName || "Tanpa client"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                isClients ? startClientEdit(client!) : startProjectEdit(project!)
                              }
                              aria-label="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => void remove(item.id)}
                              aria-label="Hapus"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {isClients && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {clientStatusMeta && (
                                <Badge variant="outline" className={clientStatusMeta.class}>
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

                          {!isClients && priorityInfo && (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={priorityInfo.badgeClass}>
                                <span
                                  className={`size-1.5 rounded-full mr-1 ${priorityInfo.dotClass}`}
                                />
                                {priorityInfo.label}
                              </Badge>
                            </div>
                          )}

                          <p className="line-clamp-2 min-h-10 text-xs text-muted-foreground">
                            {parsedDesc
                              ? parsedDesc.cleanDescription || "Belum ada deskripsi."
                              : item.description || "Belum ada deskripsi."}
                          </p>

                          {isClients && (client?.contactEmail || client?.contactPhone) && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t">
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

                          <div className="mt-3 flex items-center justify-between pt-1 border-t">
                            {isClients ? (
                              <>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                  {client!.projectCount} proyek ·{" "}
                                  {(client as any).digitalAssetCount ?? 0} aset ·{" "}
                                  {(client as any).documentCount ?? 0} dokumen
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400"
                                  onClick={() => setSelectedClientId(item.id)}
                                >
                                  Buka Workspace
                                  <ExternalLink className="ml-1 size-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {project!.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {project!.emailCount} email · {project!.developerAssetCount} dev ·{" "}
                                  {project!.adsAssetCount} ads
                                </span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {(isClients ? data!.clients : data!.projects).length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed p-12 text-center">
                      <p className="text-sm font-medium">
                        Belum ada {isClients ? "client" : "proyek"}.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isClients
                          ? "Klik 'Tambah Client Baru' untuk membuka Formulir Pendaftaran Klien & Proyek Baru."
                          : "Tambahkan data pertama untuk mulai menghubungkan akun email dan status proyek."}
                      </p>
                      {isClients && (
                        <Button
                          className="mt-4 bg-[#003837] text-white hover:bg-[#022e2d]"
                          onClick={() => void navigate({ to: "/clients/new" })}
                        >
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
