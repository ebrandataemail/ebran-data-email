/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack server function response types are generated dynamically for this app. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Check, Clipboard, Loader2, RefreshCw, Webhook, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { WorkboardClient, WorkboardProject, WorkboardTask } from "./useWorkboardData";
import {
  createTaskWebhookEndpoint, createGmailTaskAutomationRule, dismissTaskCopilotSuggestion,
  listGmailTaskAutomationRules, listPendingGmailTaskDraftReviews, listPendingTaskIntakes,
  listTaskCopilotSuggestions, refreshTaskCopilotSuggestions, setGmailTaskAutomationRuleEnabled,
} from "@/lib/workboard/task-automation.functions";
import {
  approveTaskDraftItems, generateTasksFromSource, rejectTaskDraft,
} from "@/lib/workboard/task-generator.functions";

type Suggestion = { id: string; task_id: string | null; client_id: string | null; suggestion_type: string; title: string; description: string; evidence: Record<string, unknown> };
type Intake = { id: string; client_id: string; project_id: string | null; source_type: string; source_label: string; source_uri: string | null; extracted_text: string | null; created_at: string; metadata?: Record<string, any> };
type GmailRule = { id: string; name: string; trigger_config: Record<string, any>; enabled: boolean; last_checked_at: string | null; last_triggered_at: string | null };
type DraftItem = { id: string; title: string; description: string; priority: string; dueDate: string | null; assignee: string | null; confidence: number; missingInformation: string[]; parentDraftItemId: string | null };
type DraftResult = { draftId: string; title?: string; summary: string; questions: string[]; duplicateWarnings: string[]; items: DraftItem[] };

