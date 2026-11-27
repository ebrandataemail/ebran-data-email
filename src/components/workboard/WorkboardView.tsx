import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TaskIntakeAssistant } from "./TaskIntakeAssistant";
import { TaskAutomationPanel } from "./TaskAutomationPanel";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraphicWorkspace } from "./GraphicWorkspace";
import { TaskBoard } from "./TaskBoard";
import { AiSecretaryPanel, CalendarPanel, WorkListPanel } from "./BottomPanels";
import { useWorkboardData, type WorkboardTask } from "./useWorkboardData";

/** L1 — sama dengan halaman Accounts dan Proyek. */
const surface = "rounded-xl border border-border bg-card shadow-soft";

export type WorkboardSection = "board" | "manager" | "inbox" | "calendar";

export function WorkboardView({ section = "board", taskId }: { section?: WorkboardSection; taskId?: string }) {
  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <WorkboardContent section={section} taskId={taskId} />
      </main>
    </div>
  );
}

export function WorkboardContent({ section = "board", taskId }: { section?: WorkboardSection; taskId?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskId ?? null);
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
    if (section === "manager" && !selectedClientId && clients.length) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId, section]);
  useEffect(() => {
    if (taskId) setSelectedTaskId(taskId);
  }, [taskId]);
  const demoTasks: WorkboardTask[] = clients.length && !tasks.length ? [
    { id: "demo-task-1", client_id: clients[0].id, title: "Desain feed Instagram — campaign November", description: "Buat 3 konsep feed Instagram untuk campaign November. Gunakan brand guideline, siapkan preview, lalu kirim untuk review client.", status: "on-process", priority: "high", due_date: "2026-11-06", assignee: "Creative Designer", created_at: "2026-11-01T09:00:00.000Z", updated_at: "2026-11-03T08:00:00.000Z", sort_order: 1 },
    { id: "demo-task-2", client_id: clients[0].id, title: "Revisi landing page", description: "Perbaiki hero section, CTA, dan tampilan mobile berdasarkan masukan client.", status: "revision", priority: "medium", due_date: "2026-11-08", assignee: "UI/UX Designer", created_at: "2026-11-02T10:00:00.000Z", updated_at: "2026-11-03T08:30:00.000Z", sort_order: 2 },
    { id: "demo-task-3", client_id: clients[0].id, title: "Susun kalender konten bulanan", description: "Riset topik, susun 12 ide konten, dan ajukan jadwal publikasi untuk persetujuan.", status: "things-to-do", priority: "low", due_date: "2026-11-12", assignee: "Content Strategist", created_at: "2026-11-03T09:00:00.000Z", updated_at: "2026-11-03T09:00:00.000Z", sort_order: 3 },
  ] : [];
  const boardTasks = tasks.length ? tasks : demoTasks;
  const selectedTask = boardTasks.find((task) => task.id === selectedTaskId) ?? null;

  // Scroll only after React has rendered the selected task detail in Graphic Workspace.
  const selectedTaskIdToScroll = selectedTask?.id ?? null;
  useEffect(() => {
    if (!selectedTaskIdToScroll) return;
    document.getElementById("graphic-task-detail")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedTaskIdToScroll]);
  const latestActivities = activities.slice(0, 8);
  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 pb-16 sm:px-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {section === "board" ? "Task Board / Kanban" : section === "manager" ? "Task Manager" : section === "inbox" ? "Inbox & AI Integrations" : "Kalender & Aktivitas"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {section === "board"
              ? "Pantau seluruh task berdasarkan status dan pindahkan pekerjaan antar kolom."
              : section === "manager"
                ? "Kelola detail pekerjaan, brief, deliverables, desain, dan approval di Graphic Workspace."
                : section === "inbox"
                ? "Kumpulkan sumber pekerjaan, buat draft dengan AI, lalu tinjau sebelum menjadi task."
                : "Pantau deadline, agenda, daftar pekerjaan, dan aktivitas terbaru."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() =>
            void refresh()
              .then(() => toast.success("Data Workboard diperbarui"))
              .catch((e) => toast.error(e.message))
          }
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh data</span>
          <span className="sr-only sm:hidden">Perbarui data</span>
        </Button>
      </header>

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
      {section === "board" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">Pilih kartu untuk membuka detailnya di Task Manager.</p>
              <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Search className="size-4" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari task…" className="min-w-0 bg-transparent text-sm text-foreground outline-none" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Client
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                <option value="">Semua client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
          </div>
          <TaskBoard
            query={query}
            tasks={selectedClientId ? boardTasks.filter((task) => task.client_id === selectedClientId) : boardTasks}
            clients={clients}
            projects={projects}
            loading={loading}
            onCreate={async (input) => {
              const created = await createTask(input);
              if (created?.id) {
                setSelectedClientId(input.client_id);
                void navigate({ to: "/workboard", search: { view: "manager", taskId: created.id } });
              }
              return created;
            }}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onDuplicate={duplicateTask}
            onSelectTask={(task) => {
              setSelectedClientId(task.client_id);
              void navigate({ to: "/workboard", search: { view: "manager", taskId: task.id } });
            }}
          />
        </div>
      )}

      {section === "manager" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              Client
              <select value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setSelectedTaskId(null); void navigate({ to: "/workboard", search: { view: "manager" } }); }} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none">
                <option value="">Pilih client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              Task
              <select value={selectedTask?.id ?? ""} onChange={(e) => { setSelectedTaskId(e.target.value || null); void navigate({ to: "/workboard", search: { view: "manager", taskId: e.target.value || undefined } }); }} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none">
                <option value="">Pilih task</option>
                {boardTasks.filter((task) => !selectedClientId || task.client_id === selectedClientId).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>
            </label>
          </div>
          {loading && !clients.length ? (
            <div className={cn(surface, "p-10 text-center text-sm text-muted-foreground")}>Menghubungkan ke Supabase…</div>
          ) : selectedTask ? (
            <GraphicWorkspace
              clients={clients}
              projects={projects}
              tasks={boardTasks}
              documents={documents}
              activities={activities}
              designVersions={designVersions}
              designComments={designComments}
              designReviews={designReviews}
              selectedClientId={selectedClientId || selectedTask.client_id}
              onDataChanged={refresh}
              selectedTask={selectedTask}
            />
          ) : (
            <div className={cn(surface, "p-10 text-center text-sm text-muted-foreground")}>
              Pilih task untuk membuka Graphic Workspace. Kamu juga bisa memilih kartu di Task Board / Kanban.
            </div>
          )}
        </div>
      )}

      {section === "inbox" && (
        <div className="space-y-5">
          <TaskIntakeAssistant clients={clients} projects={projects} onCreated={refresh} />
          <TaskAutomationPanel
            clients={clients}
            projects={projects}
            tasks={tasks}
            onTaskCreated={refresh}
            onSelectTask={() => {
              void navigate({ to: "/workboard", search: { view: "board" } });
              toast.info("Buka Task Manager untuk melihat dan mengelola task.");
            }}
          />
        </div>
      )}

      {section === "calendar" && (
        <div className="space-y-5">
          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <CalendarPanel tasks={tasks} activities={activities} />
            <WorkListPanel tasks={tasks} clients={clients} />
            <AiSecretaryPanel />
          </section>
          <section className={cn(surface, "overflow-hidden")}>
            <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Aktivitas terbaru</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Riwayat aktivitas client dari Supabase</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{latestActivities.length} terbaru</span>
            </header>
            {latestActivities.length ? (
              <ul className="divide-y divide-border">
                {latestActivities.map((activity) => {
                  const client = clients.find((item) => item.id === activity.client_id);
                  return (
                    <li key={activity.id} className="min-w-0 px-4 py-3 sm:px-5">
                      <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <time className="shrink-0 text-xs tabular-nums text-muted-foreground">{new Date(activity.occurred_at).toLocaleString("id-ID")}</time>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{client?.name ?? "Client"} · {activity.event_type}</p>
                      {activity.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activity.description}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
