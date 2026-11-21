import { useMemo, useRef, useState } from "react";
import { Bot, Check, FileUp, Link2, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateTasksFromSource, approveTaskDraftItems, rejectTaskDraft } from "@/lib/workboard/task-generator.functions";
import type { WorkboardClient, WorkboardProject } from "./useWorkboardData";

type DraftItem = {
  id: string; title: string; description: string; priority: string; dueDate: string | null;
  assignee: string | null; confidence: number; missingInformation: string[];
  parentDraftItemId: string | null;
};
type DraftResult = {
  draftId: string; summary: string; questions: string[]; duplicateWarnings: string[];
  items: DraftItem[];
};

export function TaskIntakeAssistant({ clients, projects, onCreated }: {
  clients: WorkboardClient[]; projects: WorkboardProject[]; onCreated: () => Promise<unknown>;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);

  async function generate() {
    if (!clientId) return toast.error("Pilih client terlebih dahulu.");
    if (!sourceText.trim() && !sourceUrl.trim() && !file) return toast.error("Masukkan sumber task.");
    setBusy(true);
    try {
      let filePayload: { fileName: string; mediaType: string; base64: string } | null = null;
      if (file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Gagal membaca file."));
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.readAsDataURL(file);
        });
        filePayload = { fileName: file.name, mediaType: file.type || "application/octet-stream", base64 };
      }
      const result = await generateTasksFromSource({
        data: { clientId, projectId: projectId || null, sourceType, sourceLabel: file?.name || sourceType, sourceText, sourceUrl, file: filePayload },
      }) as DraftResult;
      setDraft(result);
      setSelected(result.items.map((item) => item.id));
      toast.success("Draft task berhasil dibuat. Periksa sebelum disetujui.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat draft task.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!draft || !selected.length) return;
    setBusy(true);
    try {
      const result = await approveTaskDraftItems({ data: { draftId: draft.draftId, itemIds: selected } });
      toast.success(`${result.createdTaskIds.length} task dibuat di Workboard.`);
      setDraft(null); setSelected([]); setSourceText(""); setSourceUrl(""); setFile(null);
      await onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyetujui draft.");
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!draft) return;
    setBusy(true);
    try {
      await rejectTaskDraft({ data: { draftId: draft.draftId, note: "Ditolak dari Workboard." } });
      setDraft(null); setSelected([]);
      toast.success("Draft ditolak.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menolak draft."); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-5" /></span>
          <div><h2 className="text-sm font-semibold text-foreground">Ebran AI Task Generator</h2>
            <p className="text-xs text-muted-foreground">Ubah brief, chat, meeting notes, dokumen, gambar, atau URL menjadi draft task.</p></div>
        </div>
        <span className="rounded-full border border-warning/40 bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-foreground">Persetujuan manual</span>
      </div>

      {!draft ? <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Client
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              <option value="">Pilih client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Project (opsional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              <option value="">Tanpa project spesifik</option>{clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Jenis sumber
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              <option value="manual">Manual / Prompt</option><option value="chat">Chat / WhatsApp / Telegram</option>
              <option value="meeting">Meeting / Transcript</option><option value="email">Email</option>
              <option value="form">Form / Survey</option><option value="integration">Integrasi / Webhook</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">URL / tautan referensi (opsional)
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3"><Link2 className="size-4 text-muted-foreground" />
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" /></div>
          </label>
        </div>
        <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={5} placeholder="Tempel chat client, brief, notulen meeting, daftar revisi, laporan bug, ide konten, atau instruksi kerja di sini…" />
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.html,.json,application/pdf,image/*,text/*,application/json" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><FileUp className="mr-1.5 size-4" /> Lampirkan file</Button>
            {file && <span className="max-w-52 truncate text-xs text-muted-foreground">{file.name} <button type="button" onClick={() => setFile(null)} aria-label="Hapus file"><X className="inline size-3" /></button></span>}
          </div>
          <Button type="button" size="sm" onClick={() => void generate()} disabled={busy || !clients.length}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Sparkles className="mr-1.5 size-4" />} Analisis & buat draft
          </Button>
        </div>
      </div> : <div className="mt-4 space-y-3">
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{draft.summary}</div>
        {!!draft.duplicateWarnings.length && <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-warning-foreground"><strong>Periksa kemungkinan duplikat:</strong><ul className="mt-1 list-disc pl-4">{draft.duplicateWarnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
        {!!draft.questions.length && <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground"><strong className="text-foreground">Informasi yang perlu dikonfirmasi</strong><ul className="mt-1 list-disc pl-4">{draft.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
        <div className="space-y-2">{draft.items.map((item) => <label key={item.id} className="flex gap-3 rounded-lg border border-border p-3">
          <input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old,item.id] : old.filter((id)=>id!==item.id))} className="mt-1 size-4 accent-primary" />
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">{item.parentDraftItemId ? "↳ " : ""}{item.title}<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{item.priority}</span></span>
            {item.description && <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>}
            <span className="mt-1 block text-[11px] text-muted-foreground">{item.dueDate ? `Deadline: ${item.dueDate}` : "Deadline belum ditentukan"} · {item.assignee || "PIC belum ditentukan"} · Confidence ${Math.round(item.confidence*100)}%</span>
            {!!item.missingInformation.length && <span className="mt-1 block text-[11px] text-warning-foreground">Perlu konfirmasi: {item.missingInformation.join(", ")}</span>}
          </span>
        </label>)}</div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => void reject()} disabled={busy}><X className="mr-1 size-4" /> Tolak draft</Button>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setDraft(null); setSelected([]); }}>Kembali edit sumber</Button>
            <Button size="sm" onClick={() => void approve()} disabled={busy || !selected.length}><Check className="mr-1 size-4" /> Setujui {selected.length} task</Button></div>
        </div>
      </div>}
    </section>
  );
}
