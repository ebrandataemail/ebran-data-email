import { useState, type DragEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  CodeXml,
  FolderKanban,
  GripVertical,
  Mail,
  Megaphone,
  MoreVertical,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  workspaceDeleteProject,
  workspaceList,
  workspaceUpdateProjectStatus,
} from "@/lib/projects/projects.functions";
import { getDeadlineInfo, getPriorityInfo, parseProjectDescription } from "@/lib/projects/deadline";
import { cn } from "@/lib/utils";
import { StickyNotesWidget } from "./StickyNotesWidget";

type WorkspaceData = Awaited<ReturnType<typeof workspaceList>>;
type Project = WorkspaceData["projects"][number];
type Client = WorkspaceData["clients"][number];

export type KanbanColumnId =
  "things-to-do" | "on-process" | "pending" | "revision" | "finished" | "cancel";

/**
 * Warna kartu mengikuti STATUS (satu warna per status), bukan warna acak:
 * lajur, garis aksen kartu, ikon, penghitung, dan avatar client memakai warna yang sama.
 * Semuanya token design system. Warna peringatan deadline tetap terpisah (merah/kuning).
 */
export interface KanbanTone {
  /** Garis aksen 4px di sisi kiri kartu */
  bar: string;
  /** Latar lajur (kolom) */
  lane: string;
  /** Wash gradien di bagian atas kartu */
  card: string;
  /** Warna ikon header lajur */
  icon: string;
  /** Penghitung dan avatar client */
  chip: string;
}

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badgeClass: string;
  columnClass: string;
  tone: KanbanTone;
  aliases: string[];
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "things-to-do",
    title: "Things To Do",
    subtitle: "Antrian & Perencanaan",
    icon: CircleDot,
    badgeClass: "border-transparent bg-muted-foreground/15 text-foreground/80",
    columnClass: "bg-muted-foreground/[0.08]",
    tone: {
      bar: "bg-muted-foreground/60",
      lane: "bg-muted-foreground/[0.08]",
      card: "from-muted-foreground/[0.07]",
      icon: "text-muted-foreground",
      chip: "bg-muted-foreground/15 text-foreground/80",
    },
    aliases: ["things-to-do", "queue-on-process"],
  },
  {
    id: "on-process",
    title: "On Process",
    subtitle: "Sedang Dikerjakan",
    icon: PlayCircle,
    badgeClass: "border-transparent bg-wb-blue-strong/15 text-wb-blue-strong",
    columnClass: "bg-wb-blue-strong/[0.07]",
    tone: {
      bar: "bg-wb-blue-strong",
      lane: "bg-wb-blue-strong/[0.07]",
      card: "from-wb-blue-strong/[0.08]",
      icon: "text-wb-blue-strong",
      chip: "bg-wb-blue-strong/15 text-wb-blue-strong",
    },
    aliases: ["on-process", "active"],
  },
  {
    id: "pending",
    title: "Pending",
    subtitle: "Tertunda / Menunggu",
    icon: Clock,
    badgeClass: "border-transparent bg-warning/25 text-warning-foreground",
    columnClass: "bg-warning/[0.12]",
    tone: {
      bar: "bg-warning",
      lane: "bg-warning/[0.12]",
      card: "from-warning/[0.14]",
      icon: "text-warning-foreground",
      chip: "bg-warning/25 text-warning-foreground",
    },
    aliases: ["pending", "paused"],
  },
  {
    id: "revision",
    title: "Revisi / Review",
    subtitle: "Evaluasi & Perbaikan",
    icon: AlertCircle,
    badgeClass: "border-transparent bg-wb-purple/15 text-wb-purple",
    columnClass: "bg-wb-purple/[0.07]",
    tone: {
      bar: "bg-wb-purple",
      lane: "bg-wb-purple/[0.07]",
      card: "from-wb-purple/[0.08]",
      icon: "text-wb-purple",
      chip: "bg-wb-purple/15 text-wb-purple",
    },
    aliases: ["revision"],
  },
  {
    id: "finished",
    title: "Finished",
    subtitle: "Selesai",
    icon: CheckCircle2,
    badgeClass: "border-transparent bg-success/15 text-success-foreground",
    columnClass: "bg-success/[0.08]",
    tone: {
      bar: "bg-success",
      lane: "bg-success/[0.08]",
      card: "from-success/[0.09]",
      icon: "text-success-foreground",
      chip: "bg-success/15 text-success-foreground",
    },
    aliases: ["finished", "done", "archived"],
  },
  {
    id: "cancel",
    title: "Cancel / STOP",
    subtitle: "Dibatalkan",
    icon: XCircle,
    badgeClass: "border-transparent bg-destructive/15 text-destructive",
    columnClass: "bg-destructive/[0.06]",
    tone: {
      bar: "bg-destructive",
      lane: "bg-destructive/[0.06]",
      card: "from-destructive/[0.07]",
      icon: "text-destructive",
      chip: "bg-destructive/15 text-destructive",
    },
    aliases: ["cancel"],
  },
];

