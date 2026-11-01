import { CalendarDays, AlertTriangle, Clock3, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkboardClient, WorkboardTask } from "./useWorkboardData";

const columns = [
  { id:"things-to-do", title:"TERTUNDA" },
  { id:"queue-on-process", title:"ANTRIAN" },
  { id:"on-process", title:"ON PROSES" },
  { id:"pending", title:"PENDING" },
  { id:"revision", title:"REVIEW CLIENT" },
  { id:"finished", title:"SELESAI" },
  { id:"cancel", title:"CANCEL / STOP" },
];
const dateLabel=(value:string)=>new Date(value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
const isLate=(value:string|null)=>!!value&&new Date(value+"T23:59:59").getTime()<Date.now();

export function TaskBoard({query,tasks,clients,loading}:{query:string;tasks:WorkboardTask[];clients:WorkboardClient[];loading:boolean}) {
  const q=query.trim().toLowerCase();
  const clientById=new Map(clients.map(c=>[c.id,c]));
  const filtered=tasks.filter(t=>!q||[t.title,t.description??"",t.assignee??"",clientById.get(t.client_id)?.name??""].join(" ").toLowerCase().includes(q));
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[15px] font-extrabold tracking-tight text-wb-ink">TASK BOARD</h2><p className="text-[10px] text-muted-foreground">Task dan deadline aktual dari Supabase</p></div><span className="rounded-full bg-card px-3 py-1 text-[10px] font-semibold text-wb-ink shadow-soft">{filtered.length} task</span></div>
    {loading?<div className="rounded-xl border bg-card p-8 text-center text-xs text-muted-foreground">Memuat task…</div>:
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map(col=>{
        const rows=filtered.filter(t=>t.status===col.id);
        return <div key={col.id} className="min-h-40 rounded-xl border border-border bg-card/70 p-2.5">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold text-wb-ink">{col.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[9px]">{rows.length}</span></div>
          <div className="space-y-2">
            {rows.map(task=>{
              const client=clientById.get(task.client_id);
              const late=isLate(task.due_date);
              return <article key={task.id} className={cn("rounded-lg border bg-card p-2.5 shadow-soft",late&&"border-destructive/40")}>
                <p className="text-[11px] font-bold leading-snug text-wb-ink">{task.title}</p>
                <p className="mt-1 truncate text-[9px] text-muted-foreground">{client?.name??"Client tidak ditemukan"}</p>
                {task.description&&<p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">{task.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[8px] font-bold",task.priority==="high"?"bg-red-100 text-red-700":task.priority==="low"?"bg-slate-100 text-slate-600":"bg-amber-100 text-amber-700")}>{task.priority.toUpperCase()}</span>
                  {task.due_date&&<span className={cn("flex items-center gap-1 text-[8px]",late?"font-semibold text-destructive":"text-muted-foreground")}>{late?<AlertTriangle className="size-3"/>:<CalendarDays className="size-3"/>}{dateLabel(task.due_date)}</span>}
                </div>
                {task.assignee&&<p className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground"><UserRound className="size-3"/>{task.assignee}</p>}
                <p className="mt-2 flex items-center gap-1 text-[8px] text-muted-foreground"><Clock3 className="size-3"/>Dibuat {new Date(task.created_at).toLocaleDateString("id-ID")}</p>
              </article>;
            })}
            {!rows.length&&<p className="py-5 text-center text-[9px] text-muted-foreground">{loading?"Memuat…":"Belum ada task"}</p>}
          </div>
        </div>;
      })}
    </div>}
  </section>;
}
