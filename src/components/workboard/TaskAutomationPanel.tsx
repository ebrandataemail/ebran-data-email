/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack server function response types are generated dynamically for this app. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Check, Clipboard, Loader2, RefreshCw, Webhook, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { WorkboardClient, WorkboardProject, WorkboardTask } from "./useWorkboardData";
import {
  createTaskWebhookEndpoint, dismissTaskCopilotSuggestion, listPendingTaskIntakes,
  listTaskCopilotSuggestions, refreshTaskCopilotSuggestions,
} from "@/lib/workboard/task-automation.functions";
import {
  approveTaskDraftItems, generateTasksFromSource, rejectTaskDraft,
} from "@/lib/workboard/task-generator.functions";

type Suggestion = { id: string; task_id: string | null; client_id: string | null; suggestion_type: string; title: string; description: string; evidence: Record<string, unknown> };
type Intake = { id: string; client_id: string; project_id: string | null; source_type: string; source_label: string; source_uri: string | null; extracted_text: string | null; created_at: string };
type DraftItem = { id: string; title: string; description: string; priority: string; dueDate: string | null; assignee: string | null; confidence: number; missingInformation: string[]; parentDraftItemId: string | null };
type DraftResult = { draftId: string; summary: string; questions: string[]; duplicateWarnings: string[]; items: DraftItem[] };