export function mapProjectToColumn(status: string): KanbanColumnId {
  const norm = (status || "").toLowerCase();
  for (const col of KANBAN_COLUMNS) {
    if (col.aliases.includes(norm) || col.id === norm) {
      return col.id;
    }
  }
  return "on-process";
}

/** Penghitung aset terhubung; tiap jenis punya rona sendiri, dipudarkan saat kosong. */
function AssetPill({
  icon,
  count,
  label,
  className,
}: {
  icon: ReactNode;
  count: number;
  label: string;
  className: string;
}) {
  return (
    <span
      title={`${count} ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums [&_svg]:size-3.5",
        className,
        count === 0 && "opacity-40",
      )}
    >
      {icon}
      {count}
    </span>
  );
}

interface KanbanBoardProps {
  projects: Project[];
  clients: Client[];
  queryKey: readonly string[];
  onEditProject: (project: Project) => void;
  onAddProject: () => void;
}

export function KanbanBoard({
  projects,
  clients,
  queryKey,
  onEditProject,
  onAddProject,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const updateStatusFn = useServerFn(workspaceUpdateProjectStatus);
  const deleteProjectFn = useServerFn(workspaceDeleteProject);

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<KanbanColumnId | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const parsedDesc = parseProjectDescription(p.description);
    const deadlineInfo = getDeadlineInfo(parsedDesc.dueDate);

    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (parsedDesc.cleanDescription &&
        parsedDesc.cleanDescription.toLowerCase().includes(search.toLowerCase()));

    const matchesClient = selectedClientId === "all" || p.client_id === selectedClientId;

    const matchesDeadline =
      deadlineFilter === "all" ||
      (deadlineFilter === "urgent" &&
        deadlineInfo &&
        (deadlineInfo.type === "overdue" || deadlineInfo.type === "nearing")) ||
      (deadlineFilter === "overdue" && deadlineInfo && deadlineInfo.type === "overdue");

    const matchesPriority = priorityFilter === "all" || parsedDesc.priority === priorityFilter;

    return matchesSearch && matchesClient && matchesDeadline && matchesPriority;
  });

  const handleUpdateStatus = async (projectId: string, newColumnId: KanbanColumnId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const currentColumn = mapProjectToColumn(project.status);
    if (currentColumn === newColumnId) return;

    setMovingId(projectId);

    // Optimistic cache update
    queryClient.setQueryData<WorkspaceData>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        projects: old.projects.map((p) => (p.id === projectId ? { ...p, status: newColumnId } : p)),
      };
    });

    try {
      await updateStatusFn({ data: { id: projectId, status: newColumnId } });
      const colMeta = KANBAN_COLUMNS.find((c) => c.id === newColumnId);
      toast.success(`Status "${project.name}" dipindahkan ke ${colMeta?.title || newColumnId}`);
    } catch (err) {
      toast.error("Gagal memperbarui status proyek.");
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setMovingId(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`Hapus proyek "${project.name}"?`)) return;
    try {
      await deleteProjectFn({ data: { id: project.id } });
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Proyek dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus proyek.");
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedProjectId(projectId);
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, colId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeave = (colId: KanbanColumnId) => {
    if (dragOverColumnId === colId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, colId: KanbanColumnId) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const projectId = e.dataTransfer.getData("text/plain") || draggedProjectId;
    if (projectId) {
      void handleUpdateStatus(projectId, colId);
    }
    setDraggedProjectId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Cari proyek atau client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full bg-card sm:w-56"
          />
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-44">
              <SelectValue placeholder="Filter Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Client</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-40">
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="high">🔴 Tinggi (High)</SelectItem>
              <SelectItem value="medium">🔵 Sedang (Medium)</SelectItem>
              <SelectItem value="low">⚪ Rendah (Low)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-44">
              <SelectValue placeholder="Filter Tenggat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tenggat</SelectItem>
              <SelectItem value="urgent">⚠️ Mendekati & Terlewat</SelectItem>
              <SelectItem value="overdue">🚨 Terlewat Tenggat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onAddProject}>
            <Plus className="mr-1 size-4" />
            Tambah Proyek
          </Button>
        </div>
      </div>

      {/* Sticky Notes Reminders Widget */}
      <StickyNotesWidget clients={clients} />

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KANBAN_COLUMNS.map((col, colIndex) => {
          const Icon = col.icon;
          const columnProjects = filteredProjects.filter(
            (p) => mapProjectToColumn(p.status) === col.id,
          );
          const isOver = dragOverColumnId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => handleDragLeave(col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "flex min-h-[480px] min-w-0 flex-col rounded-xl p-3 transition-colors",
                col.tone.lane,
                isOver && "ring-2 ring-primary",
              )}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className={cn("size-4 shrink-0", col.tone.icon)} />
                  <span className="truncate text-sm font-semibold text-foreground">
                    {col.title}
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    col.tone.chip,
                  )}
                >
                  {columnProjects.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {columnProjects.map((project) => {
                  const isDragging = draggedProjectId === project.id;
                  const isMoving = movingId === project.id;

                  const parsedDesc = parseProjectDescription(project.description);
                  const deadlineInfo = getDeadlineInfo(parsedDesc.dueDate);
                  const priorityInfo = getPriorityInfo(parsedDesc.priority);

                  return (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        // Kartu berwarna: wash gradien status di atas, garis aksen di kiri.
                        "group relative cursor-grab overflow-hidden rounded-lg border border-border bg-linear-to-b to-card p-3 pl-4 shadow-soft transition-shadow hover:shadow-card active:cursor-grabbing",
                        col.tone.card,
                        isDragging && "scale-95 opacity-40 ring-2 ring-primary",
                        isMoving && "animate-pulse opacity-70",
                        deadlineInfo?.cardBorderClass,
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("absolute inset-y-0 left-0 w-1", col.tone.bar)}
                      />
                      <div className="space-y-2.5">
                        {/* Title + menu */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                              <h4 className="truncate text-sm font-semibold text-foreground">
                                {project.name}
                              </h4>
                            </div>
                            {project.clientName && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                  aria-hidden
                                  className={cn(
                                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                    col.tone.chip,
                                  )}
                                >
                                  {project.clientName.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="truncate font-medium">{project.clientName}</span>
                              </div>
                            )}
                          </div>

                          {/* modal={false}: "Edit Data" membuka Dialog di halaman induk; dropdown modal
                              bisa meninggalkan pointer-events: none di body setelah dialog ditutup. */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Opsi untuk ${project.name}`}
                              >
                                <MoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-xs">Opsi Proyek</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => onEditProject(project)}
                                className="text-sm"
                              >
                                <Pencil className="mr-1.5 size-3.5" /> Edit Data
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs">Pindah Status</DropdownMenuLabel>
                              {KANBAN_COLUMNS.map((targetCol) => (
                                <DropdownMenuItem
                                  key={targetCol.id}
                                  disabled={col.id === targetCol.id}
                                  onClick={() => handleUpdateStatus(project.id, targetCol.id)}
                                  className="text-sm"
                                >
                                  <span
                                    className={cn("mr-1.5 size-2 rounded-full", targetCol.tone.bar)}
                                  />
                                  {targetCol.title}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project)}
                                className="text-sm text-destructive"
                              >
                                <Trash2 className="mr-1.5 size-3.5" /> Hapus Proyek
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Priority & deadline */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 text-xs",
                              priorityInfo.badgeClass,
                            )}
                          >
                            <span className={`size-1.5 rounded-full ${priorityInfo.dotClass}`} />
                            {priorityInfo.label}
                          </Badge>

                          {deadlineInfo && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 text-xs",
                                deadlineInfo.badgeClass,
                              )}
                            >
                              {deadlineInfo.type === "overdue" ? (
                                <AlertTriangle className="size-3 shrink-0 text-destructive" />
                              ) : deadlineInfo.type === "nearing" ? (
                                <Clock className="size-3 shrink-0 text-warning-foreground" />
                              ) : (
                                <Calendar className="size-3 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate">{deadlineInfo.label}</span>
                            </Badge>
                          )}
                        </div>

                        {parsedDesc.cleanDescription && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {parsedDesc.cleanDescription}
                          </p>
                        )}

                        {/* Footer: aset terhubung (kiri) + geser status (kanan) dalam satu baris */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-border/60 pt-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <AssetPill
                              icon={<Mail />}
                              count={project.emailCount}
                              label="Email"
                              className="bg-wb-cyan-soft text-wb-blue-strong"
                            />
                            <AssetPill
                              icon={<CodeXml />}
                              count={project.developerAssetCount}
                              label="Dev Assets"
                              className="bg-wb-purple-soft text-wb-purple"
                            />
                            <AssetPill
                              icon={<Megaphone />}
                              count={project.adsAssetCount}
                              label="Ads Assets"
                              className="bg-warning-soft text-warning-foreground"
                            />
                          </div>
                          <div className="flex items-center">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={colIndex === 0}
                              onClick={() =>
                                handleUpdateStatus(project.id, KANBAN_COLUMNS[colIndex - 1].id)
                              }
                              title="Geser ke kiri"
                              aria-label="Geser ke kiri"
                            >
                              <ArrowLeft />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={colIndex === KANBAN_COLUMNS.length - 1}
                              onClick={() =>
                                handleUpdateStatus(project.id, KANBAN_COLUMNS[colIndex + 1].id)
                              }
                              title="Geser ke kanan"
                              aria-label="Geser ke kanan"
                            >
                              <ArrowRight />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnProjects.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong/60 py-10 text-center text-muted-foreground/70">
                    <FolderKanban className="mb-1 size-5 opacity-50" />
                    <span className="text-xs">Kosong</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
