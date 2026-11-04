import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  taskStatuses as columns,
  taskPriorities as priorities,
  dateLabel,
  isLate,
  urgencyOf,
} from "./status";
import type { WorkboardClient, WorkboardProject, WorkboardTask } from "./useWorkboardData";

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
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={"Aksi untuk " + task.title}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal className="size-4" />
        </button>
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
    });
  };
  const close = () => {
    if (!saving) setEditing(null);
  };

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setEditing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, saving]);

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
      if (editing === "new") {
        await onCreate(payload);
        toast.success("Task berhasil ditambahkan.");
      } else if (editing) {
        await onUpdate(editing, payload);
        toast.success("Task berhasil diperbarui.");
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

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-wb-ink">Task Board</h2>
          <p className="text-xs text-muted-foreground">
            Timeline task per deadline · tersimpan otomatis ke Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-wb-ink">
            {filtered.length} task
          </span>
          <button
            type="button"
            onClick={() => openNew()}
            disabled={!clients.length || loading}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-wb-ink px-4 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-4" />
            Task baru
          </button>
        </div>
      </div>
      {loading ? (
        <div className="rounded-xl border border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Memuat task…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const rows = filtered.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="min-h-40 rounded-xl border border-border bg-muted/50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", col.dot)} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-wb-ink">
                      {col.title}
                    </h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {rows.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={"Tambah task di " + col.title}
                    onClick={() => openNew(col.id)}
                    disabled={!clients.length}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {rows.length ? (
                  <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-border">
                    {groupByDate(rows).map(([date, group]) => (
                      <div key={date || "none"} className="space-y-3">
                        <div className="relative text-xs font-bold leading-5 text-muted-foreground">
                          <span className="absolute -left-5 top-1 size-3 rounded-full border-2 border-wb-ink bg-wb-canvas" />
                          {date ? dateLabel(date) : "Tanpa deadline"}
                        </div>
                        {group.map((task) => {
                          const client = clientById.get(task.client_id);
                          const urgency = urgencyOf(task);
                          return (
                            <div key={task.id} className="relative">
                              <span className="absolute -left-[18px] top-5 size-2 rounded-full bg-wb-ink" />
                              <span className="absolute -left-2.5 top-[23px] h-0.5 w-2.5 bg-border" />
                              <article
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
                                className="cursor-pointer rounded-xl border border-border bg-card p-3 shadow-soft transition hover:border-wb-blue-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-blue-strong"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold leading-snug text-wb-ink">
                                      {task.title}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {client?.name ?? "Client tidak ditemukan"}
                                    </p>
                                    <span className="mt-1 inline-flex rounded-full bg-wb-blue/10 px-2 py-0.5 text-[9px] font-semibold text-wb-blue-strong">{({design:"Design",content:"Content",social_media:"Social Media",video:"Video",website:"Website",ads_marketing:"Ads & Marketing",seo:"SEO",research:"Research",strategy:"Strategy",analytics:"Analytics",branding:"Branding",general:"General"} as Record<string,string>)[task.task_type ?? "general"] || "General"}</span>
                                  </div>
                                  {task.id.startsWith("demo-task-") ? (
                                    <span className="rounded-full bg-wb-blue/20 px-2 py-1 text-[9px] font-semibold text-wb-blue-strong">DEMO</span>
                                  ) : <TaskMenu
                                    task={task}
                                    onEdit={openEdit}
                                    onDuplicate={(t) => void duplicate(t)}
                                    onMove={(id, s) => void move(id, s)}
                                    onPriority={(id, p) => void changePriority(id, p)}
                                    onDelete={(t) => void remove(t)}
                                  />}
                                </div>
                                {task.description && (
                                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {task.description}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                  {urgency && (
                                    <span
                                      className={cn(
                                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                        urgency.className,
                                      )}
                                    >
                                      {urgency.label}
                                    </span>
                                  )}
                                  {task.priority === "high" && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
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
                            </div>
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
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label={editing === "new" ? "Tambah task" : "Edit task"}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-wb-ink">
                  {editing === "new" ? "Task baru" : "Edit task"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Perubahan akan langsung disimpan ke Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-wb-ink sm:col-span-2">
                Jenis task / Workspace
                <select value={draft.task_type} onChange={(e) => setDraft((d) => ({ ...d, task_type: e.target.value }))} className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm">
                  <option value="design">Design</option><option value="content">Content Writing</option><option value="social_media">Social Media</option><option value="video">Video Production</option><option value="website">Website Development</option><option value="ads_marketing">Ads & Marketing</option><option value="seo">SEO</option><option value="research">Research</option><option value="strategy">Strategy</option><option value="analytics">Data & Analytics</option><option value="branding">Branding</option><option value="general">General / Other</option>
                </select>
                <span className="block text-[10px] font-normal text-muted-foreground">Jenis ini menentukan modul deliverable dan preview yang muncul di Graphic Workspace.</span>
              </label>
              <label className="space-y-1 text-xs font-semibold text-wb-ink sm:col-span-2">
                Client
                <select
                  required
                  value={draft.client_id}
                  onChange={(e) => setDraft((d) => ({ ...d, client_id: e.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                >
                  <option value="" disabled>Pilih client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {(() => {
                const selectedClient = clients.find((client) => client.id === draft.client_id);
                const selectedProject = projects.find((project) => project.client_id === draft.client_id);
                return (
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-wb-ink">Konteks Graphic Workspace</p>
                      <span className="text-[9px] text-muted-foreground">Data master client & proyek</span>
                    </div>
                    {selectedClient ? (
                      <dl className="grid gap-x-4 gap-y-2 text-[10px] sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">Nama legal / perusahaan</dt><dd className="font-semibold text-wb-ink">{selectedClient.legal_name || selectedClient.name}</dd></div>
                        <div><dt className="text-muted-foreground">Proyek terkait</dt><dd className="font-semibold text-wb-ink">{selectedProject?.name || "Belum ada proyek"}</dd></div>
                        <div><dt className="text-muted-foreground">Status proyek / client</dt><dd className="font-semibold text-wb-ink">{selectedProject?.status || selectedClient.client_status || "—"}</dd></div>
                        <div><dt className="text-muted-foreground">Industri</dt><dd className="font-semibold text-wb-ink">{selectedClient.industry || "—"}</dd></div>
                        <div><dt className="text-muted-foreground">PIC client</dt><dd className="font-semibold text-wb-ink">{selectedClient.contact_name || "—"}</dd></div>
                        <div><dt className="text-muted-foreground">Kontak</dt><dd className="font-semibold text-wb-ink">{[selectedClient.contact_email, selectedClient.contact_phone].filter(Boolean).join(" · ") || "—"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-muted-foreground">Profil perusahaan</dt><dd className="whitespace-pre-wrap text-wb-ink">{selectedClient.company_profile || selectedClient.description || "Belum diisi"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-muted-foreground">Scope of Work</dt><dd className="whitespace-pre-wrap text-wb-ink">{selectedClient.scope_of_work || selectedProject?.description || "Belum diisi"}</dd></div>
                      </dl>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Pilih client untuk melihat konteks yang akan tampil di Graphic Workspace.</p>
                    )}
                    <p className="mt-2 border-t border-border pt-2 text-[9px] text-muted-foreground">
                      Konteks ini otomatis mengikuti data master client/proyek. Untuk mengubah profil, kontak, atau scope, perbarui data client/proyek; task akan menyimpan relasi client yang dipilih.
                    </p>
                  </div>
                );
              })()}
              <label className="space-y-1 text-xs font-semibold text-wb-ink sm:col-span-2">
                Nama task
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Contoh: Revisi desain landing page"
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-wb-ink sm:col-span-2">
                Deskripsi / brief pekerjaan
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Tujuan pekerjaan, ruang lingkup, referensi, output/deliverable, dan catatan khusus untuk ditampilkan di Graphic Workspace"
                  className="w-full rounded-md border border-border bg-card p-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-wb-ink">
                Status
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-wb-ink">
                Prioritas
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                >
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-wb-ink">
                Deadline
                <input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                />
              </label>
              {editing === "new" && (
                <div className="sm:col-span-2 rounded-lg border border-wb-blue-strong/20 bg-wb-blue/10 p-3 text-[10px] leading-relaxed text-wb-ink">
                  <b>Langkah berikutnya: Client Brief &amp; Scope.</b> Setelah task disimpan, Graphic Workspace akan otomatis membuka task ini. Lengkapi 12 bagian brief, deliverables, acceptance criteria, estimasi, dan aturan revisi di sana.
                </div>
              )}
              <label className="space-y-1 text-xs font-semibold text-wb-ink">
                Penanggung jawab / PIC task
                <input
                  maxLength={120}
                  value={draft.assignee}
                  onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                  placeholder="Nama PIC / anggota tim"
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="h-10 rounded-md border border-border px-4 text-xs font-semibold text-wb-ink"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !clients.length}
                className="h-10 rounded-md bg-wb-ink px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : editing === "new" ? "Simpan task" : "Simpan perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