export function TaskAutomationPanel({ clients, projects, tasks, onTaskCreated, onSelectTask }: {
  clients: WorkboardClient[]; projects: WorkboardProject[]; tasks: WorkboardTask[];
  onTaskCreated: () => Promise<unknown>; onSelectTask: (task: WorkboardTask) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [sourceType, setSourceType] = useState("webhook");
  const [endpoint, setEndpoint] = useState<{ webhookUrl: string; authorizationHeader: string; endpoint_name: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<{ id: string; email: string; provider: string }[]>([]);
  const [emailAccountId, setEmailAccountId] = useState("");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await refreshTaskCopilotSuggestions({});
      const [nextSuggestions, nextIntakes, accountResult] = await Promise.all([
        listTaskCopilotSuggestions({}), listPendingTaskIntakes({}),
        supabase.from("email_accounts").select("id,email,provider").order("email"),
      ]);
      if (accountResult.error) throw accountResult.error;
      const availableAccounts = (accountResult.data ?? []).filter((account) => ["gmail","google"].includes(String(account.provider).toLowerCase()));
      setGmailAccounts(availableAccounts);
      setEmailAccountId((current) => availableAccounts.some((account: any) => account.id === current) ? current : (availableAccounts[0]?.id ?? ""));
      setSuggestions(nextSuggestions as Suggestion[]);
      setIntakes(nextIntakes as Intake[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat Copilot.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (!clientId && clients.length) setClientId(clients[0].id); }, [clients, clientId]);
  useEffect(() => { void load(); }, [load]);

  async function createEndpoint() {
    if (!clientId) return toast.error("Pilih client terlebih dahulu.");
    setBusy(true);
    try {
      const result = await createTaskWebhookEndpoint({ data: { clientId, projectId: projectId || null, sourceType, endpointName: "Workboard · " + sourceType } });
      setEndpoint(result as typeof endpoint);
      toast.success("Webhook endpoint berhasil dibuat. Secret hanya ditampilkan kali ini.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal membuat endpoint."); }
    finally { setBusy(false); }
  }

  async function syncGmail() {
    if (!clientId || !emailAccountId) return toast.error("Pilih akun Gmail dan client terlebih dahulu.");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-oauth", {
        body: { action: "task-intake", emailAccountId, clientId, projectId: projectId || null },
      });
      if (error) throw error;
      toast.success((data?.queued ?? 0) + " email masuk ke Inbox Integrasi. " + (data?.skipped ?? 0) + " duplikat dilewati.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal mengambil email Gmail."); }
    finally { setBusy(false); }
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast.success("Disalin."); }
    catch { toast.error("Clipboard tidak tersedia di browser ini."); }
  }

  async function processIntake(source: Intake) {
    setBusy(true);
    try {
      const result = await generateTasksFromSource({ data: {
        clientId: source.client_id, projectId: source.project_id, sourceType: source.source_type,
        sourceLabel: source.source_label, sourceText: source.extracted_text ?? "", sourceUrl: source.source_uri ?? "",
        intakeSourceId: source.id,
      } }) as DraftResult;
      setDraft(result);
      setSelectedItems(result.items.map((item) => item.id));
      toast.success("Event webhook berhasil dianalisis. Periksa draft sebelum dibuat.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal memproses webhook."); }
    finally { setBusy(false); }
  }

  async function approveDraft() {
    if (!draft || !selectedItems.length) return;
    setBusy(true);
    try {
      const result = await approveTaskDraftItems({ data: { draftId: draft.draftId, itemIds: selectedItems } });
      toast.success(result.createdTaskIds.length + " task dibuat di Workboard.");
      setDraft(null); setSelectedItems([]);
      await onTaskCreated();
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyetujui draft."); }
    finally { setBusy(false); }
  }

  async function rejectDraft() {
    if (!draft) return;
    setBusy(true);
    try {
      await rejectTaskDraft({ data: { draftId: draft.draftId, note: "Ditolak dari Inbox Integrasi Workboard." } });
      setDraft(null); setSelectedItems([]);
      toast.success("Draft ditolak.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menolak draft."); }
    finally { setBusy(false); }
  }

  async function dismiss(id: string) {
    try {
      await dismissTaskCopilotSuggestion({ data: { suggestionId: id } });
      setSuggestions((items) => items.filter((item) => item.id !== id));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menutup saran."); }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-2"><Webhook className="size-5 text-primary" /><div>
          <h2 className="text-sm font-semibold text-foreground">Integrasi masuk · Webhook</h2>
          <p className="text-xs text-muted-foreground">Terima event dari Make, n8n, Zapier, atau sistem yang mendukung Bearer token.</p>
        </div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-muted-foreground">Client
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="">Pilih client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">Project
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="">Tanpa project</option>{clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Sumber integrasi
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              {["webhook","gmail","outlook","whatsapp","telegram","slack","teams","calendar","zoom","figma","github","zendesk","intercom"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <Button className="mt-3" size="sm" onClick={() => void createEndpoint()} disabled={busy || !clients.length}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Webhook className="mr-2 size-4" />} Buat endpoint
        </Button>
        {gmailAccounts.length > 0 && <div className="mt-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold text-foreground">Ambil email Gmail terbaru</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Gunakan koneksi Gmail yang sudah ada dengan izin baca. Email masuk akan menjadi sumber draft, bukan task otomatis.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select value={emailAccountId} onChange={(e) => setEmailAccountId(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
              {gmailAccounts.map((account) => <option key={account.id} value={account.id}>{account.email}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => void syncGmail()} disabled={busy || !clientId || !emailAccountId}>
              {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <RefreshCw className="mr-1 size-3" />} Ambil 10 email
            </Button>
          </div>
        </div>}
        {endpoint && <div className="mt-3 space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
          <p className="text-xs font-semibold text-warning-foreground">Secret ditampilkan sekali — simpan di pengaturan webhook sumber.</p>
          <div className="space-y-1"><p className="text-[11px] text-muted-foreground">URL</p><code className="block break-all text-xs text-foreground">{endpoint.webhookUrl}</code>
            <Button size="sm" variant="outline" onClick={() => void copy(endpoint.webhookUrl)}><Clipboard className="mr-1 size-3" /> Salin URL</Button></div>
          <div className="space-y-1"><p className="text-[11px] text-muted-foreground">Header Authorization</p><code className="block break-all text-xs text-foreground">{endpoint.authorizationHeader}</code>
            <Button size="sm" variant="outline" onClick={() => void copy(endpoint.authorizationHeader)}><Clipboard className="mr-1 size-3" /> Salin secret</Button></div>
        </div>}
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-foreground">Inbox integrasi tertunda</h3><span className="text-xs text-muted-foreground">{intakes.length} masuk</span></div>
          {intakes.length ? <ul className="mt-2 space-y-2">{intakes.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-foreground">{item.source_label}</span><span className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("id-ID")}</span></span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void processIntake(item)}>Analisis</Button>
          </li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">Belum ada event webhook yang menunggu diproses.</p>}
        </div>
        {draft && <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground">Review hasil analisis webhook</p>
          <p className="rounded-lg bg-muted/50 p-2 text-xs text-foreground">{draft.summary}</p>
          {draft.duplicateWarnings.map((warning, index) => <p key={index} className="text-xs text-warning-foreground">Periksa duplikat: {warning}</p>)}
          {draft.items.map((item) => <label key={item.id} className="flex gap-2 rounded-lg border border-border p-2">
            <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems((old) => e.target.checked ? [...old,item.id] : old.filter((id) => id !== item.id))} />
            <span className="min-w-0 text-xs"><strong>{item.parentDraftItemId ? "↳ " : ""}{item.title}</strong><span className="block text-muted-foreground">{item.dueDate || "Tanpa deadline"} · {item.assignee || "PIC belum ditentukan"}</span></span>
          </label>)}
          <div className="flex justify-between gap-2"><Button size="sm" variant="ghost" onClick={() => void rejectDraft()}><X className="mr-1 size-3" /> Tolak</Button>
            <Button size="sm" onClick={() => void approveDraft()} disabled={busy || !selectedItems.length}><Check className="mr-1 size-3" /> Setujui {selectedItems.length}</Button></div>
        </div>}
        <p className="mt-3 text-[11px] text-muted-foreground">Endpoint generik memakai Bearer token. Integrasi native yang mewajibkan signature/OAuth khusus tetap membutuhkan adapter dan konfigurasi resmi penyedia.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BellRing className="size-5 text-primary" /><div>
          <h2 className="text-sm font-semibold text-foreground">Workboard Copilot</h2>
          <p className="text-xs text-muted-foreground">Saran tindak lanjut dari deadline dan umur task.</p>
        </div></div><Button size="icon" variant="ghost" aria-label="Refresh saran" onClick={() => void load()} disabled={loading}><RefreshCw className={"size-4 " + (loading ? "animate-spin" : "")} /></Button></div>
        {suggestions.length ? <ul className="mt-3 space-y-2">{suggestions.map((suggestion) => {
          const task = tasks.find((item) => item.id === suggestion.task_id);
          return <li key={suggestion.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold text-foreground">{suggestion.title}</p><p className="mt-1 text-xs text-muted-foreground">{suggestion.description}</p></div>
              <Button size="icon" variant="ghost" aria-label="Tutup saran" onClick={() => void dismiss(suggestion.id)}><Check className="size-4" /></Button></div>
            {task && <Button size="sm" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => onSelectTask(task)}>Buka task: {task.title}</Button>}
          </li>;
        })}</ul> : <p className="mt-3 text-xs text-muted-foreground">{loading ? "Memeriksa task…" : "Tidak ada saran baru saat ini."}</p>}
      </div>
    </section>
  );
}
