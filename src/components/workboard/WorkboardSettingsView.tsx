import { useWorkboardData } from "@/components/workboard/useWorkboardData";
import { AlertCenter } from "@/components/workboard/AlertCenter";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { BellRing, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function WorkboardSettingsView() {
  const { tasks, clients, loading, error, refresh } = useWorkboardData();

  return (
    <div className="min-h-screen bg-wb-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-wb-blue-strong/10 text-wb-blue-strong">
                <Settings2 className="size-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-wb-blue-strong">
                  Ebran · Workboard
                </p>
                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-wb-ink">
                  Pengaturan & Peringatan Dini
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                  Kelola alarm tugas, notifikasi HP, jadwal pengingat, dan peringatan deadline di satu tempat.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refresh().then(() => toast.success("Pengaturan diperbarui")).catch((e) => toast.error(e.message))}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-wb-ink shadow-soft hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
              Refresh data
            </button>
          </header>

          {error && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Gagal memuat data Workboard: {error}
            </div>
          )}

          {loading && !clients.length ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
              <BellRing className="mx-auto mb-2 size-5" />
              Memuat pengaturan dan data peringatan…
            </div>
          ) : (
            <AlertCenter tasks={tasks} clients={clients} onTasksChanged={refresh} />
          )}
        </div>
      </main>
    </div>
  );
}
