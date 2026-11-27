import { useEffect, useMemo, useState } from "react";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { statusMeta, taskPriorities } from "./status";
import { TaskBriefWorkspace } from "./TaskBriefWorkspace";
import { TaskDeliverableWorkspace } from "./TaskDeliverableWorkspace";

type PinDraft = { x: number; y: number } | null;

/** Titik status versi desain: semantik yang sama dengan papan (hijau = disetujui, ungu = review). */
const versionDot: Record<string, string> = {
  approved: "bg-success",
  revision: "bg-wb-purple",
  pending: "bg-muted-foreground/50",
};
const versionLabel: Record<string, string> = {
  approved: "Approved",
  revision: "Revisi",
  pending: "Pending",
};

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
  // selectedTask ikut dependency: tanpa itu daftar versi tidak berganti saat task lain dipilih.
  const versions = useMemo(
    () =>
      designVersions.filter(
        (item) =>
          item.client_id === client?.id && (selectedTask ? item.task_id === selectedTask.id : true),
      ),
    [designVersions, client?.id, selectedTask?.id],
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
          task_id: selectedTask?.id ?? null,
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

  const isDesign = !selectedTask || selectedTask.task_type === "design";

  return (
    // Satu kartu (L1). Di dalamnya TIDAK ada kartu lagi: tiga kolom dipisah garis tipis,
    // bagian di tiap kolom dipisah divide-y.
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">Graphic Workspace</h2>
        {client && <span className="truncate text-xs text-muted-foreground">{client.name}</span>}
      </header>

      {selectedTask && (
        <section
          id="graphic-task-detail"
          className="border-b border-border bg-subtle p-4 sm:p-5"
          aria-live="polite"
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Task terpilih</Badge>
                {selectedTask.id.startsWith("demo-task-") && (
                  <Badge variant="warning">Data contoh · belum tersimpan</Badge>
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground">{selectedTask.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {clients.find((item) => item.id === selectedTask.client_id)?.name ??
                  "Client tidak ditemukan"}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {selectedTask.description || "Belum ada deskripsi task."}
              </p>
            </div>
            {/* Empat fakta task: teks polos dua kolom (sebelumnya empat kotak bergaris) */}
            <dl className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:w-72">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {statusMeta(selectedTask.status)?.title ?? selectedTask.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Prioritas</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {taskPriorities.find((p) => p.id === selectedTask.priority)?.label ??
                    selectedTask.priority}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deadline</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {selectedTask.due_date
                    ? new Date(selectedTask.due_date + "T00:00:00").toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Belum ditentukan"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Penanggung jawab</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {selectedTask.assignee || "Belum ditentukan"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      <div className="grid min-w-0 divide-y divide-border xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.85fr)_minmax(0,0.85fr)] xl:divide-x xl:divide-y-0">
        {/* ───────── Kolom kiri: overview, brief, dokumen, aktivitas ───────── */}
        <div className="min-w-0 divide-y divide-border">
          <section className="p-4">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {client?.legal_name || client?.name || "Pilih client"} — Project &amp; Account
              Overview
            </h3>
            <dl className="mt-4 space-y-3">
              <Row icon={<Clock />} label="Created time">
                {project
                  ? new Date(project.created_at).toLocaleString("id-ID")
                  : client
                    ? new Date(client.created_at).toLocaleDateString("id-ID")
                    : "—"}
              </Row>
              <Row icon={<Calendar />} label="Project">
                {project?.name ?? "Belum ada proyek"}
              </Row>
              <Row icon={<Tag />} label="Status">
                {project?.status ?? client?.client_status ?? "—"}
              </Row>
              <Row icon={<CheckCircle2 />} label="Open tasks">
                {clientTasks.filter((task) => !["finished", "cancel"].includes(task.status)).length}{" "}
                task
              </Row>
              <Row icon={<Tag />} label="Industri">
                {client?.industry ?? "—"}
              </Row>
              <Row icon={<User />} label="PIC">
                {client?.contact_name ?? "—"}
              </Row>
            </dl>
          </section>

          <div className="p-4">
            <TaskBriefWorkspace
              client={client}
              project={project}
              task={selectedTask}
              documents={clientDocs}
              onDataChanged={onDataChanged}
            />
          </div>

          <section className="p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Paperclip className="size-4 text-muted-foreground" />
              Dokumen client
            </h4>
            <div className="mt-2 -mx-2">
              {clientDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => void openDocument(doc.file_path)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {doc.title || doc.file_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {doc.document_type} · {doc.file_name}
                    </span>
                  </span>
                  <CloudDownload className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            {!clientDocs.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                Belum ada dokumen untuk client ini.
              </p>
            )}
          </section>

          <section className="p-4">
            <h4 className="text-sm font-semibold text-foreground">Aktivitas terbaru</h4>
            <div className="mt-2 space-y-2.5">
              {clientActivities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-border-strong pl-2.5">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.occurred_at).toLocaleString("id-ID")} · {activity.event_type}
                  </p>
                </div>
              ))}
              {!clientActivities.length && (
                <p className="text-xs text-muted-foreground">Belum ada aktivitas client.</p>
              )}
            </div>
          </section>
        </div>

        {isDesign ? (
          <>
            {/* ───────── Kolom tengah: preview & riwayat versi ───────── */}
            <div className="flex min-w-0 flex-col p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Design preview &amp; version history
                </h3>
                <label
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                    (uploading || !client) && "pointer-events-none opacity-60",
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
                    aria-pressed={selectedVersion?.id === version.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedVersion?.id === version.id
                        ? "border-primary bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <i
                      className={cn("size-2 rounded-full", versionDot[version.status] ?? versionDot.pending)}
                    />
                    {version.version_label} · {versionLabel[version.status] ?? "Pending"}
                  </button>
                ))}
                {!versions.length && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada versi desain. Upload file pertama untuk memulai riwayat.
                  </p>
                )}
              </div>
              <div className="mt-3 flex min-h-[420px] flex-1 flex-col rounded-lg bg-muted/60 p-2.5">
                {selectedVersion && previewUrl ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="min-w-0 truncate">
                        {selectedVersion.file_name} ·{" "}
                        {new Date(selectedVersion.created_at).toLocaleString("id-ID")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
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
                          className="block max-h-[560px] w-full object-contain shadow-soft ring-1 ring-border"
                        />
                        {versionComments
                          .filter((comment) => comment.x !== null && comment.y !== null)
                          .map((comment, index) => (
                            <span
                              key={comment.id}
                              title={comment.comment}
                              style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                              className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-semibold text-primary-foreground shadow"
                            >
                              {index + 1}
                            </span>
                          ))}
                        {pinDraft && (
                          <span
                            style={{ left: `${pinDraft.x}%`, top: `${pinDraft.y}%` }}
                            className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-ai text-xs font-semibold text-foreground shadow"
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
                    <p className="text-sm font-medium">
                      {versions.length
                        ? "Memuat preview desain…"
                        : "Preview desain akan tampil di sini"}
                    </p>
                    <p className="max-w-xs text-xs">
                      Upload PNG, JPG, WEBP, atau PDF. Setiap upload menjadi versi baru yang
                      tersimpan di Storage privat.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ───────── Kolom kanan: approval & komentar ───────── */}
            <div className="flex min-w-0 flex-col divide-y divide-border">
              <section className="p-4">
                <h4 className="text-sm font-semibold text-foreground">Approval &amp; revisi</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status versi aktif:{" "}
                  <b className="font-semibold text-foreground">
                    {selectedVersion
                      ? (versionLabel[selectedVersion.status] ?? selectedVersion.status)
                      : "Belum ada desain"}
                  </b>
                </p>
                <Textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Catatan approval / alasan revisi…"
                  rows={3}
                  className="mt-2 text-sm"
                  disabled={!selectedVersion || saving}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedVersion || saving}
                    onClick={() => void recordDecision("approved")}
                    className="gap-1.5 bg-success text-brand-contrast hover:bg-success/90"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!selectedVersion || saving}
                    onClick={() => void recordDecision("revision")}
                    className="gap-1.5"
                  >
                    <MessageSquare className="size-3.5" />
                    Revisi
                  </Button>
                </div>
                <div className="mt-4">
                  <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <History className="size-3.5 text-muted-foreground" />
                    Riwayat keputusan
                  </h5>
                  {/* Baris dipisah garis, bukan kotak abu-abu per keputusan */}
                  <div className="mt-1 divide-y divide-border">
                    {versionReviews.map((review) => (
                      <div key={review.id} className="py-2">
                        <p className="text-xs font-medium text-foreground">
                          {review.decision === "approved" ? "Disetujui" : "Diminta revisi"} ·{" "}
                          <span className="font-normal text-muted-foreground">
                            {new Date(review.created_at).toLocaleString("id-ID")}
                          </span>
                        </p>
                        {review.note && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                            {review.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {!versionReviews.length && (
                    <p className="mt-1 text-xs text-muted-foreground">Belum ada keputusan.</p>
                  )}
                </div>
              </section>

              <section className="flex min-h-[360px] flex-1 flex-col">
                <h4 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Komentar &amp; pinpoint
                </h4>
                <div className="flex-1 divide-y divide-border overflow-y-auto px-4">
                  {versionComments.map((comment, index) => (
                    <div key={comment.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {comment.x !== null && comment.y !== null
                            ? `Pinpoint #${index + 1}`
                            : "Komentar umum"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {comment.comment}
                      </p>
                      {comment.x !== null && comment.y !== null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Posisi {comment.x.toFixed(1)}%, {comment.y.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  ))}
                  {!versionComments.length && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada komentar untuk versi ini.
                    </p>
                  )}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendComment();
                  }}
                  className="border-t border-border p-3"
                >
                  {pinDraft && (
                    <div className="mb-2 flex items-center justify-between rounded-md bg-ai-soft px-2.5 py-1.5 text-xs text-ai-foreground">
                      <span>
                        Pinpoint baru · {pinDraft.x.toFixed(1)}%, {pinDraft.y.toFixed(1)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPinDraft(null)}
                        className="font-semibold hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder={pinDraft ? "Tulis catatan pinpoint…" : "Tulis komentar versi ini…"}
                      disabled={!selectedVersion || saving}
                      className="h-9 text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon-sm"
                      aria-label="Kirim komentar"
                      disabled={!selectedVersion || !commentDraft.trim() || saving}
                    >
                      <Send />
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </>
        ) : (
          // Task non-desain: deliverable memakai dua kolom (sebelumnya kolom ketiga dibiarkan kosong)
          <div className="min-w-0 p-4 xl:col-span-2">
            <TaskDeliverableWorkspace task={selectedTask} />
          </div>
        )}
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
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-2 text-sm">
      <dt className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <span className="mt-px flex shrink-0 items-center justify-center [&_svg]:size-3.5">
          {icon}
        </span>
        <span className="leading-tight">{label}</span>
      </dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{children}</dd>
    </div>
  );
}
