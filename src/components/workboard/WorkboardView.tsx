import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  FolderKanban,
  ListTodo,
  FileText,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { StatStrip } from "@/components/vault/StatStrip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraphicWorkspace } from "./GraphicWorkspace";
import { TaskBoard } from "./TaskBoard";
import { AiSecretaryPanel, CalendarPanel, WorkListPanel } from "./BottomPanels";
import { useWorkboardData, type WorkboardTask } from "./useWorkboardData";

/** L1 — sama dengan halaman Accounts dan Proyek. */
const surface = "rounded-xl border border-border bg-card shadow-soft";

export function WorkboardView() {
  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <WorkboardContent />
      </main>
    </div>
  );
}

export function WorkboardContent() {
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const {
    clients,
    projects,
    tasks,
    documents,
    activities,
    designVersions,
    designComments,
    designReviews,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
  } = useWorkboardData();
  useEffect(() => {
    if (!selectedClientId && clients.length) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);
  const demoTasks: WorkboardTask[] = clients.length && !tasks.length ? [
    { id: "demo-task-1", client_id: clients[0].id, title: "Desain feed Instagram — campaign November", description: "Buat 3 konsep feed Instagram untuk campaign November. Gunakan brand guideline, siapkan preview, lalu kirim untuk review client.", status: "on-process", priority: "high", due_date: "2026-11-06", assignee: "Creative Designer", created_at: "2026-11-01T09:00:00.000Z", updated_at: "2026-11-03T08:00:00.000Z", sort_order: 1 },
    { id: "demo-task-2", client_id: clients[0].id, title: "Revisi landing page", description: "Perbaiki hero section, CTA, dan tampilan mobile berdasarkan masukan client.", status: "revision", priority: "medium", due_date: "2026-11-08", assignee: "UI/UX Designer", created_at: "2026-11-02T10:00:00.000Z", updated_at: "2026-11-03T08:30:00.000Z", sort_order: 2 },
    { id: "demo-task-3", client_id: clients[0].id, title: "Susun kalender konten bulanan", description: "Riset topik, susun 12 ide konten, dan ajukan jadwal publikasi untuk persetujuan.", status: "things-to-do", priority: "low", due_date: "2026-11-12", assignee: "Content Strategist", created_at: "2026-11-03T09:00:00.000Z", updated_at: "2026-11-03T09:00:00.000Z", sort_order: 3 },
  ] : [];
  const boardTasks = tasks.length ? tasks : demoTasks;
  const selectedTask = boardTasks.find((task) => task.id === selectedTaskId) ?? null;

  // Scroll only after React has rendered the selected task detail in Graphic Workspace.
  useEffect(() => {
    if (!selectedTask) return;
    document.getElementById("graphic-task-detail")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedTask?.id]);
  const latestActivities = activities.slice(0, 8);
  const counts = [
    { label: "Total client", value: clients.length, icon: Users },
    { label: "Total proyek", value: projects.length, icon: FolderKanban },
    {
      label: "Task aktif",
      value: tasks.filter((t) => !["finished", "cancel"].includes(t.status)).length,
      icon: ListTodo,
    },
    { label: "Dokumen", value: documents.length, icon: FileText },
    { label: "Aktivitas", value: activities.length, icon: Activity },
  ];
  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 pb-16 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Workboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Data client, proyek, task, deadline, dokumen, dan aktivitas tersinkron dari Supabase.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void refresh()
              .then(() => toast.success("Data Workboard diperbarui"))
              .catch((e) => toast.error(e.message))
          }
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh data
        </Button>
      </header>

      <StatStrip
        items={counts.map(({ label, value, icon: Icon }) => ({
          label,
          value: loading ? "—" : value,
          icon: <Icon />,
        }))}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-2.5 text-sm text-destructive"
        >
          <span>Gagal memuat data Supabase: {error}</span>
          <Button
            variant="ghost-danger"
            size="sm"
            onClick={() => void refresh().catch((e) => toast.error(e.message))}
          >
            Coba lagi
          </Button>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-full max-w-[360px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-soft">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari task, client, PIC, deskripsi…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
              ⌘K
            </kbd>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Client aktif
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedTaskId(null);
              }}
              className="h-9 max-w-[240px] rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground shadow-soft"
            >
              <option value="">Pilih client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading && !clients.length ? (
          <div className={cn(surface, "p-10 text-center text-sm text-muted-foreground")}>
            Menghubungkan ke Supabase…
          </div>
        ) : (
          <div id="graphic-workspace">
            <GraphicWorkspace
              clients={clients}
              projects={projects}
              tasks={boardTasks}
              documents={documents}
              activities={activities}
              designVersions={designVersions}
              designComments={designComments}
              designReviews={designReviews}
              selectedClientId={selectedClientId}
              onDataChanged={refresh}
              selectedTask={selectedTask}
            />
          </div>
        )}
      </div>
      <TaskBoard
        query={query}
        tasks={boardTasks}
        clients={clients}
        projects={projects}
        loading={loading}
        onCreate={async (input) => {
          const created = await createTask(input);
          if (created?.id) {
            setSelectedClientId(input.client_id);
            setSelectedTaskId(created.id);
          }
          return created;
        }}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onDuplicate={duplicateTask}
        onSelectTask={(task) => {
          setSelectedTaskId(task.id);
          if (task.client_id !== selectedClientId) setSelectedClientId(task.client_id);
        }}
      />
      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr_0.95fr]">
        <CalendarPanel tasks={tasks} activities={activities} />
        <WorkListPanel tasks={tasks} clients={clients} />
        <AiSecretaryPanel />
      </section>

      {/* Aktivitas: satu card, baris dipisah garis — tanpa kartu kecil di dalam kartu */}
      <section className={cn(surface, "overflow-hidden")}>
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aktivitas terbaru</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Riwayat aktivitas client dari Supabase
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {latestActivities.length} terbaru
          </span>
        </header>
        {latestActivities.length ? (
          <ul className="divide-y divide-border">
            {latestActivities.map((a) => {
              const client = clients.find((c) => c.id === a.client_id);
              return (
                <li key={a.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(a.occurred_at).toLocaleString("id-ID")}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {client?.name ?? "Client"} · {a.event_type}
                  </p>
                  {a.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada aktivitas yang tercatat.
          </p>
        )}
      </section>
    </div>
  );
}
