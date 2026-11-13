import { useRef, useState, type ReactNode } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  Copy,
  Flag,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  taskStatuses as columns,
  taskPriorities as priorities,
  dateLabel,
  isLate,
  urgencyOf,
} from "./status";
import { OFFSET_PRESETS } from "./reminders";
import {
  DEFAULT_OFFSETS,
  clearTaskSchedule,
  loadTaskSchedule,
  saveTaskSchedule,
} from "./taskSchedule";
import type { WorkboardClient, WorkboardProject, WorkboardTask } from "./useWorkboardData";

const TASK_TYPE_LABELS: Record<string, string> = {
  design: "Design",
  content: "Content",
  social_media: "Social Media",
  video: "Video",
  website: "Website",
  ads_marketing: "Ads & Marketing",
  seo: "SEO",
  research: "Research",
  strategy: "Strategy",
  analytics: "Analytics",
  branding: "Branding",
  general: "General",
};

/** Kontrol native (select) dibuat sama dengan Input design system. */
const nativeControl =
  "h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Label membungkus kontrol (asosiasi implisit tetap seperti aslinya). */
function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Group tasks by deadline (ascending); tasks without deadline go last. */
function groupByDate(rows: WorkboardTask[]): [string, WorkboardTask[]][] {
  const map = new Map<string, WorkboardTask[]>();
  for (const t of rows) {
    const key = t.due_date ?? "";
    map.set(key, [...(map.get(key) ?? []), t]);
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === b) return 0;
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });
}

type TaskDraft = {
  client_id: string;
  title: string;
  task_type: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assignee: string;
  /** "HH:MM" exact deadline time (optional). */
  due_time: string;
  /** Minutes before the deadline at which an alarm should ring. */
  reminder_offsets: number[];
  /** True when the saved task already had an exact time (so clearing the field removes it). */
  had_time: boolean;
};
const emptyDraft = (clientId: string, status = "things-to-do"): TaskDraft => ({
  client_id: clientId,
  title: "",
  task_type: "general",
  description: "",
  status,
  priority: "medium",
  due_date: "",
  assignee: "",
  due_time: "",
  reminder_offsets: [...DEFAULT_OFFSETS],
  had_time: false,
});

type CreateInput = {
  client_id: string;
  title: string;
  task_type?: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: string | null;
};
type UpdatePatch = Partial<{
  client_id: string;
  title: string;
  task_type: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: string | null;
}>;

