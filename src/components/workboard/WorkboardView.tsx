import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { GraphicWorkspace } from "./GraphicWorkspace";
import { TaskBoard } from "./TaskBoard";
import { AiSecretaryPanel, CalendarPanel, WorkListPanel } from "./BottomPanels";

export function WorkboardView() {
  return (
    <div className="min-h-screen bg-wb-canvas">
      <AppSidebar />
      <main className="lg:pl-64">
        <WorkboardContent />
      </main>
    </div>
  );
}

export function WorkboardContent() {
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-5 sm:px-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="flex w-full max-w-[290px] items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-soft">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in timeline..."
              className="min-w-0 flex-1 bg-transparent text-[11px] text-wb-ink outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-border bg-muted px-1 font-mono text-[8px] text-muted-foreground">
              ⌘ K
            </kbd>
          </label>
          <button
            type="button"
            onClick={() => toast("Filter belum tersedia")}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-wb-ink shadow-soft transition-colors hover:bg-muted"
          >
            <SlidersHorizontal className="size-3.5" /> Add filter
          </button>
        </div>
        <GraphicWorkspace />
      </div>

      <TaskBoard query={query} />

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr_0.95fr]">
        <CalendarPanel />
        <WorkListPanel />
        <AiSecretaryPanel />
      </section>
    </div>
  );
}
