import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CloudDownload,
  FileText,
  ImagePlus,
  MapPin,
  MessageSquare,
  Paperclip,
  Send,
  Tag,
  User,
  Upload,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  WorkboardActivity,
  WorkboardClient,
  WorkboardDocument,
  WorkboardProject,
  WorkboardTask,
  WorkboardDesignVersion,
  WorkboardDesignComment,
  WorkboardDesignReview,
} from "./useWorkboardData";
import { supabase } from "@/integrations/supabase/client";

type PinDraft = { x: number; y: number } | null;

export function GraphicWorkspace({
  clients,
  projects,
  tasks,
  documents,
  activities,
  designVersions,
  designComments,
  designReviews,
  selectedClientId,
  onDataChanged,
  selectedTask,
}: {
  clients: WorkboardClient[];
  projects: WorkboardProject[];
  tasks: WorkboardTask[];
  documents: WorkboardDocument[];
  activities: WorkboardActivity[];
  designVersions: WorkboardDesignVersion[];
  designComments: WorkboardDesignComment[];
  designReviews: WorkboardDesignReview[];
  selectedClientId: string;
  onDataChanged: () => Promise<void>;
  selectedTask?: WorkboardTask | null;
}) {
  const client = clients.find((item) => item.id === selectedClientId);
  const project = projects.find((item) => item.client_id === client?.id);
  const clientTasks = tasks.filter((item) => item.client_id === client?.id);
  const clientDocs = documents.filter((item) => item.client_id === client?.id);
  const clientActivities = activities.filter((item) => item.client_id === client?.id).slice(0, 3);
  const versions = useMemo(
    () => designVersions.filter((item) => item.client_id === client?.id),
    [designVersions, client?.id],
  );
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [pinDraft, setPinDraft] = useState<PinDraft>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selectedVersion = versions.find((item) => item.id === selectedVersionId) ?? versions[0];
  const versionComments = designComments.filter((item) => item.version_id === selectedVersion?.id);
  const versionReviews = designReviews.filter((item) => item.version_id === selectedVersion?.id);

  useEffect(() => {
    if (!versions.some((item) => item.id === selectedVersionId)) {
      setSelectedVersionId(versions[0]?.id ?? "");
    }
  }, [versions, selectedVersionId]);

  useEffect(() => {
    let active = true;
    setPreviewUrl("");
    if (selectedVersion?.file_path) {
      void supabase.storage
        .from("client-files")
        .createSignedUrl(selectedVersion.file_path, 3600)
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data?.signedUrl) {
            toast.error(error?.message ?? "Preview desain tidak dapat dibuka");
            return;
          }
          setPreviewUrl(data.signedUrl);
        });
    }
    return () => {
      active = false;
    };
  }, [selectedVersion?.id, selectedVersion?.file_path]);

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage.from("client-files").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "File tidak dapat dibuka");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadDesign(file?: File) {
    if (!file || !client) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Format file harus PNG, JPG, WEBP, atau PDF");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 20 MB");
      return;
    }
    setUploading(true);
    let uploadedPath = "";
    let versionSaved = false;
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) throw userError ?? new Error("Sesi login tidak ditemukan");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      uploadedPath = `${userResult.user.id}/${client.id}/designs/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(uploadedPath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const nextLabel = `V${versions.length + 1}`;
      const { data, error } = await (supabase.from("client_design_versions" as any) as any)
        .insert({
          client_id: client.id,
          title: file.name,
          version_label: nextLabel,
          file_path: uploadedPath,
          file_name: file.name,
          mime_type: file.type,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      versionSaved = true;
      setSelectedVersionId(data.id);
      await onDataChanged();
      setPinDraft(null);
      toast.success(`Desain ${nextLabel} tersimpan permanen`);
    } catch (error) {
      if (uploadedPath && !versionSaved)
        await supabase.storage.from("client-files").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Upload desain gagal");
    } finally {
      setUploading(false);
    }
  }

  async function sendComment() {
    const text = commentDraft.trim();
    if (!text || !client || !selectedVersion) return;
    setSaving(true);
    const { error } = await (supabase.from("client_design_comments" as any) as any).insert({
      client_id: client.id,
      version_id: selectedVersion.id,
      comment: text,
      x: pinDraft?.x ?? null,
      y: pinDraft?.y ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommentDraft("");
    setPinDraft(null);
    await onDataChanged();
    toast.success("Komentar dan pinpoint tersimpan");
  }

  async function recordDecision(decision: "approved" | "revision") {
    if (!client || !selectedVersion) return;
    const note = reviewNote.trim();
    if (decision === "revision" && !note) {
      toast.error("Tulis catatan revisi terlebih dahulu");
      return;
    }
    setSaving(true);
    const { error: updateError } = await (supabase.from("client_design_versions" as any) as any)
      .update({ status: decision, reviewed_at: new Date().toISOString() })
      .eq("id", selectedVersion.id);
    if (updateError) {
      setSaving(false);
      toast.error(updateError.message);
      return;
    }
    const { error: historyError } = await (
      supabase.from("client_design_reviews" as any) as any
    ).insert({
      client_id: client.id,
      version_id: selectedVersion.id,
      decision,
      note: note || null,
    });
    if (historyError) {
      // Roll back the current status if the permanent review-history insert failed.
      await (supabase.from("client_design_versions" as any) as any)
        .update({ status: selectedVersion.status, reviewed_at: selectedVersion.reviewed_at })
        .eq("id", selectedVersion.id);
      setSaving(false);
      toast.error(historyError.message);
      return;
    }
    setReviewNote("");
    setSaving(false);
    await onDataChanged();
    toast.success(
      decision === "approved"
        ? "Approval tersimpan permanen"
        : "Permintaan revisi tersimpan permanen",
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-soft">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-md bg-wb-blue-strong text-[10px] font-bold text-brand-contrast">
            GW
          </span>
          <h2 className="text-sm font-bold text-wb-ink">Graphic Workspace</h2>
        </div>
        <Bell className="size-4 text-muted-foreground" />
      </header>

      {selectedTask && (
        <section id="graphic-task-detail" className="border-b border-border bg-wb-blue/10 p-4 sm:p-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-wb-blue-strong px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-contrast">Task terpilih</span>
                {selectedTask.id.startsWith("demo-task-") && <span className="rounded-full border border-wb-blue-strong/30 px-2.5 py-1 text-[9px] font-semibold text-wb-blue-strong">Data contoh · belum tersimpan</span>}
              </div>
              <h3 className="text-base font-extrabold text-wb-ink">{selectedTask.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{clients.find((item) => item.id === selectedTask.client_id)?.name ?? "Client tidak ditemukan"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-wb-ink">{selectedTask.description || "Belum ada deskripsi task."}</p>
            </div>
            <dl className="grid min-w-[220px] grid-cols-2 gap-2 text-xs sm:min-w-[280px]">
              <div className="rounded-lg border border-border bg-card p-2"><dt className="text-muted-foreground">Status</dt><dd className="mt-1 font-bold text-wb-ink">{selectedTask.status}</dd></div>
              <div className="rounded-lg border border-border bg-card p-2"><dt className="text-muted-foreground">Prioritas</dt><dd className="mt-1 font-bold text-wb-ink">{selectedTask.priority}</dd></div>
              <div className="rounded-lg border border-border bg-card p-2"><dt className="text-muted-foreground">Deadline</dt><dd className="mt-1 font-bold text-wb-ink">{selectedTask.due_date ? new Date(selectedTask.due_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Belum ditentukan"}</dd></div>
              <div className="rounded-lg border border-border bg-card p-2"><dt className="text-muted-foreground">Penanggung jawab</dt><dd className="mt-1 font-bold text-wb-ink">{selectedTask.assignee || "Belum ditentukan"}</dd></div>
            </dl>
          </div>
        </section>
      )}

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(200px,0.95fr)_minmax(0,1.85fr)_minmax(200px,0.85fr)]">
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-[13px] font-bold leading-snug text-wb-ink">
              {client?.legal_name || client?.name || "Pilih client"} — Project &amp; Account
              Overview
            </h3>
            <dl className="mt-4 space-y-3 text-[11px]">
              <Row icon={<Clock />} label="Created time">
                <span className="font-semibold text-wb-ink">
                  {project
                    ? new Date(project.created_at).toLocaleString("id-ID")
                    : client
                      ? new Date(client.created_at).toLocaleDateString("id-ID")
                      : "—"}
                </span>
              </Row>
              <Row icon={<Calendar />} label="Project">
                <span className="font-semibold text-wb-ink">
                  {project?.name ?? "Belum ada proyek"}
                </span>
              </Row>
              <Row icon={<Tag />} label="Status">
                <span className="font-semibold text-wb-ink">
                  {project?.status ?? client?.client_status ?? "—"}
                </span>
              </Row>
              <Row icon={<CheckCircle2 />} label="Open Tasks">
                <span className="font-semibold text-wb-ink">
                  {
                    clientTasks.filter((task) => !["finished", "cancel"].includes(task.status))
                      .length
                  }{" "}
                  task
                </span>
              </Row>
              <Row icon={<Tag />} label="Industri">
                <span className="font-semibold text-wb-ink">{client?.industry ?? "—"}</span>
              </Row>
              <Row icon={<User />} label="PIC">
                <span className="font-semibold text-wb-ink">{client?.contact_name ?? "—"}</span>
              </Row>
            </dl>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-semibold text-wb-ink">
              <FileText className="size-3.5" />
              Client Brief &amp; Scope
            </div>
            <div className="space-y-2 p-3">
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                {client?.company_profile || client?.description || "Profil client belum diisi."}
              </p>
              <div className="border-l-2 border-wb-blue pl-2 text-[11px] leading-relaxed text-muted-foreground">
                <b className="text-wb-ink">Scope of Work:</b>
                <p className="whitespace-pre-wrap">
                  {client?.scope_of_work || project?.description || "Belum ada scope of work."}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold text-wb-ink">
              <Paperclip className="size-3.5 text-wb-blue-strong" />
              Dokumen Client
            </h4>
            <div className="mt-3 space-y-2">
              {clientDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => void openDocument(doc.file_path)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:bg-muted"
                >
                  <FileText className="size-4 text-wb-blue-strong" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-semibold text-wb-ink">
                      {doc.title || doc.file_name}
                    </span>
                    <span className="block text-[9px] text-muted-foreground">
                      {doc.document_type} · {doc.file_name}
                    </span>
                  </span>
                  <CloudDownload className="size-3.5 text-muted-foreground" />
                </button>
              ))}
              {!clientDocs.length && (
                <p className="rounded-lg border border-dashed p-3 text-center text-[10px] text-muted-foreground">
                  Belum ada dokumen untuk client ini.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="text-[11px] font-semibold text-wb-ink">Aktivitas Terbaru</h4>
            <div className="mt-2 space-y-2">
              {clientActivities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-wb-blue pl-2">
                  <p className="text-[10px] font-semibold text-wb-ink">{activity.title}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(activity.occurred_at).toLocaleString("id-ID")} · {activity.event_type}
                  </p>
                </div>
              ))}
              {!clientActivities.length && (
                <p className="text-[9px] text-muted-foreground">Belum ada aktivitas client.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[12px] font-bold text-wb-ink">
              Design Preview &amp; Version History
            </h3>
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-wb-blue-strong px-3 py-1.5 text-[10px] font-semibold text-brand-contrast",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="size-3.5" />
              {uploading ? "Mengunggah…" : "Upload desain"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                disabled={uploading || !client}
                onChange={(event) => {
                  void uploadDesign(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedVersionId(version.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[10px] font-semibold",
                  selectedVersion?.id === version.id
                    ? "border-wb-blue-strong bg-wb-blue/20 text-wb-ink"
                    : "border-border text-muted-foreground",
                )}
              >
                {version.version_label} ·{" "}
                {version.status === "approved"
                  ? "Approved"
                  : version.status === "revision"
                    ? "Revisi"
                    : "Pending"}
              </button>
            ))}
            {!versions.length && (
              <p className="text-[10px] text-muted-foreground">
                Belum ada versi desain. Upload file pertama untuk memulai riwayat.
              </p>
            )}
          </div>
          <div className="mt-3 flex min-h-[420px] flex-1 flex-col rounded-lg bg-muted/60 p-2">
            {selectedVersion && previewUrl ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-muted-foreground">
                  <span>
                    {selectedVersion.file_name} ·{" "}
                    {new Date(selectedVersion.created_at).toLocaleString("id-ID")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    Klik gambar untuk menaruh pinpoint
                  </span>
                </div>
                {selectedVersion.mime_type === "application/pdf" ? (
                  <iframe
                    title={selectedVersion.file_name}
                    src={previewUrl}
                    className="min-h-[390px] w-full flex-1 rounded bg-white"
                  />
                ) : (
                  <div
                    className="relative mx-auto mt-2 w-full max-w-3xl cursor-crosshair"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setPinDraft({
                        x: Math.round(((event.clientX - rect.left) / rect.width) * 10000) / 100,
                        y: Math.round(((event.clientY - rect.top) / rect.height) * 10000) / 100,
                      });
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt={selectedVersion.file_name}
                      className="block max-h-[560px] w-full object-contain shadow-card"
                    />
                    {versionComments
                      .filter((comment) => comment.x !== null && comment.y !== null)
                      .map((comment, index) => (
                        <span
                          key={comment.id}
                          title={comment.comment}
                          style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                          className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-wb-blue-strong text-[9px] font-bold text-white shadow"
                        >
                          {index + 1}
                        </span>
                      ))}
                    {pinDraft && (
                      <span
                        style={{ left: `${pinDraft.x}%`, top: `${pinDraft.y}%` }}
                        className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-wb-orange text-[9px] font-bold text-white shadow"
                      >
                        +
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <ImagePlus className="size-10 opacity-40" />
                <p className="text-[11px] font-semibold">
                  {versions.length
                    ? "Memuat preview desain…"
                    : "Preview desain akan tampil di sini"}
                </p>
                <p className="max-w-xs text-[9px]">
                  Upload PNG, JPG, WEBP, atau PDF. Setiap upload menjadi versi baru yang tersimpan
                  di Storage privat.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="text-[11px] font-semibold text-wb-ink">Approval &amp; Revisi</h4>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Status versi aktif: <b>{selectedVersion?.status ?? "Belum ada desain"}</b>
            </p>
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Catatan approval / alasan revisi…"
              rows={3}
              className="mt-2 w-full rounded-md border border-border bg-muted/30 p-2 text-[10px] text-wb-ink outline-none"
              disabled={!selectedVersion || saving}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!selectedVersion || saving}
                onClick={() => void recordDecision("approved")}
                className="flex items-center justify-center gap-1 rounded-md bg-wb-green-strong px-2 py-2 text-[10px] font-semibold text-brand-contrast disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Approve
              </button>
              <button
                type="button"
                disabled={!selectedVersion || saving}
                onClick={() => void recordDecision("revision")}
                className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-[10px] font-semibold text-wb-ink disabled:opacity-50"
              >
                <MessageSquare className="size-3.5" />
                Revisi
              </button>
            </div>
            <div className="mt-3 border-t border-border pt-2">
              <h5 className="flex items-center gap-1 text-[10px] font-semibold text-wb-ink">
                <History className="size-3" />
                Riwayat keputusan
              </h5>
              <div className="mt-2 space-y-2">
                {versionReviews.map((review) => (
                  <div key={review.id} className="rounded-md bg-muted/50 p-2">
                    <p className="text-[9px] font-semibold text-wb-ink">
                      {review.decision === "approved" ? "Disetujui" : "Diminta revisi"} ·{" "}
                      {new Date(review.created_at).toLocaleString("id-ID")}
                    </p>
                    {review.note && (
                      <p className="mt-1 whitespace-pre-wrap text-[9px] text-muted-foreground">
                        {review.note}
                      </p>
                    )}
                  </div>
                ))}
                {!versionReviews.length && (
                  <p className="text-[9px] text-muted-foreground">Belum ada keputusan.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <h4 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11px] font-semibold text-wb-ink">
              <MessageSquare className="size-3.5 text-wb-blue-strong" />
              Komentar &amp; Pinpoint
            </h4>
            <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
              {versionComments.map((comment, index) => (
                <div key={comment.id} className="rounded-lg border border-border bg-muted/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-wb-ink">
                      {comment.x !== null && comment.y !== null
                        ? `Pinpoint #${index + 1}`
                        : "Komentar umum"}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[9.5px] leading-relaxed text-wb-ink">
                    {comment.comment}
                  </p>
                  {comment.x !== null && comment.y !== null && (
                    <p className="mt-1 text-[8px] text-muted-foreground">
                      Posisi {comment.x.toFixed(1)}%, {comment.y.toFixed(1)}%
                    </p>
                  )}
                </div>
              ))}
              {!versionComments.length && (
                <p className="py-8 text-center text-[10px] text-muted-foreground">
                  Belum ada komentar untuk versi ini.
                </p>
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendComment();
              }}
              className="border-t border-border p-2"
            >
              {pinDraft && (
                <div className="mb-2 flex items-center justify-between rounded bg-wb-orange/10 px-2 py-1 text-[9px] text-wb-ink">
                  <span>
                    Pinpoint baru · {pinDraft.x.toFixed(1)}%, {pinDraft.y.toFixed(1)}%
                  </span>
                  <button type="button" onClick={() => setPinDraft(null)} className="font-bold">
                    Batal
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5">
                <input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder={pinDraft ? "Tulis catatan pinpoint…" : "Tulis komentar versi ini…"}
                  disabled={!selectedVersion || saving}
                  className="min-w-0 flex-1 bg-transparent text-[10px] text-wb-ink outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  aria-label="Kirim komentar"
                  disabled={!selectedVersion || !commentDraft.trim() || saving}
                  className="text-wb-blue-strong disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[78px_1fr] items-start gap-2">
      <dt className="flex items-start gap-1.5 text-muted-foreground">
        <span className="mt-px flex shrink-0 items-center justify-center [&_svg]:size-3">
          {icon}
        </span>
        <span className="leading-tight">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
