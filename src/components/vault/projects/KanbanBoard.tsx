import { useState, type DragEvent } from "react";
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
  Flame,
  FolderKanban,
  GripVertical,
  Mail,
  Megaphone,
  MoreVertical,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badgeClass: string;
  columnClass: string;
  aliases: string[];
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "things-to-do",
    title: "Things To Do",
    subtitle: "Antrian & Perencanaan",
    icon: CircleDot,
    badgeClass:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200",
    columnClass: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30",
    aliases: ["things-to-do", "queue-on-process"],
  },
  {
    id: "on-process",
    title: "On Process",
    subtitle: "Sedang Dikerjakan",
    icon: PlayCircle,
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200",
    columnClass: "border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20",
    aliases: ["on-process", "active"],
  },
  {
    id: "pending",
    title: "Pending",
    subtitle: "Tertunda / Menunggu",
    icon: Clock,
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200",
    columnClass: "border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20",
    aliases: ["pending", "paused"],
  },
  {
    id: "revision",
    title: "Revisi / Review",
    subtitle: "Evaluasi & Perbaikan",
    icon: AlertCircle,
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-200",
    columnClass:
      "border-purple-200 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/20",
    aliases: ["revision"],
  },
  {
    id: "finished",
    title: "Finished",
    subtitle: "Selesai",
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200",
    columnClass:
      "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20",
    aliases: ["finished", "done", "archived"],
  },
  {
    id: "cancel",
    title: "Cancel / STOP",
    subtitle: "Dibatalkan",
    icon: XCircle,
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200",
    columnClass: "border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/20",
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
            className="h-9 w-full sm:w-56"
          />
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="h-9 w-full sm:w-44">
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
            <SelectTrigger className="h-9 w-full sm:w-40">
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
            <SelectTrigger className="h-9 w-full sm:w-44">
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
                "flex flex-col rounded-xl border p-3 transition-colors min-h-[480px]",
                col.columnClass,
                isOver && "ring-2 ring-primary border-primary bg-primary/5",
              )}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{col.title}</span>
                </div>
                <Badge variant="outline" className={cn("text-[11px]", col.badgeClass)}>
                  {columnProjects.length}
                </Badge>
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
                    <Card
                      key={project.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group relative cursor-grab border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                        isDragging && "opacity-40 scale-95 ring-2 ring-primary",
                        isMoving && "animate-pulse opacity-70",
                        deadlineInfo?.cardBorderClass,
                      )}
                    >
                      <CardContent className="p-0 space-y-2">
                        {/* Card Header & Title */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <GripVertical className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                              <h4 className="truncate text-xs font-semibold text-foreground">
                                {project.name}
                              </h4>
                            </div>
                            {project.clientName && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="size-3 shrink-0" />
                                <span className="truncate font-medium">{project.clientName}</span>
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel className="text-[11px]">
                                Opsi Proyek
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => onEditProject(project)}
                                className="text-xs"
                              >
                                <Pencil className="mr-1.5 size-3.5" /> Edit Data
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[11px]">
                                Pindah Status
                              </DropdownMenuLabel>
                              {KANBAN_COLUMNS.map((targetCol) => (
                                <DropdownMenuItem
                                  key={targetCol.id}
                                  disabled={col.id === targetCol.id}
                                  onClick={() => handleUpdateStatus(project.id, targetCol.id)}
                                  className="text-xs"
                                >
                                  {targetCol.title}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project)}
                                className="text-xs text-destructive"
                              >
                                <Trash2 className="mr-1.5 size-3.5" /> Hapus Proyek
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Priority & Deadline Badges Bar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {/* Priority Badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "flex items-center gap-1 text-[10px] py-0.5 px-1.5",
                              priorityInfo.badgeClass,
                            )}
                          >
                            <span className={`size-1.5 rounded-full ${priorityInfo.dotClass}`} />
                            {priorityInfo.label}
                          </Badge>

                          {/* Deadline Indicator Badge */}
                          {deadlineInfo && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "flex items-center gap-1 text-[10px] py-0.5 px-1.5",
                                deadlineInfo.badgeClass,
                              )}
                            >
                              {deadlineInfo.type === "overdue" ? (
                                <AlertTriangle className="size-3 text-rose-600 shrink-0" />
                              ) : deadlineInfo.type === "nearing" ? (
                                <Clock className="size-3 text-amber-600 shrink-0" />
                              ) : (
                                <Calendar className="size-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate">{deadlineInfo.label}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Clean Description */}
                        {parsedDesc.cleanDescription && (
                          <p className="line-clamp-2 text-[11px] text-muted-foreground">
                            {parsedDesc.cleanDescription}
                          </p>
                        )}

                        {/* Connected Assets Badges */}
                        <div className="flex items-center gap-2 pt-1 border-t text-[10px] text-muted-foreground">
                          <span
                            className="flex items-center gap-0.5"
                            title={`${project.emailCount} Email`}
                          >
                            <Mail className="size-3" /> {project.emailCount}
                          </span>
                          <span
                            className="flex items-center gap-0.5"
                            title={`${project.developerAssetCount} Dev Assets`}
                          >
                            <CodeXml className="size-3" /> {project.developerAssetCount}
                          </span>
                          <span
                            className="flex items-center gap-0.5"
                            title={`${project.adsAssetCount} Ads Assets`}
                          >
                            <Megaphone className="size-3" /> {project.adsAssetCount}
                          </span>
                        </div>

                        {/* Quick Direction Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={colIndex === 0}
                            onClick={() =>
                              handleUpdateStatus(project.id, KANBAN_COLUMNS[colIndex - 1].id)
                            }
                            className="size-5 text-muted-foreground hover:text-foreground"
                            title="Geser ke kiri"
                          >
                            <ArrowLeft className="size-3" />
                          </Button>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {col.title}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={colIndex === KANBAN_COLUMNS.length - 1}
                            onClick={() =>
                              handleUpdateStatus(project.id, KANBAN_COLUMNS[colIndex + 1].id)
                            }
                            className="size-5 text-muted-foreground hover:text-foreground"
                            title="Geser ke kanan"
                          >
                            <ArrowRight className="size-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {columnProjects.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center text-muted-foreground/60">
                    <FolderKanban className="mb-1 size-5 opacity-40" />
                    <span className="text-[11px]">Kosong</span>
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