function TaskMenu({
  task,
  onEdit,
  onDuplicate,
  onMove,
  onPriority,
  onDelete,
}: {
  task: WorkboardTask;
  onEdit: (task: WorkboardTask) => void;
  onDuplicate: (task: WorkboardTask) => void;
  onMove: (id: string, status: string) => void;
  onPriority: (id: string, priority: string) => void;
  onDelete: (task: WorkboardTask) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(event) => event.stopPropagation()}
          // Cegah Enter/Spasi pada tombol ini ikut membuka detail task (kartu induk juga menangani keyboard).
          onKeyDown={(event) => event.stopPropagation()}
          aria-label={"Aksi untuk " + task.title}
          className="shrink-0"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onEdit(task)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(task)}>
          <Copy /> Duplikat
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRightLeft /> Pindah status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {columns.map((c) => (
              <DropdownMenuItem
                key={c.id}
                disabled={c.id === task.status}
                onSelect={() => onMove(task.id, c.id)}
              >
                <span className={cn("size-2 rounded-full", c.dot)} />
                {c.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Flag /> Prioritas
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {priorities.map((p) => (
              <DropdownMenuItem
                key={p.id}
                disabled={p.id === task.priority}
                onSelect={() => onPriority(task.id, p.id)}
              >
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete(task)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 /> Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskBoard({
  query,
  tasks,
  clients,
  projects,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelectTask,
}: {
  query: string;
  tasks: WorkboardTask[];
  clients: WorkboardClient[];
  projects: WorkboardProject[];
  loading: boolean;
  onCreate: (input: CreateInput) => Promise<unknown>;
  onUpdate: (id: string, patch: UpdatePatch) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (task: WorkboardTask) => Promise<unknown>;
  onSelectTask: (task: WorkboardTask) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft(clients[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;
  const q = query.trim().toLowerCase();
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const filtered = tasks.filter(
    (t) =>
      !q ||
      [t.title, t.description ?? "", t.assignee ?? "", clientById.get(t.client_id)?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );

  const openNew = (status = "things-to-do") => {
    setEditing("new");
    setDraft(emptyDraft(clients[0]?.id ?? "", status));
  };
  const openEdit = (task: WorkboardTask) => {
    setEditing(task.id);
    setDraft({
      client_id: task.client_id,
      title: task.title,
      task_type: task.task_type ?? "general",
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
      assignee: task.assignee ?? "",
      due_time: "",
      reminder_offsets: [...DEFAULT_OFFSETS],
      had_time: false,
    });
    // Fill in the saved exact time and pending alarms once they arrive (never overwrite typing).
    void loadTaskSchedule(task.id, task.due_date)
      .then((schedule) => {
        if (editingRef.current !== task.id || !schedule.hasTime) return;
        setDraft((d) =>
          d.due_time
            ? d
            : {
                ...d,
                due_time: schedule.time,
                reminder_offsets: schedule.offsets,
                had_time: true,
              },
        );
      })
      .catch(() => undefined);
  };
  // Escape dan klik di luar ditangani oleh Dialog; penjaga `saving` tetap di sini.
  const close = () => {
    if (!saving) setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.client_id) {
      toast.error("Pilih client terlebih dahulu.");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("Nama task wajib diisi.");
      return;
    }
    if (draft.due_time && !draft.due_date) {
      toast.error("Isi tanggal deadline untuk memakai jam.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: draft.client_id,
        title: draft.title.trim(),
        task_type: draft.task_type,
        description: draft.description.trim(),
        status: draft.status,
        priority: draft.priority,
        due_date: draft.due_date || null,
        assignee: draft.assignee.trim() || null,
      };
      let taskId: string | null = editing && editing !== "new" ? editing : null;
      if (editing === "new") {
        const created = (await onCreate(payload)) as { id?: string } | null | undefined;
        taskId = created?.id ?? null;
        toast.success("Task berhasil ditambahkan.");
      } else if (editing) {
        await onUpdate(editing, payload);
        toast.success("Task berhasil diperbarui.");
      }
      // Exact time + alarms are saved after the task itself.
      if (taskId) {
        try {
          if (draft.due_date && draft.due_time) {
            await saveTaskSchedule(taskId, draft.due_date, draft.due_time, draft.reminder_offsets);
          } else if (draft.had_time) {
            await clearTaskSchedule(taskId);
          }
        } catch (err) {
          toast.error(
            "Task tersimpan, tetapi jadwal/pengingat gagal: " +
              (err instanceof Error ? err.message : "kesalahan tidak dikenal"),
          );
        }
      }
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan task.");
    } finally {
      setSaving(false);
    }
  };
  const move = async (id: string, status: string) => {
    try {
      await onUpdate(id, { status });
      toast.success("Status task diperbarui.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memindahkan task.");
    }
  };
  const changePriority = async (id: string, priority: string) => {
    try {
      await onUpdate(id, { priority });
      toast.success("Prioritas diperbarui.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah prioritas.");
    }
  };
  const restore = async (task: WorkboardTask) => {
    try {
      await onCreate({
        client_id: task.client_id,
        title: task.title,
        task_type: task.task_type ?? "general",
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee: task.assignee,
      });
      toast.success("Task dikembalikan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengembalikan task.");
    }
  };
  const remove = async (task: WorkboardTask) => {
    try {
      await onDelete(task.id);
      toast("Task “" + task.title + "” dihapus", {
        duration: 10000,
        action: { label: "Urungkan", onClick: () => void restore(task) },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus task.");
    }
  };
  const duplicate = async (task: WorkboardTask) => {
    try {
      await onDuplicate(task);
      toast.success("Task berhasil diduplikasi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menduplikasi task.");
    }
  };

  const selectedClient = clients.find((client) => client.id === draft.client_id);
  const selectedProject = projects.find((project) => project.client_id === draft.client_id);

  return (
    // Tanpa pembungkus card: papan duduk langsung di atas canvas.
    // Tingkat: canvas → jalur kolom (inset, tanpa border) → kartu task (satu-satunya yang berbingkai).
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Task board</h2>
          <p className="text-sm text-muted-foreground">
            Task per deadline · tersimpan otomatis ke Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">{filtered.length} task</span>
          <Button onClick={() => openNew()} disabled={!clients.length || loading}>
            <Plus />
            Task baru
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
          Memuat task…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const rows = filtered.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="min-h-40 rounded-xl bg-border/40 p-3">
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-2.5 shrink-0 rounded-full", col.dot)} />
                    {/* Judul status disimpan huruf kapital; ditampilkan sentence case. */}
                    <h3 className="truncate text-sm font-semibold lowercase text-foreground first-letter:uppercase">
                      {col.title}
                    </h3>
                    <span className="text-xs tabular-nums text-muted-foreground">{rows.length}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={"Tambah task di " + col.title}
                    onClick={() => openNew(col.id)}
                    disabled={!clients.length}
                  >
                    <Plus />
                  </Button>
                </div>
                {rows.length ? (
                  <div className="space-y-4">
                    {groupByDate(rows).map(([date, group]) => (
                      <div key={date || "none"} className="space-y-2">
                        <p className="px-1 text-xs font-medium text-muted-foreground">
                          {date ? dateLabel(date) : "Tanpa deadline"}
                        </p>
                        {group.map((task) => {
                          const client = clientById.get(task.client_id);
                          const urgency = urgencyOf(task);
                          return (
                            <article
                              key={task.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Buka detail task: ${task.title}`}
                              onClick={() => onSelectTask(task)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onSelectTask(task);
                                }
                              }}
                              className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-soft transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-snug text-foreground">
                                    {task.title}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {client?.name ?? "Client tidak ditemukan"}
                                  </p>
                                  <Badge variant="muted" className="mt-1.5">
                                    {TASK_TYPE_LABELS[task.task_type ?? "general"] || "General"}
                                  </Badge>
                                </div>
                                {task.id.startsWith("demo-task-") ? (
                                  <Badge variant="muted">DEMO</Badge>
                                ) : (
                                  <TaskMenu
                                    task={task}
                                    onEdit={openEdit}
                                    onDuplicate={(t) => void duplicate(t)}
                                    onMove={(id, s) => void move(id, s)}
                                    onPriority={(id, p) => void changePriority(id, p)}
                                    onDelete={(t) => void remove(t)}
                                  />
                                )}
                              </div>
                              {task.description && (
                                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                {urgency && (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-xs font-medium",
                                      urgency.className,
                                    )}
                                  >
                                    {urgency.label}
                                  </span>
                                )}
                                {task.priority === "high" && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                    <Flag className="size-3" />
                                    Prioritas tinggi
                                  </span>
                                )}
                                {task.assignee && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <UserRound className="size-3" />
                                    {task.assignee}
                                  </span>
                                )}
                                {task.due_date && !isLate(task.due_date) && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarDays className="size-3" />
                                    {dateLabel(task.due_date)}
                                  </span>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">Belum ada task</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Task baru" : "Edit task"}</DialogTitle>
            <DialogDescription>Perubahan akan langsung disimpan ke Supabase.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Jenis task / Workspace"
                hint="Jenis ini menentukan modul deliverable dan preview yang muncul di Graphic Workspace."
                className="sm:col-span-2"
              >
                <select
                  value={draft.task_type}
                  onChange={(e) => setDraft((d) => ({ ...d, task_type: e.target.value }))}
                  className={nativeControl}
                >
                  <option value="design">Design</option>
                  <option value="content">Content Writing</option>
                  <option value="social_media">Social Media</option>
                  <option value="video">Video Production</option>
                  <option value="website">Website Development</option>
                  <option value="ads_marketing">Ads & Marketing</option>
                  <option value="seo">SEO</option>
                  <option value="research">Research</option>
                  <option value="strategy">Strategy</option>
                  <option value="analytics">Data & Analytics</option>
                  <option value="branding">Branding</option>
                  <option value="general">General / Other</option>
                </select>
              </Field>

              <Field label="Client" className="sm:col-span-2">
                <select
                  required
                  value={draft.client_id}
                  onChange={(e) => setDraft((d) => ({ ...d, client_id: e.target.value }))}
                  className={nativeControl}
                >
                  <option value="" disabled>
                    Pilih client
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Konteks client: area inset (tanpa border), bukan kotak bergaris di dalam dialog */}
              <div className="rounded-lg bg-muted/60 p-3 sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Konteks Graphic Workspace</p>
                  <span className="text-xs text-muted-foreground">Data master client & proyek</span>
                </div>
                {selectedClient ? (
                  <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Nama legal / perusahaan</dt>
                      <dd className="font-medium text-foreground">
                        {selectedClient.legal_name || selectedClient.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Proyek terkait</dt>
                      <dd className="font-medium text-foreground">
                        {selectedProject?.name || "Belum ada proyek"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status proyek / client</dt>
                      <dd className="font-medium text-foreground">
                        {selectedProject?.status || selectedClient.client_status || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Industri</dt>
                      <dd className="font-medium text-foreground">
                        {selectedClient.industry || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">PIC client</dt>
                      <dd className="font-medium text-foreground">
                        {selectedClient.contact_name || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Kontak</dt>
                      <dd className="font-medium text-foreground">
                        {[selectedClient.contact_email, selectedClient.contact_phone]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Profil perusahaan</dt>
                      <dd className="whitespace-pre-wrap text-foreground">
                        {selectedClient.company_profile ||
                          selectedClient.description ||
                          "Belum diisi"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Scope of Work</dt>
                      <dd className="whitespace-pre-wrap text-foreground">
                        {selectedClient.scope_of_work ||
                          selectedProject?.description ||
                          "Belum diisi"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pilih client untuk melihat konteks yang akan tampil di Graphic Workspace.
                  </p>
                )}
                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  Konteks ini otomatis mengikuti data master client/proyek. Untuk mengubah profil,
                  kontak, atau scope, perbarui data client/proyek; task akan menyimpan relasi client
                  yang dipilih.
                </p>
              </div>

              <Field label="Nama task" className="sm:col-span-2">
                <Input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Contoh: Revisi desain landing page"
                />
              </Field>

              <Field label="Deskripsi / brief pekerjaan" className="sm:col-span-2">
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Tujuan pekerjaan, ruang lingkup, referensi, output/deliverable, dan catatan khusus untuk ditampilkan di Graphic Workspace"
                />
              </Field>

              <Field label="Status">
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  className={nativeControl}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Prioritas">
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                  className={nativeControl}
                >
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Deadline">
                <Input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                />
              </Field>

              <Field label="Jam deadline (opsional)">
                <Input
                  type="time"
                  value={draft.due_time}
                  disabled={!draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_time: e.target.value }))}
                />
              </Field>

              {draft.due_date && draft.due_time && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1.5 text-sm font-medium text-foreground">
                    Bunyikan alarm
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {OFFSET_PRESETS.map((p) => {
                      const on = draft.reminder_offsets.includes(p.minutes);
                      return (
                        <label
                          key={p.minutes}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:bg-muted",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                reminder_offsets: on
                                  ? d.reminder_offsets.filter((m) => m !== p.minutes)
                                  : [...d.reminder_offsets, p.minutes],
                              }))
                            }
                          />
                          {p.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Alarm berbunyi selama Workboard terbuka di browser. Waktu mengikuti zona waktu
                    perangkat. Kosongkan jam untuk menghapus jadwal alarm.
                  </p>
                </fieldset>
              )}

              {editing === "new" && (
                <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-foreground sm:col-span-2">
                  <b className="font-semibold">Langkah berikutnya: Client Brief &amp; Scope.</b>{" "}
                  Setelah task disimpan, Graphic Workspace akan otomatis membuka task ini. Lengkapi
                  12 bagian brief, deliverables, acceptance criteria, estimasi, dan aturan revisi di
                  sana.
                </p>
              )}

              <Field label="Penanggung jawab / PIC task" className="sm:col-span-2">
                <Input
                  maxLength={120}
                  value={draft.assignee}
                  onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                  placeholder="Nama PIC / anggota tim"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={close} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving || !clients.length}>
                {saving ? "Menyimpan…" : editing === "new" ? "Simpan task" : "Simpan perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
