import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ExternalLink, FileText, History, Link2, MessageSquare, Plus, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { WorkboardTask } from "./useWorkboardData";

type Deliverable = {
  id: string; task_id: string; title: string; deliverable_type: string; description: string | null;
  content: string | null; url: string | null; file_path: string | null; file_name: string | null;
  mime_type: string | null; status: string; metadata: Record<string, unknown>; created_at: string; updated_at: string;
};
type Version = { id: string; deliverable_id: string; version_number: number; title: string; snapshot: Record<string, unknown>; change_note: string | null; created_at: string };
type Review = { id: string; deliverable_id: string | null; decision: string; note: string | null; created_at: string };
type Comment = { id: string; deliverable_id: string | null; comment: string; created_at: string };

const configs: Record<string, { label: string; heading: string; description: string; examples: string[] }> = {
  content: { label: "Content Writing", heading: "Document & Draft Preview", description: "Simpan naskah, copy, artikel, caption, dan revisi konten.", examples: ["Artikel blog", "Caption media sosial", "Email campaign"] },
  social_media: { label: "Social Media", heading: "Content Calendar & Post Preview", description: "Kelola konsep posting, caption, kanal, dan jadwal publikasi.", examples: ["Instagram post", "TikTok", "LinkedIn"] },
  video: { label: "Video Production", heading: "Video Deliverables", description: "Kelola file video, storyboard, script, dan tautan preview.", examples: ["Storyboard", "Rough cut", "Final video"] },
  website: { label: "Website Development", heading: "Website & Deployment Preview", description: "Catat URL staging/production, build, dokumentasi, dan changelog.", examples: ["Staging URL", "Frontend build", "Release notes"] },
  ads_marketing: { label: "Ads & Marketing", heading: "Campaign & Report Preview", description: "Simpan campaign plan, materi iklan, KPI, dan laporan performa.", examples: ["Campaign plan", "Ad creative", "Performance report"] },
  seo: { label: "SEO", heading: "SEO Audit & Ranking Report", description: "Kelola audit, keyword research, optimasi, dan laporan ranking.", examples: ["SEO audit", "Keyword map", "Monthly report"] },
  research: { label: "Research", heading: "Research & Findings", description: "Dokumentasikan temuan, sumber, analisis, dan rekomendasi.", examples: ["Research brief", "Source list", "Findings"] },
  strategy: { label: "Strategy", heading: "Strategy Canvas & Roadmap", description: "Kelola strategi, roadmap, milestone, dan keputusan.", examples: ["Strategic plan", "Roadmap", "Milestone"] },
  analytics: { label: "Data & Analytics", heading: "Data & Report Preview", description: "Simpan dataset, dashboard URL, visualisasi, dan insight.", examples: ["Dataset", "Dashboard", "Analytics report"] },
  branding: { label: "Branding", heading: "Brand Asset Library", description: "Kelola guideline, logo, brand asset, dan dokumentasi identitas.", examples: ["Brand guideline", "Logo pack", "Brand assets"] },
  general: { label: "General", heading: "General Deliverables", description: "Kelola hasil pekerjaan, file, tautan, checklist, dan catatan.", examples: ["Dokumen", "File hasil", "Referensi URL"] },
};