export function TaskAutomationPanel({ clients, projects, tasks, onTaskCreated, onSelectTask }: {
  clients: WorkboardClient[]; projects: WorkboardProject[]; tasks: WorkboardTask[];
  onTaskCreated: () => Promise<unknown>; onSelectTask: (task: WorkboardTask) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [sourceType, setSourceType] = useState("webhook");
  const [endpoint, setEndpoint] = useState<{ webhookUrl: string; authorizationHeader: string | null; verificationToken?: string | null; provider?: string; endpoint_name: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<{ id: string; email: string; provider: string }[]>([]);
  const [emailAccountId, setEmailAccountId] = useState("");
  const [gmailRules, setGmailRules] = useState<GmailRule[]>([]);
  const [ruleName, setRuleName] = useState("Email masuk → Workboard Task");
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");
  const [subjectIncludes, setSubjectIncludes] = useState("");
  const [senderIncludes, setSenderIncludes] = useState("");
  const [bodyIncludes, setBodyIncludes] = useState("");
  const autoSyncRunning = useRef(false);
  const autoProcessedSources = useRef(new Set<string>());
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<DraftResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await refreshTaskCopilotSuggestions({});
      const [nextSuggestions, nextIntakes, accountResult, connectionResult, nextRules, nextDraftReviews] = await Promise.all([
        listTaskCopilotSuggestions({}), listPendingTaskIntakes({}),
        supabase.from("email_accounts").select("id,email,provider").order("email"),
        supabase.from("gmail_mailbox_connections").select("email_account_id,status"),
        listGmailTaskAutomationRules({}), listPendingGmailTaskDraftReviews({}),
      ]);
      if (accountResult.error) throw accountResult.error;
      if (connectionResult.error) throw connectionResult.error;
      const connectedIds = new Set((connectionResult.data ?? []).filter((item) => item.status === "connected").map((item) => item.email_account_id));
      const availableAccounts = (accountResult.data ?? []).filter((account) => ["gmail","google"].includes(String(account.provider).toLowerCase()) && connectedIds.has(account.id));
      setGmailAccounts(availableAccounts);
      setEmailAccountId((current) => availableAccounts.some((account: any) => account.id === current) ? current : (availableAccounts[0]?.id ?? ""));
      setSuggestions(nextSuggestions as Suggestion[]);
      setIntakes(nextIntakes as Intake[]);
      setGmailRules(nextRules as GmailRule[]);
      setPendingDrafts(nextDraftReviews as DraftResult[]);
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


  const parseTerms = (value: string) => value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);

  async function saveGmailRule() {
    if (!clientId || !emailAccountId) return toast.error("Pilih akun Gmail dan client terlebih dahulu.");
    setBusy(true);
    try {
      await createGmailTaskAutomationRule({ data: {
        name: ruleName, emailAccountId, clientId, projectId: projectId || null, matchMode,
        subjectIncludes: parseTerms(subjectIncludes), senderIncludes: parseTerms(senderIncludes),
        bodyIncludes: parseTerms(bodyIncludes), subjectExcludes: [], senderExcludes: [], bodyExcludes: [],
      } });
      setSubjectIncludes(""); setSenderIncludes(""); setBodyIncludes("");
      toast.success("Aturan Gmail aktif. Email baru yang cocok akan dianalisis AI otomatis.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan aturan Gmail."); }
    finally { setBusy(false); }
  }

  async function toggleGmailRule(rule: GmailRule) {
    try {
      await setGmailTaskAutomationRuleEnabled({ data: { ruleId: rule.id, enabled: !rule.enabled } });
      setGmailRules((items) => items.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item));
      toast.success(rule.enabled ? "Aturan dijeda." : "Aturan diaktifkan.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal mengubah aturan."); }
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


  useEffect(() => {
    if (!gmailRules.some((rule) => rule.enabled)) return;
    let cancelled = false;
    const run = async () => {
      if (autoSyncRunning.current) return;
      autoSyncRunning.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("gmail-oauth", { body: { action: "task-auto-sync" } });
        if (error) throw error;
        if (!cancelled && Number(data?.imported || 0) > 0) {
          toast.success(data.imported + " email cocok dengan aturan Gmail dan masuk ke AI Task Generator.");
          await load();
        }
        if (!cancelled && Number(data?.reauthRequired || 0) > 0) toast.error("Ada akun Gmail yang perlu dihubungkan ulang.");
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Pemeriksaan otomatis Gmail gagal.");
      } finally { autoSyncRunning.current = false; }
    };
    void run();
    const timer = window.setInterval(() => void run(), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [gmailRules, load]);

  useEffect(() => {
    if (busy) return;
    const next = intakes.find((item) =>
      item.source_type === "email" && item.metadata?.integration_source === "gmail" &&
      Boolean(item.metadata?.automation_rule_id) && !autoProcessedSources.current.has(item.id));
    if (!next) return;
    autoProcessedSources.current.add(next.id);
    void processIntake(next);
  }, [intakes, busy]);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-2"><Webhook className="size-5 text-primary" /><div>
          <h2 className="text-sm font-semibold text-foreground">Integrasi masuk · Webhook</h2>
          <p className="text-xs text-muted-foreground">Terima event dari Make/n8n/Zapier atau gunakan callback native WhatsApp Cloud API dengan verifikasi signature Meta.</p>
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
        {gmailAccounts.length > 0 && <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-foreground">Otomatisasi Gmail → Task Workboard</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Email baru diperiksa berkala saat Workboard terbuka. Jika kriteria cocok, AI otomatis membuat draft Task untuk kamu review.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">Nama aturan
              <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">Pola kecocokan
              <select value={matchMode} onChange={(e) => setMatchMode(e.target.value as "any" | "all")} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                <option value="any">Salah satu kriteria cocok (OR)</option><option value="all">Semua kriteria harus cocok (AND)</option>
              </select>
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">Subject mengandung
              <textarea value={subjectIncludes} onChange={(e) => setSubjectIncludes(e.target.value)} rows={2} placeholder="contoh: [TASK], brief, revisi" className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground" />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">Pengirim mengandung
              <textarea value={senderIncludes} onChange={(e) => setSenderIncludes(e.target.value)} rows={2} placeholder="contoh: client@email.com, @perusahaan.com" className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground" />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground sm:col-span-2">Isi email mengandung
              <textarea value={bodyIncludes} onChange={(e) => setBodyIncludes(e.target.value)} rows={2} placeholder="contoh: tolong buatkan, deadline, desain banner" className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground" />
            </label>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Pisahkan beberapa kata/frasa dengan koma atau baris baru. Minimal satu kriteria wajib diisi. Pencocokan tidak membedakan huruf besar/kecil.</p>
          <Button size="sm" className="mt-2" onClick={() => void saveGmailRule()} disabled={busy || !clientId || !emailAccountId || (!subjectIncludes.trim() && !senderIncludes.trim() && !bodyIncludes.trim())}>
            {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <BellRing className="mr-1 size-3" />} Simpan & Aktifkan Aturan
          </Button>
          {gmailRules.length > 0 && <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">Aturan yang tersimpan</p>
            {gmailRules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
              <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground">{rule.name}</p>
                <p className="text-[10px] text-muted-foreground">{rule.trigger_config?.matchMode === "all" ? "Semua kriteria" : "Salah satu kriteria"} · {rule.trigger_config?.emailAccountId === emailAccountId ? "Akun terpilih" : "Akun Gmail lain"} · {rule.last_checked_at ? "Dicek " + new Date(rule.last_checked_at).toLocaleString("id-ID") : "Belum diperiksa"}</p></div>
              <Button size="sm" variant={rule.enabled ? "outline" : "secondary"} onClick={() => void toggleGmailRule(rule)}>{rule.enabled ? "Jeda" : "Aktifkan"}</Button>
            </div>)}
          </div>}
        </div>}
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
          <p className="text-xs font-semibold text-warning-foreground">Secret ditampilkan sekali — simpan dengan aman. Jangan masukkan secret ke kode frontend atau repository.</p>
          <div className="space-y-1"><p className="text-[11px] text-muted-foreground">Callback URL</p><code className="block break-all text-xs text-foreground">{endpoint.webhookUrl}</code>
            <Button size="sm" variant="outline" onClick={() => void copy(endpoint.webhookUrl)}><Clipboard className="mr-1 size-3" /> Salin URL</Button></div>
          {endpoint.provider === "whatsapp_cloud_api" ? <>
            <div className="space-y-1"><p className="text-[11px] text-muted-foreground">Meta Verify Token</p><code className="block break-all text-xs text-foreground">{endpoint.verificationToken}</code>
              <Button size="sm" variant="outline" onClick={() => void copy(endpoint.verificationToken ?? "")}><Clipboard className="mr-1 size-3" /> Salin Verify Token</Button></div>
            <p className="text-[11px] text-muted-foreground">Tambahkan App Secret Meta sebagai secret <strong>WHATSAPP_APP_SECRET</strong> di Supabase → Edge Functions → Secrets. Gunakan Callback URL dan Verify Token ini pada konfigurasi Webhooks di Meta for Developers, lalu subscribe field <strong>messages</strong>.</p>
          </> : <div className="space-y-1"><p className="text-[11px] text-muted-foreground">Header Authorization</p><code className="block break-all text-xs text-foreground">{endpoint.authorizationHeader}</code>
            <Button size="sm" variant="outline" onClick={() => void copy(endpoint.authorizationHeader ?? "")}><Clipboard className="mr-1 size-3" /> Salin secret</Button></div>}
        </div>}
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-foreground">Inbox integrasi tertunda</h3><span className="text-xs text-muted-foreground">{intakes.length} masuk</span></div>
          {intakes.length ? <ul className="mt-2 space-y-2">{intakes.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-foreground">{item.source_label}</span><span className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("id-ID")}</span></span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void processIntake(item)}>Analisis</Button>
          </li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">Belum ada event webhook yang menunggu diproses.</p>}
        </div>
        {pendingDrafts.length > 0 && <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-foreground">Draft Task menunggu persetujuan</h3><span className="text-[11px] text-muted-foreground">{pendingDrafts.length} draft</span></div>
          {pendingDrafts.map((item) => <div key={item.draftId} className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2">
            <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground">{item.title || "Draft dari email"}</p><p className="text-[11px] text-muted-foreground">{item.items.length} task · {item.summary.slice(0, 110)}</p></div>
            <Button size="sm" variant="outline" onClick={() => { setDraft(item); setSelectedItems(item.items.map((task) => task.id)); }}>Review</Button>
          </div>)}
        </div>}
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
        <p className="mt-3 text-[11px] text-muted-foreground">WhatsApp Cloud API memakai challenge Verify Token dan HMAC SHA-256 signature Meta. Pesan masuk hanya menjadi sumber Inbox; analisis dan persetujuan task tetap dilakukan manual. Audio/media belum diunduh otomatis.</p>
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
