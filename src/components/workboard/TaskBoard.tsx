import { useState } from "react";
import {
  CalendarDays,
  AlertTriangle,
  Clock3,
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Copy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkboardClient, WorkboardTask } from "./useWorkboardData";

const columns = [
  { id: "things-to-do", title: "TERTUNDA" },
  { id: "queue-on-process", title: "ANTRIAN" },
  { id: "on-process", title: "ON PROSES" },
  { id: "pending", title: "PENDING" },
  { id: "revision", title: "REVIEW CLIENT" },
  { id: "finished", title: "SELESAI" },
  { id: "cancel", title: "CANCEL / STOP" },
] as const;
const priorities = [
  { id: "low", label: "Rendah" },
  { id: "medium", label: "Sedang" },
  { id: "high", label: "Tinggi" },
] as const;
const dateLabel = (value: string) =>
  new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const isLate = (value: string | null) =>
  !!value && new Date(value + "T23:59:59").getTime() < Date.now();
type TaskDraft = {
  client_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assignee: string;
};
const emptyDraft = (clientId: string): TaskDraft => ({
  client_id: clientId,
  title: "",
  description: "",
  status: "things-to-do",
  priority: "medium",
  due_date: "",
  assignee: "",
});

export function TaskBoard({
  query,
  tasks,
  clients,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  query: string;
  tasks: WorkboardTask[];
  clients: WorkboardClient[];
  loading: boolean;
  onCreate: (input: {
    client_id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date: string | null;
    assignee: string | null;
  }) => Promise<unknown>;
  onUpdate: (
    id: string,
    patch: Partial<{
      client_id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      due_date: string | null;
      assignee: string | null;
    }>,
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (task: WorkboardTask) => Promise<unknown>;
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
  const openNew = () => {
    setEditing("new");
    setDraft(emptyDraft(clients[0]?.id ?? ""));
  };
  const openEdit = (task: WorkboardTask) => {
    setEditing(task.id);
    setDraft({
      client_id: task.client_id,
      title: task.title,
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan task.");
    } finally {
      setSaving(false);
    }
  };
  const move = async (id: string, status: string) => {
    try {
      await onUpdate(id, { status });
      toast.success("Status task diperbarui.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindahkan task.");
    }
  };
  const changePriority = async (id: string, priority: string) => {
    try {
      await onUpdate(id, { priority });
      toast.success("Prioritas diperbarui.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah prioritas.");
    }
  };
  const remove = async (task: WorkboardTask) => {
    if (!window.confirm("Hapus task '" + task.title + "' secara permanen?")) return;
    try {
      await onDelete(task.id);
      toast.success("Task dihapus.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus task.");
    }
  };
  const duplicate = async (task: WorkboardTask) => {
    try {
      await onDuplicate(task);
      toast.success("Task berhasil diduplikasi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menduplikasi task.");
    }
  };
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight text-wb-ink">TASK BOARD</h2>
          <p className="text-[10px] text-muted-foreground">
            Kelola task langsung ke database Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-card px-3 py-1 text-[10px] font-semibold text-wb-ink shadow-soft">
            {filtered.length} task
          </span>
          <button
            type="button"
            onClick={openNew}
            disabled={!clients.length || loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-wb-ink px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Tambah Task
          </button>
        </div>
      </div>
      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-xs text-muted-foreground">
          Memuat task…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const rows = filtered.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="min-h-40 rounded-xl border border-border bg-card/70 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-wb-ink">{col.title}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px]">
                    {rows.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {rows.map((task) => {
                    const client = clientById.get(task.client_id);
                    const late = isLate(task.due_date);
                    return (
                      <article
                        key={task.id}
                        className={cn(
                          "rounded-lg border bg-card p-2.5 shadow-soft",
                          late && "border-destructive/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-bold leading-snug text-wb-ink">
                            {task.title}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              title="Edit task"
                              onClick={() => openEdit(task)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Duplikat task"
                              onClick={() => void duplicate(task)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Copy className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Hapus task"
                              onClick={() => void remove(task)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-[9px] text-muted-foreground">
                          {client?.name ?? "Client tidak ditemukan"}
                        </p>
                        {task.description && (
                          <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <select
                            aria-label="Ubah prioritas"
                            value={task.priority}
                            onChange={(e) => void changePriority(task.id, e.target.value)}
                            className={cn(
                              "max-w-[90px] rounded-full border-0 px-2 py-0.5 text-[8px] font-bold",
                              task.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "low"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {priorities.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          {task.due_date && (
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[8px]",
                                late ? "font-semibold text-destructive" : "text-muted-foreground",
                              )}
                            >
                              {late ? (
                                <AlertTriangle className="size-3" />
                              ) : (
                                <CalendarDays className="size-3" />
                              )}
                              {dateLabel(task.due_date)}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <p className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
                            <UserRound className="size-3" />
                            {task.assignee}
                          </p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-[8px] text-muted-foreground">
                          <Clock3 className="size-3" />
                          Dibuat {new Date(task.created_at).toLocaleDateString("id-ID")}
                        </p>
                        <label className="mt-2 block">
                          <span className="sr-only">Pindah status task</span>
                          <select
                            value={task.status}
                            onChange={(e) => void move(task.id, e.target.value)}
                            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-[9px] text-wb-ink"
                          >
                            {columns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}
                  {!rows.length && (
                    <p className="py-5 text-center text-[9px] text-muted-foreground">
                      Belum ada task
                    </p>
                  )}
                </div>
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
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-wb-ink">
                  {editing === "new" ? "Tambah Task" : "Edit Task"}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Perubahan akan langsung disimpan ke Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink sm:col-span-2">
                Client
                <select
                  required
                  value={draft.client_id}
                  onChange={(e) => setDraft((d) => ({ ...d, client_id: e.target.value }))}
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink sm:col-span-2">
                Nama task
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Contoh: Revisi desain landing page"
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                />
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink sm:col-span-2">
                Deskripsi
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Detail pekerjaan dan output yang diharapkan"
                  className="w-full rounded-md border border-border bg-card p-2 text-xs"
                />
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink">
                Status
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink">
                Prioritas
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                >
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink">
                Deadline
                <input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                />
              </label>
              <label className="space-y-1 text-[10px] font-semibold text-wb-ink">
                Penanggung jawab
                <input
                  maxLength={120}
                  value={draft.assignee}
                  onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                  placeholder="Nama PIC / anggota tim"
                  className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-wb-ink"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !clients.length}
                className="rounded-md bg-wb-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : editing === "new" ? "Simpan Task" : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
