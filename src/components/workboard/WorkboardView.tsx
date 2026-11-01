import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, RefreshCw, Users, FolderKanban, ListTodo, FileText, Activity } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { GraphicWorkspace } from "./GraphicWorkspace";
import { TaskBoard } from "./TaskBoard";
import { AiSecretaryPanel, CalendarPanel, WorkListPanel } from "./BottomPanels";
import { useWorkboardData } from "./useWorkboardData";

export function WorkboardView() {
  return <div className="min-h-screen bg-wb-canvas"><AppSidebar/><main className="lg:pl-64"><WorkboardContent/></main></div>;
}

export function WorkboardContent() {
  const [query,setQuery]=useState("");
  const [selectedClientId,setSelectedClientId]=useState("");
  const {clients,projects,tasks,documents,activities,designVersions,designComments,designReviews,loading,error,refresh,createTask,updateTask,deleteTask,duplicateTask}=useWorkboardData();
  useEffect(()=>{if(!selectedClientId&&clients.length)setSelectedClientId(clients[0].id);},[clients,selectedClientId]);
  const latestActivities=activities.slice(0,8);
  const counts=[
    {label:"Total Client",value:clients.length,icon:Users},
    {label:"Total Proyek",value:projects.length,icon:FolderKanban},
    {label:"Task Aktif",value:tasks.filter(t=>!["finished","cancel"].includes(t.status)).length,icon:ListTodo},
    {label:"Dokumen",value:documents.length,icon:FileText},
    {label:"Aktivitas",value:activities.length,icon:Activity},
  ];
  return <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-wb-blue-strong">Ebran · Operations</p><h1 className="mt-1 text-xl font-extrabold tracking-tight text-wb-ink">Workboard</h1><p className="mt-1 text-[11px] text-muted-foreground">Data client, proyek, task, deadline, dokumen, dan aktivitas tersinkron dari Supabase.</p></div>
      <button type="button" onClick={()=>void refresh().then(()=>toast.success("Data Workboard diperbarui")).catch(e=>toast.error(e.message))} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold text-wb-ink shadow-soft hover:bg-muted disabled:opacity-50"><RefreshCw className={loading?"size-3 animate-spin":"size-3"}/>Refresh data</button>
    </header>
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {counts.map(({label,value,icon:Icon})=><div key={label} className="rounded-xl border border-border bg-card p-3 shadow-soft"><div className="flex items-center justify-between"><span className="text-[9px] font-medium text-muted-foreground">{label}</span><Icon className="size-4 text-wb-blue-strong"/></div><p className="mt-1 text-xl font-extrabold tabular-nums text-wb-ink">{loading?"—":value}</p></div>)}
    </section>
    {error&&<div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] text-destructive"><span>Gagal memuat data Supabase: {error}</span><button type="button" onClick={()=>void refresh().catch(e=>toast.error(e.message))} className="font-bold underline">Coba lagi</button></div>}
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex w-full max-w-[340px] items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-soft"><Search className="size-3.5 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari task, client, PIC, deskripsi…" className="min-w-0 flex-1 bg-transparent text-[11px] text-wb-ink outline-none placeholder:text-muted-foreground"/><kbd className="rounded border border-border bg-muted px-1 font-mono text-[8px] text-muted-foreground">⌘ K</kbd></label>
        <label className="flex items-center gap-2 text-[10px] text-muted-foreground">Client aktif<select value={selectedClientId} onChange={e=>setSelectedClientId(e.target.value)} className="h-8 max-w-[220px] rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-wb-ink"><option value="">Pilih client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>
      {loading&&!clients.length?<div className="rounded-xl border bg-card p-10 text-center text-xs text-muted-foreground">Menghubungkan ke Supabase…</div>:
      <GraphicWorkspace clients={clients} projects={projects} tasks={tasks} documents={documents} activities={activities} selectedClientId={selectedClientId}/>}
    </div>
    <TaskBoard query={query} tasks={tasks} clients={clients} loading={loading} onCreate={createTask} onUpdate={updateTask} onDelete={deleteTask} onDuplicate={duplicateTask}/>
    <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr_0.95fr]">
      <CalendarPanel dueDates={tasks.map(t=>t.due_date).filter((d):d is string=>!!d)}/>
      <WorkListPanel tasks={tasks} clients={clients}/>
      <AiSecretaryPanel/>
    </section>
    <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[12px] font-bold text-wb-ink">Aktivitas Terbaru</h2><p className="text-[9px] text-muted-foreground">Riwayat aktivitas client dari Supabase</p></div><span className="text-[9px] text-muted-foreground">{latestActivities.length} terbaru</span></div>
      <div className="grid gap-2 md:grid-cols-2">
        {latestActivities.map(a=>{const client=clients.find(c=>c.id===a.client_id);return <article key={a.id} className="rounded-lg border border-border bg-muted/20 p-2.5"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-semibold text-wb-ink">{a.title}</p><span className="shrink-0 text-[8px] text-muted-foreground">{new Date(a.occurred_at).toLocaleString("id-ID")}</span></div><p className="mt-1 text-[9px] text-muted-foreground">{client?.name??"Client"} · {a.event_type}</p>{a.description&&<p className="mt-1 line-clamp-2 text-[9px] text-muted-foreground">{a.description}</p>}</article>;})}
        {!latestActivities.length&&<p className="py-5 text-center text-[10px] text-muted-foreground">Belum ada aktivitas yang tercatat.</p>}
      </div>
    </section>
  </div>;
}
