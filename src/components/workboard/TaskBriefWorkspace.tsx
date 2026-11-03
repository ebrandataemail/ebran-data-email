import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, ClipboardCheck, Clock3, Download, FileText,
  History, Link2, Loader2, Plus, Save, Share2, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateTaskBrief, summarizeTaskBrief } from "@/lib/workboard/task-brief.functions";
import type { WorkboardClient, WorkboardDocument, WorkboardProject, WorkboardTask } from "./useWorkboardData";

type BriefSection = { key: string; title: string; content: string; status: "confirmed" | "needs_confirmation" | "missing" };
type Deliverable = {
  id: string; title: string; description: string; scope_type: "in_scope" | "out_of_scope" | "optional";
  quantity: number; format: string; specifications: string; revision_quota: number; acceptance_criteria: string[];
};
type BriefRow = {
  id?: string; title: string; status: string; sections: BriefSection[]; ai_summary: string;
  estimated_hours: number | null; estimated_days: number | null; priority_suggestion: string;
  budget_min: number | null; budget_max: number | null; currency: string; suggested_tools: string[];
  work_steps: string[]; assumptions: string[]; open_questions: string[]; current_version: number;
};
const SECTION_DEFS = [
  ["overview", "Task Overview"], ["background", "Background & Context"],
  ["objectives", "Objectives & Outcomes"], ["scope", "Scope of Work"],
  ["deliverables", "Deliverables"], ["specifications", "Specifications"],
  ["references", "References & Assets"], ["acceptance", "Acceptance Criteria"],
  ["revisions", "Revision Policy"], ["timeline", "Timeline & Milestones"],
  ["resources", "Resources & Budget"], ["risks", "Risks & Open Questions"],
] as const;
const EMPTY_SECTIONS: BriefSection[] = SECTION_DEFS.map(([key, title]) => ({ key, title, content: "", status: "missing" }));
const EMPTY_BRIEF: BriefRow = {
  title: "", status: "draft", sections: EMPTY_SECTIONS, ai_summary: "",
  estimated_hours: null, estimated_days: null, priority_suggestion: "medium",
  budget_min: null, budget_max: null, currency: "IDR", suggested_tools: [],
  work_steps: [], assumptions: [], open_questions: [], current_version: 1,
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusLabel = (status: string) => status === "confirmed" ? "Confirmed" : status === "needs_confirmation" ? "Needs confirmation" : "Missing";
const statusClass = (status: string) => status === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "needs_confirmation" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700";
const splitLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

export function TaskBriefWorkspace({
  client, project, task, documents, onDataChanged,
}: {
  client?: WorkboardClient;
  project?: WorkboardProject;
  task?: WorkboardTask | null;
  documents: WorkboardDocument[];
  onDataChanged: () => Promise<void>;
}) {
  const [brief, setBrief] = useState<BriefRow>(EMPTY_BRIEF);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [shareFeedback, setShareFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [revisionTarget, setRevisionTarget] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [revisionType, setRevisionType] = useState("minor_revision");
  const [activeSection, setActiveSection] = useState("overview");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareComments, setShareComments] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("7");
  const [shareLink, setShareLink] = useState("");
  const hydrated = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const taskId = task?.id ?? "";
  const isPersistedTask = UUID.test(taskId);

  const load = useCallback(async () => {
    if (!isPersistedTask) {
      setBrief({ ...EMPTY_BRIEF, title: task?.title ?? "" });
      setDeliverables([]);
      setSources([]);
      setRevisions([]);
      setVersions([]);
      setApprovals([]);
      setShares([]);
      setShareFeedback([]);
      setDirty(false);
      hydrated.current = true;
      return;
    }
    setLoading(true);
    try {
      const { data: row, error } = await (supabase.from("task_briefs" as any) as any)
        .select("*").eq("task_id", taskId).maybeSingle();
      if (error) throw error;
      if (!row) {
        setBrief({ ...EMPTY_BRIEF, title: task?.title ?? "" });
        setDeliverables([]);
        setSources([]);
        setRevisions([]);
        setVersions([]);
        setApprovals([]);
        setShares([]);
        setShareFeedback([]);
      } else {
        const [d, s, r, v, a, sh] = await Promise.all([
          (supabase.from("task_brief_deliverables" as any) as any).select("*").eq("brief_id", row.id).order("sort_order"),
          (supabase.from("task_brief_sources" as any) as any).select("*").eq("brief_id", row.id).order("created_at", { ascending: false }),
          (supabase.from("task_brief_revision_requests" as any) as any).select("*").eq("brief_id", row.id).order("created_at", { ascending: false }),
          (supabase.from("task_brief_versions" as any) as any).select("id,version_number,status,change_note,created_at").eq("brief_id", row.id).order("version_number", { ascending: false }),
          (supabase.from("task_brief_approvals" as any) as any).select("*").eq("brief_id", row.id).order("created_at", { ascending: false }),
          (supabase.from("task_brief_shares" as any) as any).select("id,allow_comments,allow_confirmation,expires_at,revoked_at,created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
        ]);
        for (const result of [d, s, r, v, a, sh]) if (result.error) throw result.error;
        const deliverableRows = d.data ?? [];
        const criteria = deliverableRows.length
          ? await (supabase.from("task_brief_acceptance_criteria" as any) as any).select("*").in("deliverable_id", deliverableRows.map((x: any) => x.id)).order("sort_order")
          : { data: [], error: null };
        if (criteria.error) throw criteria.error;
        setBrief({
          ...EMPTY_BRIEF, ...row,
          sections: Array.isArray(row.sections) ? row.sections : EMPTY_SECTIONS,
          suggested_tools: Array.isArray(row.suggested_tools) ? row.suggested_tools : [],
          work_steps: Array.isArray(row.work_steps) ? row.work_steps : [],
          assumptions: Array.isArray(row.assumptions) ? row.assumptions : [],
          open_questions: Array.isArray(row.open_questions) ? row.open_questions : [],
        });
        setDeliverables(deliverableRows.map((item: any) => ({
          ...item,
          acceptance_criteria: (criteria.data ?? []).filter((c: any) => c.deliverable_id === item.id).map((c: any) => c.criterion),
        })));
        setSources(s.data ?? []);
        setRevisions(r.data ?? []);
        setVersions(v.data ?? []);
        setApprovals(a.data ?? []);
        setShares(sh.data ?? []);
        const activeShareIds = (sh.data ?? []).map((item: any) => item.id);
        if (activeShareIds.length) {
          const feedback = await (supabase.from("task_brief_share_feedback" as any) as any).select("*").in("share_id", activeShareIds).order("created_at", { ascending: false });
          if (feedback.error) throw feedback.error;
          setShareFeedback(feedback.data ?? []);
        } else setShareFeedback([]);
      }
      setDirty(false);
      hydrated.current = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Brief gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, [isPersistedTask, taskId, task?.title]);

  useEffect(() => { hydrated.current = false; void load(); }, [load]);

  useEffect(() => {
    if (!brief.id) return;
    const channel = supabase.channel("task-brief-live-" + brief.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_brief_revision_requests", filter: "brief_id=eq." + brief.id }, () => {
        if (!dirtyRef.current) void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_brief_share_feedback" }, () => {
        if (!dirtyRef.current) void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_brief_approvals", filter: "brief_id=eq." + brief.id }, () => {
        if (!dirtyRef.current) void load();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [brief.id, load]);

  const completeness = useMemo(() => {
    const sectionScore = brief.sections.filter((s) => s.status === "confirmed").length;
    const deliverableScore = deliverables.length ? 1 : 0;
    return Math.round(((sectionScore + deliverableScore) / (brief.sections.length + 1)) * 100);
  }, [brief.sections, deliverables.length]);

  const persist = useCallback(async () => {
    if (!isPersistedTask || !client || !task) throw new Error("Simpan brief memerlukan task yang sudah tersimpan di database.");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError ?? new Error("Sesi login tidak ditemukan.");
    setSaving(true);
    try {
      const payload = {
        user_id: authData.user.id, client_id: client.id, project_id: project?.id ?? null, task_id: task.id,
        title: brief.title.trim() || task.title, status: brief.status === "approved" ? "draft" : brief.status,
        sections: brief.sections, ai_summary: brief.ai_summary || null,
        estimated_hours: brief.estimated_hours, estimated_days: brief.estimated_days,
        priority_suggestion: brief.priority_suggestion || null,
        budget_min: brief.budget_min, budget_max: brief.budget_max, currency: brief.currency || "IDR",
        suggested_tools: brief.suggested_tools, work_steps: brief.work_steps,
        assumptions: brief.assumptions, open_questions: brief.open_questions,
        updated_at: new Date().toISOString(),
        ...(brief.status === "approved" ? { approved_at: null, approved_by: null } : {}),
      };
      let saved = brief.id;
      if (saved) {
        const { error } = await (supabase.from("task_briefs" as any) as any).update(payload).eq("id", saved);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("task_briefs" as any) as any).insert(payload).select("*").single();
        if (error) throw error;
        saved = data.id;
        setBrief((current) => ({ ...current, id: data.id, current_version: data.current_version ?? 1 }));
      }
      const { data: existingRows, error: existingError } = await (supabase.from("task_brief_deliverables" as any) as any)
        .select("id").eq("brief_id", saved);
      if (existingError) throw existingError;
      const nextRows = deliverables.map((item, index) => ({
        id: item.id, user_id: authData.user.id, brief_id: saved, title: item.title.trim() || "Deliverable",
        description: item.description || null, scope_type: item.scope_type, quantity: Math.max(1, Number(item.quantity) || 1),
        format: item.format || null, specifications: { text: item.specifications || "" },
        revision_quota: Math.max(0, Number(item.revision_quota) || 0), sort_order: index,
      }));
      if (nextRows.length) {
        const { error } = await (supabase.from("task_brief_deliverables" as any) as any).upsert(nextRows, { onConflict: "id" });
        if (error) throw error;
      }
      const nextIds = new Set(nextRows.map((x) => x.id));
      for (const old of existingRows ?? []) if (!nextIds.has(old.id)) {
        const { error } = await (supabase.from("task_brief_deliverables" as any) as any).delete().eq("id", old.id);
        if (error) throw error;
      }
      for (const item of deliverables) {
        const { error: deleteCriteriaError } = await (supabase.from("task_brief_acceptance_criteria" as any) as any)
          .delete().eq("deliverable_id", item.id);
        if (deleteCriteriaError) throw deleteCriteriaError;
        const rows = item.acceptance_criteria.map((criterion, index) => ({
          user_id: authData.user.id, deliverable_id: item.id, criterion, sort_order: index,
        }));
        if (rows.length) {
          const { error } = await (supabase.from("task_brief_acceptance_criteria" as any) as any).insert(rows);
          if (error) throw error;
        }
      }
      const { data: fresh, error: freshError } = await (supabase.from("task_briefs" as any) as any).select("*").eq("id", saved).single();
      if (freshError) throw freshError;
      setBrief((current) => ({ ...current, ...fresh, sections: fresh.sections ?? current.sections }));
      setDirty(false);
      await onDataChanged();
      return fresh;
    } finally {
      setSaving(false);
    }
  }, [isPersistedTask, client, task, project?.id, brief, deliverables, onDataChanged]);

  useEffect(() => {
    if (!dirty || !hydrated.current || !isPersistedTask || !editorOpen) return;
    const timer = window.setTimeout(() => {
      void persist().catch((error) => toast.error(error instanceof Error ? error.message : "Autosave gagal"));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, editorOpen, isPersistedTask, persist]);

  function patchBrief(patch: Partial<BriefRow>) {
    setBrief((current) => ({ ...current, ...patch }));
    setDirty(true);
  }
  function patchSection(key: string, patch: Partial<BriefSection>) {
    patchBrief({ sections: brief.sections.map((section) => section.key === key ? { ...section, ...patch } : section) });
  }
  function patchDeliverable(id: string, patch: Partial<Deliverable>) {
    setDeliverables((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setDirty(true);
  }
  function addDeliverable() {
    setDeliverables((current) => [...current, {
      id: crypto.randomUUID(), title: "", description: "", scope_type: "in_scope", quantity: 1,
      format: "", specifications: "", revision_quota: 2, acceptance_criteria: [],
    }]);
    setDirty(true);
  }

  async function runAi() {
    if (!isPersistedTask) { toast.error("Simpan task terlebih dahulu sebelum membuat brief AI."); return; }
    setAiLoading(true);
    try {
      let file: { fileName: string; mediaType: string; base64: string } | null = null;
      if (aiFile) {
        if (aiFile.size > 8 * 1024 * 1024) throw new Error("File AI maksimal 8 MB.");
        file = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ fileName: aiFile.name, mediaType: aiFile.type, base64: String(reader.result).split(",")[1] ?? "" });
          reader.onerror = () => reject(new Error("File gagal dibaca."));
          reader.readAsDataURL(aiFile);
        });
      }
      const result = await generateTaskBrief({ data: { taskId, context: aiContext, instructions: aiInstructions, file } });
      setBrief((current) => ({
        ...current, title: current.title || task?.title || "Task Brief", sections: result.sections as BriefSection[],
        ai_summary: result.summary, estimated_hours: result.estimatedHours, estimated_days: result.estimatedDays,
        priority_suggestion: result.priority, budget_min: result.budgetMin, budget_max: result.budgetMax,
        suggested_tools: result.tools, work_steps: result.workSteps, assumptions: result.assumptions, open_questions: result.openQuestions,
      }));
      setDeliverables(result.deliverables.map((item, index) => ({
        id: crypto.randomUUID(), title: item.title, description: item.description, scope_type: item.scopeType,
        quantity: item.quantity, format: item.format, specifications: item.specifications,
        revision_quota: item.revisionQuota, acceptance_criteria: item.acceptanceCriteria,
      })));
      setDirty(true);
      setAiOpen(false);
      setAiFile(null);
      toast.success("Draft brief AI berhasil dibuat. Periksa semua asumsi sebelum disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI gagal membuat brief");
    } finally {
      setAiLoading(false);
    }
  }

  async function runSummary() {
    if (!isPersistedTask) return;
    setSummaryLoading(true);
    try {
      const result = await summarizeTaskBrief({ data: { taskId, brief: { ...brief, deliverables } } });
      patchBrief({ ai_summary: result.summary });
      toast.success("Ringkasan AI diperbarui.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ringkasan AI gagal dibuat");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function addUrlSource() {
    if (!brief.id || !sourceUrl.trim()) { toast.error("Simpan brief terlebih dahulu dan masukkan URL."); return; }
    let parsed: URL;
    try { parsed = new URL(/^https?:\/\//i.test(sourceUrl) ? sourceUrl : "https://" + sourceUrl); }
    catch { toast.error("URL tidak valid."); return; }
    if (!["http:", "https:"].includes(parsed.protocol)) { toast.error("Hanya URL HTTP/HTTPS yang didukung."); return; }
    const { error } = await (supabase.from("task_brief_sources" as any) as any).insert({
      brief_id: brief.id, source_type: "url", title: parsed.hostname, source_url: parsed.toString(),
      source_status: "needs_review", metadata: { import_method: "manual_link" },
    });
    if (error) { toast.error(error.message); return; }
    setSourceUrl("");
    await load();
    toast.success("Link referensi ditambahkan. Kontennya perlu ditinjau sebelum dipakai AI.");
  }

  async function addFileSource(file?: File) {
    if (!file || !brief.id) { toast.error("Simpan brief terlebih dahulu."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Ukuran file maksimal 20 MB."); return; }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { toast.error("Sesi login tidak ditemukan."); return; }
    const path = authData.user.id + "/" + client?.id + "/brief-sources/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const { error: uploadError } = await supabase.storage.from("client-files").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { error } = await (supabase.from("task_brief_sources" as any) as any).insert({
      brief_id: brief.id, source_type: "file", title: file.name, storage_path: path,
      source_status: "added", metadata: { mime_type: file.type, file_size: file.size },
    });
    if (error) { await supabase.storage.from("client-files").remove([path]); toast.error(error.message); return; }
    await load();
    toast.success("File referensi tersimpan di Storage privat.");
  }

  async function createVersion() {
    let saved = brief;
    try { saved = await persist(); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan"); return; }
    const next = versions.length ? Number(saved.current_version || 1) + 1 : Number(saved.current_version || 1);
    const snapshot = { ...saved, deliverables };
    const { error } = await (supabase.from("task_brief_versions" as any) as any).insert({
      brief_id: saved.id, version_number: next, status: saved.status, snapshot, change_note: "Snapshot manual",
    });
    if (error) { toast.error(error.message); return; }
    const { error: updateError } = await (supabase.from("task_briefs" as any) as any).update({ current_version: next }).eq("id", saved.id);
    if (updateError) { toast.error(updateError.message); return; }
    await load();
    toast.success("Snapshot versi v" + next + " tersimpan.");
  }

  async function approveBrief() {
    let saved = brief;
    try { saved = await persist(); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan"); return; }
    const missing = saved.sections.filter((s: BriefSection) => s.status !== "confirmed");
    if (missing.length || !deliverables.length) {
      toast.error("Lengkapi atau konfirmasi seluruh bagian dan minimal satu deliverable sebelum approval.");
      return;
    }
    const next = versions.length ? Number(saved.current_version || 1) + 1 : Number(saved.current_version || 1);
    const snapshot = { ...saved, status: "approved", deliverables };
    const { error: versionError } = await (supabase.from("task_brief_versions" as any) as any).insert({
      brief_id: saved.id, version_number: next, status: "approved", snapshot, change_note: "Internal approval",
    });
    if (versionError) { toast.error(versionError.message); return; }
    const { data: authData } = await supabase.auth.getUser();
    const { error: approvalError } = await (supabase.from("task_brief_approvals" as any) as any).insert({
      brief_id: saved.id, version_number: next, decision: "approved", note: "Disetujui secara internal.",
      reviewer_id: authData.user?.id,
    });
    if (approvalError) { toast.error(approvalError.message); return; }
    const { error: updateError } = await (supabase.from("task_briefs" as any) as any).update({
      status: "approved", current_version: next, approved_at: new Date().toISOString(), approved_by: authData.user?.id,
    }).eq("id", saved.id);
    if (updateError) { toast.error(updateError.message); return; }
    await load();
    toast.success("Brief disetujui secara internal dan versi dikunci.");
  }

  async function addRevision() {
    const item = deliverables.find((d) => d.id === revisionTarget);
    const description = revisionText.trim();
    if (!brief.id || !item || !description) return;
    const used = revisions.filter((r) => r.deliverable_id === item.id && r.quota_consumed && r.status !== "rejected").length;
    const consumes = revisionType === "minor_revision";
    if (consumes && used >= item.revision_quota) {
      toast.error("Kuota revisi deliverable ini sudah habis. Buat Change Request untuk perubahan berikutnya.");
      return;
    }
    const { error } = await (supabase.from("task_brief_revision_requests" as any) as any).insert({
      brief_id: brief.id, deliverable_id: item.id, request_type: revisionType, description,
      round_number: consumes ? used + 1 : null, quota_consumed: consumes,
    });
    if (error) { toast.error(error.message); return; }
    setRevisionText("");
    setRevisionTarget("");
    await load();
    toast.success(consumes ? "Revisi dicatat dan kuota diperbarui." : "Koreksi / perubahan scope dicatat.");
  }

  async function createControlledShare() {
    if (!brief.id) { toast.error("Simpan brief terlebih dahulu."); return; }
    try {
      const saved = await persist();
      const nextVersion = versions.length ? Number(saved.current_version || 1) + 1 : Number(saved.current_version || 1);
      const snapshot = { ...saved, current_version: nextVersion, deliverables };
      const { error: versionError } = await (supabase.from("task_brief_versions" as any) as any).insert({
        brief_id: saved.id, version_number: nextVersion, status: saved.status, snapshot,
        change_note: "Snapshot untuk controlled client share",
      });
      if (versionError) throw versionError;
      const { error: updateError } = await (supabase.from("task_briefs" as any) as any)
        .update({ current_version: nextVersion }).eq("id", saved.id);
      if (updateError) throw updateError;

      const token = crypto.randomUUID() + crypto.randomUUID();
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const expiresAt = shareExpiry === "never" ? null : new Date(Date.now() + Number(shareExpiry) * 86400000).toISOString();
      const { error } = await (supabase.from("task_brief_shares" as any) as any).insert({
        brief_id: saved.id, version_number: nextVersion, token_hash: tokenHash,
        allow_comments: shareComments, allow_confirmation: shareConfirmation, expires_at: expiresAt,
      });
      if (error) throw error;
      const link = window.location.origin + "/brief-share/" + token;
      setShareLink(link);
      setBrief((current) => ({ ...current, current_version: nextVersion }));
      await load();
      try { await navigator.clipboard.writeText(link); toast.success("Tautan share versi v" + nextVersion + " dibuat dan disalin."); }
      catch { toast.success("Tautan share versi v" + nextVersion + " dibuat."); }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Controlled share gagal dibuat.");
    }
  }

  async function revokeShare(id: string) {
    const { error } = await (supabase.from("task_brief_shares" as any) as any)
      .update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
    toast.success("Tautan share dicabut.");
  }

  const confirmedCount = brief.sections.filter((s) => s.status === "confirmed").length;
  const latestApproval = approvals[0];
  const selectedSection = brief.sections.find((s) => s.key === activeSection) ?? brief.sections[0];

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-wb-ink"><FileText className="size-3.5 text-wb-blue-strong" /> Client Brief &amp; Scope</h3>
          <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize">{brief.status.replaceAll("_", " ")}</span>
        </div>
        <div className="space-y-3 p-3">
          {loading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat brief…</div> : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-wb-ink">{brief.title || task?.title || "Brief belum dibuat"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{brief.id ? "Version " + brief.current_version : "Belum ada brief tersimpan"} · {confirmedCount}/{brief.sections.length} bagian confirmed</p>
                </div>
                {brief.id && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">{completeness}% lengkap</span>}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600" style={{ width: completeness + "%" }} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-[9px] text-muted-foreground">Estimasi waktu</p><p className="mt-1 text-sm font-bold text-wb-ink">{brief.estimated_hours != null ? brief.estimated_hours + " jam" : "Belum dihitung"}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-[9px] text-muted-foreground">Prioritas AI</p><p className="mt-1 text-sm font-bold capitalize text-wb-ink">{brief.priority_suggestion || "—"}</p></div>
              </div>
              {brief.ai_summary && <p className="line-clamp-4 text-[10px] leading-relaxed text-muted-foreground">{brief.ai_summary}</p>}
              {brief.open_questions.length > 0 && <p className="text-[10px] text-amber-700">{brief.open_questions.length} pertanyaan perlu dikonfirmasi</p>}
              {latestApproval && <p className="text-[10px] text-emerald-700">Approval internal terakhir: {latestApproval.decision} · {new Date(latestApproval.created_at).toLocaleDateString("id-ID")}</p>}
              <button type="button" onClick={() => setEditorOpen(true)} disabled={!task} className="w-full rounded-lg bg-wb-blue-strong px-3 py-2 text-[10px] font-semibold text-brand-contrast hover:opacity-90 disabled:opacity-50">Open Full Brief Editor</button>
              {!isPersistedTask && <p className="text-[9px] text-amber-700">Task contoh belum tersimpan. Buat task permanen untuk menyimpan brief.</p>}
            </>
          )}
        </div>
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditorOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Client Brief & Scope Editor" className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-background shadow-2xl sm:h-[92vh] sm:rounded-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0"><h2 className="text-sm font-bold text-foreground">Client Brief &amp; Scope</h2><p className="truncate text-[10px] text-muted-foreground">{client?.name} · {task?.title} · v{brief.current_version}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
                <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Close editor"><X className="size-4" /></button>
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <aside className="flex gap-1 overflow-x-auto border-b border-border p-2 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
                {brief.sections.map((section) => (
                  <button key={section.key} type="button" onClick={() => setActiveSection(section.key)} className={"flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[10px] " + (activeSection === section.key ? "bg-wb-blue/15 font-bold text-wb-ink" : "text-muted-foreground hover:bg-muted")}>
                    <span>{section.title}</span><span className={"size-2 shrink-0 rounded-full " + (section.status === "confirmed" ? "bg-emerald-500" : section.status === "needs_confirmation" ? "bg-amber-500" : "bg-rose-500")} />
                  </button>
                ))}
                <div className="mt-auto hidden border-t border-border pt-3 text-[10px] text-muted-foreground lg:block">{confirmedCount} confirmed · {brief.sections.filter((s) => s.status === "missing").length} missing</div>
              </aside>
              <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-wb-blue-strong">Task Brief · {selectedSection?.key}</p><h3 className="mt-1 text-lg font-bold text-foreground">{selectedSection?.title}</h3></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setAiOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-wb-blue-strong/30 px-3 py-2 text-[10px] font-semibold text-wb-blue-strong"><Sparkles className="size-3.5" /> Generate with AI</button>
                    <button type="button" onClick={() => void runSummary()} disabled={summaryLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold hover:bg-muted"><Wand2 className="size-3.5" /> {summaryLoading ? "Meringkas…" : "AI Summary"}</button>
                  </div>
                </div>
                {selectedSection && (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-foreground">Isi brief</label>
                      <select value={selectedSection.status} onChange={(e) => patchSection(selectedSection.key, { status: e.target.value as BriefSection["status"] })} className="rounded-md border border-border bg-background px-2 py-1 text-[10px]">
                        <option value="confirmed">Confirmed</option><option value="needs_confirmation">Needs confirmation</option><option value="missing">Missing</option>
                      </select>
                    </div>
                    <textarea value={selectedSection.content} onChange={(e) => patchSection(selectedSection.key, { content: e.target.value })} rows={10} placeholder="Tuliskan informasi, batasan, spesifikasi, atau kesepakatan untuk bagian ini…" className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <p className="text-[10px] text-muted-foreground">Status Confirmed hanya dipilih setelah informasi diverifikasi dari sumber atau keputusan internal.</p>
                  </div>
                )}
                {activeSection === "deliverables" && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-bold">Deliverables &amp; Scope Register</h4><button type="button" onClick={addDeliverable} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add item</button></div>
                    {deliverables.map((item) => (
                      <article key={item.id} className="space-y-3 rounded-xl border border-border p-3">
                        <div className="flex items-start gap-2"><input value={item.title} onChange={(e) => patchDeliverable(item.id, { title: e.target.value })} placeholder="Nama deliverable" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs" /><button type="button" onClick={() => { setDeliverables((current) => current.filter((d) => d.id !== item.id)); setDirty(true); }} className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button></div>
                        <textarea value={item.description} onChange={(e) => patchDeliverable(item.id, { description: e.target.value })} placeholder="Deskripsi dan ruang lingkup deliverable" rows={2} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
                        <div className="grid gap-2 sm:grid-cols-4">
                          <select value={item.scope_type} onChange={(e) => patchDeliverable(item.id, { scope_type: e.target.value as Deliverable["scope_type"] })} className="rounded-md border border-border bg-background p-2 text-xs"><option value="in_scope">In Scope</option><option value="out_of_scope">Out of Scope</option><option value="optional">Optional</option></select>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => patchDeliverable(item.id, { quantity: Number(e.target.value) })} className="rounded-md border border-border bg-background p-2 text-xs" aria-label="Quantity" />
                          <input value={item.format} onChange={(e) => patchDeliverable(item.id, { format: e.target.value })} placeholder="Format" className="rounded-md border border-border bg-background p-2 text-xs" />
                          <input type="number" min="0" value={item.revision_quota} onChange={(e) => patchDeliverable(item.id, { revision_quota: Number(e.target.value) })} className="rounded-md border border-border bg-background p-2 text-xs" aria-label="Revision quota" />
                        </div>
                        <textarea value={item.specifications} onChange={(e) => patchDeliverable(item.id, { specifications: e.target.value })} placeholder="Spesifikasi teknis (ukuran, warna, platform, file source, dll.)" rows={2} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
                        <textarea value={item.acceptance_criteria.join("\n")} onChange={(e) => patchDeliverable(item.id, { acceptance_criteria: splitLines(e.target.value) })} placeholder="Acceptance criteria — satu kriteria per baris" rows={3} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
                      </article>
                    ))}
                    {!deliverables.length && <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Belum ada deliverable. Tambahkan manual atau generate dengan AI.</p>}
                  </section>
                )}
                {activeSection === "resources" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs">Estimasi jam kerja<input type="number" min="0" step="0.5" value={brief.estimated_hours ?? ""} onChange={(e) => patchBrief({ estimated_hours: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs">Estimasi hari kalender<input type="number" min="0" step="0.5" value={brief.estimated_days ?? ""} onChange={(e) => patchBrief({ estimated_days: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs">Prioritas AI<select value={brief.priority_suggestion} onChange={(e) => patchBrief({ priority_suggestion: e.target.value })} className="w-full rounded-md border border-border bg-background p-2"><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                    <label className="space-y-1 text-xs">Mata uang<input value={brief.currency} onChange={(e) => patchBrief({ currency: e.target.value.toUpperCase().slice(0, 3) })} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs">Budget minimum<input type="number" min="0" value={brief.budget_min ?? ""} onChange={(e) => patchBrief({ budget_min: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs">Budget maksimum<input type="number" min="0" value={brief.budget_max ?? ""} onChange={(e) => patchBrief({ budget_max: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs sm:col-span-2">Tools yang disarankan<textarea value={brief.suggested_tools.join("\n")} onChange={(e) => patchBrief({ suggested_tools: splitLines(e.target.value) })} rows={3} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs sm:col-span-2">Langkah pengerjaan (3–5 poin)<textarea value={brief.work_steps.join("\n")} onChange={(e) => patchBrief({ work_steps: splitLines(e.target.value) })} rows={4} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs sm:col-span-2">Asumsi<textarea value={brief.assumptions.join("\n")} onChange={(e) => patchBrief({ assumptions: splitLines(e.target.value) })} rows={3} className="w-full rounded-md border border-border bg-background p-2" /></label>
                    <label className="space-y-1 text-xs sm:col-span-2">Pertanyaan terbuka<textarea value={brief.open_questions.join("\n")} onChange={(e) => patchBrief({ open_questions: splitLines(e.target.value) })} rows={3} className="w-full rounded-md border border-border bg-background p-2" /></label>
                  </section>
                )}
                {activeSection === "references" && (
                  <section className="space-y-3 rounded-xl border border-border p-4">
                    <h4 className="text-sm font-bold">Source Library</h4>
                    <div className="flex flex-col gap-2 sm:flex-row"><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://website-atau-dokumen.com" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs" /><button type="button" onClick={() => void addUrlSource()} className="rounded-md border px-3 py-2 text-xs">Add link</button></div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs"><Plus className="size-3" /> Upload file<input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.csv" onChange={(e) => { void addFileSource(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
                    {sources.map((source) => <div key={source.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2 text-xs"><span className="min-w-0 truncate">{source.title}</span><span className="shrink-0 text-[9px] text-muted-foreground">{source.source_status}</span></div>)}
                    {documents.length > 0 && <div className="border-t border-border pt-3"><p className="mb-2 text-[10px] font-semibold text-muted-foreground">Client Documents yang tersedia ({documents.length})</p>{documents.slice(0, 6).map((doc) => <p key={doc.id} className="truncate py-1 text-[10px]">{doc.title || doc.file_name}</p>)}</div>}
                    <p className="text-[10px] text-muted-foreground">File disimpan di Storage privat. Link yang ditambahkan menjadi referensi dan perlu diperiksa; konektor Email, WhatsApp, Telegram, Trello, Canva, Teams, dan Google Workspace memerlukan autentikasi/integrasi terpisah.</p>
                  </section>
                )}
                {activeSection === "revisions" && (
                  <section className="space-y-3 rounded-xl border border-border p-4">
                    <h4 className="text-sm font-bold">Revision Quota per Deliverable</h4>
                    {deliverables.map((item) => {
                      const used = revisions.filter((r) => r.deliverable_id === item.id && r.quota_consumed && r.status !== "rejected").length;
                      return <div key={item.id} className="rounded-lg bg-muted/50 p-3"><div className="flex justify-between gap-2 text-xs"><b>{item.title || "Deliverable"}</b><span>{used}/{item.revision_quota} putaran</span></div><div className="mt-2 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-amber-500" style={{ width: Math.min(100, item.revision_quota ? used / item.revision_quota * 100 : 100) + "%" }} /></div></div>;
                    })}
                    <select value={revisionTarget} onChange={(e) => setRevisionTarget(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs"><option value="">Pilih deliverable</option>{deliverables.map((item) => <option key={item.id} value={item.id}>{item.title || "Deliverable"}</option>)}</select>
                    <select value={revisionType} onChange={(e) => setRevisionType(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs"><option value="minor_revision">Minor revision (pakai kuota)</option><option value="correction">Correction (tidak pakai kuota)</option><option value="major_revision">Major revision (change request)</option><option value="new_deliverable">New deliverable</option></select>
                    <textarea value={revisionText} onChange={(e) => setRevisionText(e.target.value)} rows={3} placeholder="Catatan permintaan revisi / koreksi…" className="w-full rounded-md border border-border bg-background p-2 text-xs" />
                    <button type="button" onClick={() => void addRevision()} disabled={!revisionTarget || !revisionText.trim()} className="rounded-md bg-wb-blue-strong px-3 py-2 text-xs font-semibold text-brand-contrast disabled:opacity-50">Catat perubahan</button>
                    {revisions.map((r) => <div key={r.id} className="border-t border-border pt-2 text-[10px]"><b>{r.request_type.replaceAll("_", " ")}</b> · {r.description}</div>)}
                  </section>
                )}
                {activeSection === "timeline" && <section className="rounded-xl border border-border p-4"><h4 className="mb-2 text-sm font-bold">Task Timeline</h4><p className="text-xs text-muted-foreground">Deadline task: {task?.due_date ? new Date(task.due_date + "T00:00:00").toLocaleDateString("id-ID") : "Belum ditentukan"}. Isi milestone dan dependensi pada bagian Timeline &amp; Milestones.</p></section>}
                {activeSection === "acceptance" && <section className="rounded-xl border border-border p-4"><h4 className="text-sm font-bold">Acceptance Criteria</h4><p className="mt-2 text-xs text-muted-foreground">Kriteria penerimaan dikelola per deliverable di bagian Deliverables. Gunakan checklist yang bisa diverifikasi, bukan penilaian subjektif.</p></section>}
                {activeSection === "scope" && <section className="rounded-xl border border-border p-4"><h4 className="text-sm font-bold">Scope Summary</h4><div className="grid gap-2 sm:grid-cols-3">{(["in_scope","out_of_scope","optional"] as const).map((scope) => <div className="rounded-lg bg-muted/50 p-3" key={scope}><b className="text-xs capitalize">{scope.replaceAll("_"," ")}</b><p className="mt-1 text-xl font-bold">{deliverables.filter((d) => d.scope_type === scope).length}</p><p className="text-[10px] text-muted-foreground">items</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Edit daftar item di bagian Deliverables.</p></section>}
                {activeSection === "overview" && <section className="rounded-xl border border-border p-4"><label className="block text-xs font-semibold">Brief Title<input value={brief.title} onChange={(e) => patchBrief({ title: e.target.value })} className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm" /></label><p className="mt-3 text-xs text-muted-foreground">Task: {task?.title} · Client: {client?.name} · Project: {project?.name ?? "Belum ditautkan"}</p></section>}
                {activeSection === "resources" && <></>}
                {activeSection === "risks" && <section className="rounded-xl border border-border p-4"><h4 className="text-sm font-bold">Risks &amp; Open Questions</h4><textarea value={brief.open_questions.join("\n")} onChange={(e) => patchBrief({ open_questions: splitLines(e.target.value) })} rows={5} className="mt-2 w-full rounded-md border border-border bg-background p-2 text-xs" placeholder="Pertanyaan yang belum terjawab, risiko, dan dependensi…" /></section>}
                {activeSection === "specifications" && <section className="rounded-xl border border-border p-4"><h4 className="text-sm font-bold">Technical Specifications</h4><p className="mt-2 text-xs text-muted-foreground">Tuliskan ukuran, resolusi, platform, format file, aksesibilitas, browser/device, brand rules, dan batasan teknis.</p></section>}
              </main>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void createVersion()} disabled={saving || !brief.id} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold disabled:opacity-50"><History className="size-3.5" /> Save Version</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><Download className="size-3.5" /> Print / PDF</button>
                <button type="button" onClick={() => setShareOpen(true)} disabled={!brief.id} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold disabled:opacity-50"><Share2 className="size-3.5" /> Controlled Share</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void persist().then(() => toast.success("Brief tersimpan.")).catch((e) => toast.error(e.message))} disabled={saving || !isPersistedTask} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold disabled:opacity-50"><Save className="size-3.5" /> {saving ? "Saving…" : "Save Draft"}</button>
                <button type="button" onClick={() => void approveBrief()} disabled={saving || !brief.id} className="inline-flex items-center gap-1 rounded-lg bg-wb-blue-strong px-3 py-2 text-[10px] font-semibold text-brand-contrast disabled:opacity-50"><ClipboardCheck className="size-3.5" /> Internal Approve</button>
              </div>
            </footer>
            {aiOpen && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-3"><section className="w-full max-w-xl space-y-3 rounded-2xl border border-border bg-background p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-bold">Generate Task Brief with Ebran AI</h3><button type="button" onClick={() => setAiOpen(false)}><X className="size-4" /></button></div><p className="text-xs text-muted-foreground">AI membaca task, client profile, brand profile, project, dan metadata dokumen yang tersedia.</p><label className="block text-xs font-semibold">Konteks tambahan<textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background p-2 font-normal" placeholder="Apa yang client minta? Tujuan kampanye? Informasi dari meeting?" /></label><label className="block text-xs font-semibold">Instruksi khusus<textarea value={aiInstructions} onChange={(e) => setAiInstructions(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background p-2 font-normal" placeholder="Pantangan, gaya, target kualitas, batasan, asumsi yang harus diuji…" /></label><label className="block text-xs font-semibold">Lampiran untuk AI<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv" onChange={(e) => setAiFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setAiOpen(false)} className="rounded-md border px-3 py-2 text-xs">Cancel</button><button type="button" onClick={() => void runAi()} disabled={aiLoading} className="inline-flex items-center gap-2 rounded-md bg-wb-blue-strong px-3 py-2 text-xs font-semibold text-brand-contrast disabled:opacity-50"><Sparkles className="size-3.5" />{aiLoading ? "AI sedang menyusun…" : "Generate Draft"}</button></div></section></div>}
            {shareOpen && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-3"><section className="w-full max-w-lg space-y-3 rounded-2xl border border-border bg-background p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-bold">Controlled Client Share</h3><button type="button" onClick={() => setShareOpen(false)}><X className="size-4" /></button></div><p className="text-xs text-muted-foreground">Akses read-only secara default. Internal notes, AI prompts, cost/margin internal, dan komentar internal tidak ikut dibagikan.</p><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={shareComments} onChange={(e) => setShareComments(e.target.checked)} /> Izinkan client memberi komentar</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={shareConfirmation} onChange={(e) => setShareConfirmation(e.target.checked)} /> Izinkan client mengonfirmasi brief</label><label className="block text-xs">Tautan kedaluwarsa<select value={shareExpiry} onChange={(e) => setShareExpiry(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2"><option value="1">1 hari</option><option value="7">7 hari</option><option value="30">30 hari</option><option value="never">Tidak kedaluwarsa</option></select></label><button type="button" onClick={() => void createControlledShare()} className="w-full rounded-md bg-wb-blue-strong px-3 py-2 text-xs font-semibold text-brand-contrast">Generate Share Link</button>{shareLink && <div className="break-all rounded-lg bg-muted p-2 text-[10px]">{shareLink}<p className="mt-1 text-emerald-700">Halaman client share aktif. Tautan dapat dibagikan ke client.</p></div>}
            {shares.length > 0 && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs font-semibold">Share links &amp; access history</p>{shares.map((share) => <div key={share.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2 text-[10px]"><span>{share.revoked_at ? "Revoked" : share.expires_at && new Date(share.expires_at) < new Date() ? "Expired" : "Active"} · v{share.version_number} · {new Date(share.created_at).toLocaleString("id-ID")}</span>{!share.revoked_at && <button type="button" onClick={() => void revokeShare(share.id)} className="text-destructive underline">Revoke</button>}</div>)}</div>}
            {shareFeedback.length > 0 && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs font-semibold">Client feedback</p>{shareFeedback.map((feedback) => <div key={feedback.id} className="rounded-lg bg-muted/50 p-2 text-[10px]"><b>{feedback.client_name}</b> · {new Date(feedback.created_at).toLocaleString("id-ID")}<p className="mt-1">{feedback.decision || "Comment"}{feedback.comment ? " — " + feedback.comment : ""}</p></div>)}</div>}</section></div>}
          </section>
        </div>
      )}
    </>
  );
}