export function TaskDeliverableWorkspace({ task }: { task: WorkboardTask }) {
  const config = configs[task.task_type || "general"] || configs.general;
  const [items, setItems] = useState<Deliverable[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("document");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const load = useCallback(async () => {
    if (task.id.startsWith("demo-task-")) { setItems([]); setVersions([]); setReviews([]); setComments([]); return; }
    const [a,b,c,d] = await Promise.all([
      (supabase.from("task_deliverables" as any) as any).select("*").eq("task_id", task.id).order("updated_at", { ascending: false }),
      (supabase.from("task_deliverable_versions" as any) as any).select("*").eq("task_id", task.id).order("created_at", { ascending: false }),
      (supabase.from("task_reviews" as any) as any).select("*").eq("task_id", task.id).order("created_at", { ascending: false }),
      (supabase.from("task_comments" as any) as any).select("*").eq("task_id", task.id).order("created_at", { ascending: false }),
    ]);
    const error = [a,b,c,d].find((r: any) => r.error)?.error;
    if (error) throw error;
    setItems((a.data || []) as Deliverable[]); setVersions((b.data || []) as Version[]);
    setReviews((c.data || []) as Review[]); setComments((d.data || []) as Comment[]);
  }, [task.id]);
  useEffect(() => { void load().catch((e) => toast.error(e.message || "Gagal memuat deliverable")); }, [load]);
  const saveVersion = async (item: Deliverable, note: string) => {
    const current = versions.filter((v) => v.deliverable_id === item.id).reduce((m,v) => Math.max(m,v.version_number),0);
    const { error } = await (supabase.from("task_deliverable_versions" as any) as any).insert({
      task_id: task.id, deliverable_id: item.id, version_number: current + 1, title: item.title,
      snapshot: { title: item.title, deliverable_type: item.deliverable_type, description: item.description, content: item.content, url: item.url, file_path: item.file_path, file_name: item.file_name, status: item.status },
      change_note: note || null,
    });
    if (error) throw error;
  };
  async function createDeliverable(event: React.FormEvent) {
    event.preventDefault(); if (task.id.startsWith("demo-task-")) { toast.error("Data contoh belum tersimpan. Buat task baru untuk menyimpan deliverable."); return; } if (!title.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.from("task_deliverables" as any) as any).insert({
        task_id: task.id, title: title.trim(), deliverable_type: kind, description: description.trim() || null,
        content: content.trim() || null, url: url.trim() || null,
      }).select("*").single();
      if (error) throw error;
      await saveVersion(data as Deliverable, "Versi awal");
      await (supabase.from("task_activities" as any) as any).insert({ task_id: task.id, event_type: "deliverable_created", title: "Deliverable dibuat", description: title.trim() });
      setTitle(""); setDescription(""); setContent(""); setUrl(""); setSelectedId(data.id);
      await load(); toast.success("Deliverable dan versi pertama tersimpan");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan deliverable"); }
    finally { setBusy(false); }
  }
  async function uploadFile(file?: File) {
    if (!file) return; if (task.id.startsWith("demo-task-")) { toast.error("Data contoh belum tersimpan. Buat task baru untuk mengunggah file."); return; }
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError || new Error("Sesi login tidak ditemukan");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${auth.user.id}/${task.client_id}/tasks/${task.id}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("client-files").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data, error } = await (supabase.from("task_deliverables" as any) as any).insert({
        task_id: task.id, title: file.name, deliverable_type: "file", file_path: path, file_name: file.name, mime_type: file.type,
      }).select("*").single();
      if (error) { await supabase.storage.from("client-files").remove([path]); throw error; }
      await saveVersion(data as Deliverable, "File diunggah");
      setSelectedId(data.id); await load(); toast.success("File dan versi awal tersimpan");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload gagal"); }
    finally { setBusy(false); }
  }
  async function changeStatus(status: string) {
    if (!selected || task.id.startsWith("demo-task-")) return; setBusy(true);
    try {
      const { data, error } = await (supabase.from("task_deliverables" as any) as any).update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id).select("*").single();
      if (error) throw error; await saveVersion(data as Deliverable, changeNote || `Status diubah menjadi ${status}`);
      await (supabase.from("task_reviews" as any) as any).insert({ task_id: task.id, deliverable_id: selected.id, decision: status === "approved" ? "approved" : status === "revision" ? "revision_requested" : "rejected", note: reviewNote.trim() || null });
      await load(); setReviewNote(""); setChangeNote(""); toast.success("Status dan riwayat review tersimpan");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal memperbarui status"); }
    finally { setBusy(false); }
  }
  async function sendComment(event: React.FormEvent) {
    event.preventDefault(); if (task.id.startsWith("demo-task-")) return; if (!commentDraft.trim()) return; setBusy(true);
    const { error } = await (supabase.from("task_comments" as any) as any).insert({ task_id: task.id, deliverable_id: selected?.id || null, comment: commentDraft.trim() });
    setBusy(false); if (error) { toast.error(error.message); return; } setCommentDraft(""); await load();
  }
  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from("client-files").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { toast.error(error?.message || "File tidak dapat dibuka"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  const itemVersions = versions.filter((v) => v.deliverable_id === selected?.id);
  const itemReviews = reviews.filter((v) => v.deliverable_id === selected?.id);
  const itemComments = comments.filter((v) => v.deliverable_id === selected?.id || !v.deliverable_id);
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-wb-blue-strong">{config.label} Workspace</div><h3 className="mt-1 text-sm font-bold text-wb-ink">{config.heading}</h3><p className="mt-1 max-w-2xl text-[11px] text-muted-foreground">{config.description}</p></div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-wb-blue-strong px-3 py-2 text-[10px] font-semibold text-white"><Upload className="size-3.5"/> Upload file<input type="file" className="hidden" disabled={busy} onChange={(e) => { void uploadFile(e.target.files?.[0]); e.currentTarget.value = ""; }}/></label>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div className="min-w-0 space-y-3">
          <form onSubmit={createDeliverable} className="rounded-lg border border-border bg-muted/20 p-3">
            <h4 className="text-xs font-bold text-wb-ink">Tambah hasil pekerjaan</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input value={title} onChange={(e)=>setTitle(e.target.value)} required maxLength={180} placeholder="Nama deliverable" className="h-9 rounded-md border border-border bg-card px-2 text-xs"/>
              <select value={kind} onChange={(e)=>setKind(e.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs"><option value="document">Dokumen / Draft</option><option value="url">URL / Preview</option><option value="calendar">Calendar / Jadwal</option><option value="report">Laporan</option><option value="code">Code / Release</option><option value="dataset">Dataset</option><option value="other">Lainnya</option></select>
              <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="URL preview (opsional)" className="h-9 rounded-md border border-border bg-card px-2 text-xs sm:col-span-2"/>
              <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={2} placeholder="Deskripsi, tujuan, kanal, milestone, atau catatan..." className="rounded-md border border-border bg-card p-2 text-xs sm:col-span-2"/>
              <textarea value={content} onChange={(e)=>setContent(e.target.value)} rows={4} placeholder="Isi draft, findings, KPI, changelog, script, atau detail hasil..." className="rounded-md border border-border bg-card p-2 text-xs sm:col-span-2"/>
            </div>
            <div className="mt-2 flex justify-end"><button disabled={busy || !title.trim()} className="inline-flex items-center gap-1 rounded-md bg-wb-ink px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Plus className="size-3.5"/> Simpan deliverable</button></div>
          </form>
          <div className="space-y-2">
            {items.map((item)=><button key={item.id} type="button" onClick={()=>setSelectedId(item.id)} className={`w-full rounded-lg border p-3 text-left transition ${selected?.id===item.id?"border-wb-blue-strong bg-wb-blue/10":"border-border bg-card hover:bg-muted/40"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-wb-ink">{item.title}</span><span className="rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">{item.status}</span></div>
              <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{item.description || item.deliverable_type}</p>
            </button>)}
            {!items.length && <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Belum ada deliverable. Tambahkan draft, URL, laporan, atau unggah file untuk memulai.</div>}
          </div>
          {selected && <div className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-wb-ink">{selected.title}</h4><span className="text-[10px] text-muted-foreground">{selected.deliverable_type} · {selected.status}</span></div>
            {selected.description && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.description}</p>}
            {selected.content && <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-wb-ink">{selected.content}</pre>}
            {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-wb-blue-strong"><ExternalLink className="size-3"/> Buka preview</a>}
            {selected.file_path && <button type="button" onClick={()=>void openFile(selected.file_path!)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-wb-blue-strong"><FileText className="size-3"/> Buka {selected.file_name || "file"}</button>}
            <div className="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" disabled={busy} onClick={()=>void changeStatus("in_review")} className="rounded-md border border-border px-2 py-2 text-[10px] font-semibold">Kirim review</button><button type="button" disabled={busy} onClick={()=>void changeStatus("approved")} className="rounded-md bg-wb-green-strong px-2 py-2 text-[10px] font-semibold text-white">Approve</button><button type="button" disabled={busy} onClick={()=>void changeStatus("revision")} className="rounded-md border border-border px-2 py-2 text-[10px] font-semibold">Minta revisi</button></div>
            <textarea value={reviewNote} onChange={(e)=>setReviewNote(e.target.value)} rows={2} placeholder="Catatan review / alasan revisi..." className="mt-2 w-full rounded-md border border-border bg-card p-2 text-xs"/>
          </div>}
        </div>
        <aside className="min-w-0 space-y-3">
          <div className="rounded-lg border border-border p-3"><h4 className="flex items-center gap-2 text-xs font-bold text-wb-ink"><History className="size-4"/> Version History</h4><div className="mt-2 space-y-2">{itemVersions.map(v=><div key={v.id} className="rounded-md bg-muted/40 p-2"><div className="text-[10px] font-bold text-wb-ink">V{v.version_number} · {v.title}</div><div className="mt-1 text-[9px] text-muted-foreground">{new Date(v.created_at).toLocaleString("id-ID")}</div>{v.change_note && <p className="mt-1 text-[10px] text-muted-foreground">{v.change_note}</p>}</div>)}{!itemVersions.length && <p className="text-[10px] text-muted-foreground">Riwayat versi muncul setelah deliverable dibuat.</p>}</div></div>
          <div className="rounded-lg border border-border p-3"><h4 className="flex items-center gap-2 text-xs font-bold text-wb-ink"><CheckCircle2 className="size-4"/> Review History</h4><div className="mt-2 space-y-2">{itemReviews.map(r=><div key={r.id} className="rounded-md bg-muted/40 p-2"><div className="text-[10px] font-semibold text-wb-ink">{r.decision} · {new Date(r.created_at).toLocaleString("id-ID")}</div>{r.note && <p className="mt-1 text-[10px] text-muted-foreground">{r.note}</p>}</div>)}{!itemReviews.length && <p className="text-[10px] text-muted-foreground">Belum ada keputusan review.</p>}</div></div>
          <div className="rounded-lg border border-border p-3"><h4 className="flex items-center gap-2 text-xs font-bold text-wb-ink"><MessageSquare className="size-4"/> Komentar</h4><div className="mt-2 max-h-52 space-y-2 overflow-y-auto">{itemComments.map(c=><div key={c.id} className="rounded-md bg-muted/40 p-2"><p className="text-[10px] text-wb-ink">{c.comment}</p><p className="mt-1 text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleString("id-ID")}</p></div>)}{!itemComments.length && <p className="text-[10px] text-muted-foreground">Belum ada komentar.</p>}</div><form onSubmit={sendComment} className="mt-2 flex gap-2"><input value={commentDraft} onChange={(e)=>setCommentDraft(e.target.value)} placeholder="Tulis komentar..." className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-2 text-xs"/><button disabled={busy || !commentDraft.trim()} className="rounded-md bg-wb-ink px-3 text-white disabled:opacity-40"><Send className="size-3.5"/></button></form></div>
        </aside>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground"><CalendarDays className="size-3"/> Contoh hasil: {config.examples.join(" · ")} <Link2 className="ml-auto size-3"/> Seluruh data terhubung ke task ini.</div>
    </section>
  );
}
