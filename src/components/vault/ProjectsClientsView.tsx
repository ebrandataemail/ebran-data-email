import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BriefcaseBusiness,
  Calendar,
  CodeXml,
  Flame,
  FolderKanban,
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
import { ClientDialog, type ClientData } from "./clients/ClientDialog";
import { ClientWorkspacePanel } from "./clients/ClientWorkspacePanel";
import { KanbanBoard } from "./projects/KanbanBoard";

const KEY = ["workspace", "projects-clients"] as const;
type Workspace = Awaited<ReturnType<typeof workspaceList>>;
type Client = Workspace["clients"][number];
type Project = Workspace["projects"][number];

export function ProjectsClientsView({ mode }: { mode: "projects" | "clients" }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(workspaceList);
  const saveClient = useServerFn(workspaceSaveClient);
  const deleteClient = useServerFn(workspaceDeleteClient);
  const saveProject = useServerFn(workspaceSaveProject);
  const deleteProject = useServerFn(workspaceDeleteProject);
  const query = useQuery({ queryKey: KEY, queryFn: () => listFn(), staleTime: 30_000 });
  const data = query.data;

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
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {isClients ? <Users /> : <FolderKanban />}
              </span>
              <div>
                <h1 className="text-xl font-semibold">
                  {isClients ? "Client" : "Proyek & Workflows"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Kelola status proyek, prioritas, tenggat waktu, dan data client yang
                  tersinkronisasi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isClients && (
                <div className="flex items-center rounded-lg border bg-muted p-1 text-xs">
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

              <Button onClick={startCreate}>
                <Plus className="mr-1 size-4" />
                Tambah {isClients ? "Client" : "Proyek"}
              </Button>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <section className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-8">
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
                  <p className="text-2xl font-semibold">{data?.unassignedEmailCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Email belum terhubung proyek</p>
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
                  <p className="text-2xl font-semibold">{data?.unassignedAdsAssetCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Aset Ads belum terhubung proyek</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(isClients ? data!.clients : data!.projects).map((item) => {
                const client = isClients ? (item as Client) : null;
                const project = isClients ? null : (item as Project);
                const title = client?.name ?? project!.name;
                const parsedDesc = project ? parseProjectDescription(project.description) : null;
                const priorityInfo = parsedDesc ? getPriorityInfo(parsedDesc.priority) : null;

                return (
                  <Card key={item.id} className="shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                          {isClients ? (
                            <Users className="size-4" />
                          ) : (
                            <FolderKanban className="size-4" />
                          )}
                        </span>
                        <div>
                          <CardTitle className="text-sm">{title}</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {isClients
                              ? client!.website || "Client"
                              : project!.clientName || "Tanpa client"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
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
                    <CardContent className="pt-1 space-y-2">
                      {priorityInfo && (
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
                      <div className="mt-3 flex items-center justify-between">
                        {isClients ? (
                          <Badge variant="secondary">
                            {client!.projectCount} proyek ·{" "}
                            {client!.emailCount +
                              client!.developerAssetCount +
                              client!.adsAssetCount}{" "}
                            aset
                          </Badge>
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
                    Tambahkan data pertama untuk mulai menghubungkan akun email dan status proyek.
                  </p>
                </div>
              )}
            </div>
          )}
          {isClients && data && <ClientWorkspacePanel clients={data.clients} />}
        </section>
      </main>

      {/* Client Dialog */}
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
                legalName: clientData.legalName, industry: clientData.industry,
                contactName: clientData.contactName, contactEmail: clientData.contactEmail,
                contactPhone: clientData.contactPhone, address: clientData.address, city: clientData.city,
                logoPath: clientData.logoPath, companyProfile: clientData.companyProfile,
                scopeOfWork: clientData.scopeOfWork, internalNotes: clientData.internalNotes,
                clientStatus: clientData.clientStatus,
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
