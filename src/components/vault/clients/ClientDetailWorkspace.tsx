import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownToDot,
  BarChart2,
  Bell,
  Bold,
  BrainCircuit,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardList,
  Clock,
  CloudUpload,
  Copy,
  Download,
  DownloadCloud,
  Edit3,
  Eye,
  FileIcon,
  FileText,
  FileUp,
  FolderOpen,
  History,
  Inbox,
  Info,
  Instagram,
  Italic,
  Kanban,
  KanbanSquare,
  Key,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageSquareDashed,
  Mic,
  Palette,
  Paperclip,
  Plus,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Tag,
  Target,
  Trash2,
  Underline,
  Upload,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientData } from "./ClientDialog";

type DBRow = Record<string, any>;

export type WorkboardTask = {
  id: string;
  judul: string;
  clientProyek: string;
  ringkasan: string;
  spesifikasi: string;
  checklist: Array<{ text: string; note?: string; done: boolean }>;
  deadline: string;
  deadlineDisplay: string;
  prioritas: string;
  prioritasBadge: string;
  pic: string;
  perluKonfirmasi: string;
};

export function ClientDetailWorkspace({
  client,
  onBack,
  onEdit,
}: {
  client: ClientData & {
    id: string;
    brandProfile?: {
      primary_color?: string;
      secondary_color?: string;
      tone_of_voice?: string | null;
      company_overview?: string | null;
      pain_points?: string | null;
      agency_goals?: string | null;
      do_rules?: string | null;
      dont_rules?: string | null;
      important_notes?: string | null;
      vault_notes?: string | null;
      tags?: string[];
      service_priority?: string;
    } | null;
  };
  onBack: () => void;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "timeline" | "assets" | "documents">(
    "profile",
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Timeline Form State
  const [judul, setJudul] = useState("");
  const [clientProyek, setClientProyek] = useState(client.name);
  const [ringkasan, setRingkasan] = useState("");
  const [spesifikasi, setSpesifikasi] = useState("");
  const [checklist, setChecklist] = useState<Array<{ text: string; note?: string; done: boolean }>>([]);
  const [deadline, setDeadline] = useState("");
  const [prioritas, setPrioritas] = useState("Standard");
  const [pic, setPic] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  // Profile AI Builder & Interactive State
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [aiTab, setAITab] = useState<"upload" | "link" | "social" | "prompt">("upload");
  const [brandSourceUrl, setBrandSourceUrl] = useState("");
  const [brandSourceSocial, setBrandSourceSocial] = useState("");
  const [brandSourcePrompt, setBrandSourcePrompt] = useState("");
  const [brandSourceFile, setBrandSourceFile] = useState<File | null>(null);
  const [catatanPentingText, setCatatanPentingText] = useState("");

  // Digital Assets & Kredensial Form State
  const [masterEmail, setMasterEmail] = useState("");
  const [newAssetPlatform, setNewAssetPlatform] = useState("");
  const [newAssetUser, setNewAssetUser] = useState("");
  const [newAssetNote, setNewAssetNote] = useState("");
  const [vaultNote, setVaultNote] = useState(
    "Catatan instruksi khusus terkait login, prosedur OTP, peringatan masa aktif hosting/domain, atau struktur parent-child account...",
  );

  const queryKey = ["client-workspace-detail", client.id];

  useEffect(() => {
    let active = true;
    if (!client.logoPath) {
      setLogoUrl("");
      return () => { active = false; };
    }
    if (client.logoPath.startsWith("http")) {
      setLogoUrl(client.logoPath);
      return () => { active = false; };
    }
    void supabase.storage.from("client-files").createSignedUrl(client.logoPath, 3600)
      .then(({ data, error }) => {
        if (active) setLogoUrl(error ? "" : data?.signedUrl ?? "");
      });
    return () => { active = false; };
  }, [client.logoPath]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [eventsRes, assetsRes, docsRes, tasksRes, brandProfileRes, brandAssetsRes] = await Promise.all([
        supabase
          .from("client_timeline_events")
          .select("*")
          .eq("client_id", client.id)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("client_digital_assets")
          .select("*")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_documents")
          .select("*")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_tasks")
          .select("*")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        (supabase.from("client_brand_profiles" as any) as any)
          .select("*")
          .eq("client_id", client.id)
          .maybeSingle(),
        supabase.from("client_brand_assets").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      ]);

      const queryError = eventsRes.error || assetsRes.error || docsRes.error || tasksRes.error || brandProfileRes.error || brandAssetsRes.error;
      if (queryError) throw new Error(queryError.message || "Gagal memuat workspace client.");

      const events: DBRow[] = eventsRes.data ?? [];
      const assets: DBRow[] = assetsRes.data ?? [];
      const docs: DBRow[] = docsRes.data ?? [];
      const tasks: DBRow[] = tasksRes.data ?? [];

      const { data: authData } = await supabase.auth.getUser();

      return {
        events,
        assets,
        docs,
        tasks,
        brandProfile: brandProfileRes.data ?? null,
        brandAssets: brandAssetsRes.data ?? [],
        userId: authData.user?.id ?? "",
      };
    },
  });

  useEffect(() => {
    const tables = [
      "clients",
      "client_brand_profiles",
      "client_tasks",
      "client_documents",
      "client_digital_assets",
      "client_timeline_events",
      "client_design_versions",
      "client_design_comments",
      "client_design_reviews",
    ];
    let active = true;
    let channel = supabase.channel(`client-detail-live-${client.id}`);
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `client_id=eq.${client.id}` },
        () => {
          if (active) {
            void qc.invalidateQueries({ queryKey });
            void qc.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [client.id, qc]);

  const dbData = query.data;

  // Initialize master email asset fields if present
  useEffect(() => {
    if (dbData?.assets) {
      const masterAsset = dbData.assets.find(
        (a) => a.asset_type === "email" || a.asset_name?.includes("Master Email"),
      );
      if (masterAsset) {
        setMasterEmail(masterAsset.username || "");
      }
    }
  }, [dbData]);

  // Filtered workboard tasks inside modal
  const filteredWorkboardTasks = useMemo<WorkboardTask[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    return (dbData?.tasks ?? [])
      .map((task: DBRow) => {
        const priority = String(task.priority || "medium");
        const deadline = task.due_date ? `${task.due_date}T00:00` : "";
        return {
          id: task.id,
          judul: task.title,
          clientProyek: client.name,
          ringkasan: task.description || "",
          spesifikasi: "",
          checklist: [],
          deadline,
          deadlineDisplay: task.due_date
            ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString("id-ID")
            : "Tanpa deadline",
          prioritas: priority,
          prioritasBadge: priority === "urgent" || priority === "high"
            ? "bg-rose-100 text-rose-700 border-rose-200"
            : "bg-slate-100 text-slate-700 border-slate-200",
          pic: task.assignee || "",
          perluKonfirmasi: "",
        };
      })
      .filter((task: WorkboardTask) =>
        !q || [task.judul, task.clientProyek, task.pic, task.id]
          .some((value) => value.toLowerCase().includes(q)),
      );
  }, [dbData?.tasks, searchQuery, client.name]);

  // Apply a Workboard Task to form
  const applyWorkboardTask = (task: WorkboardTask) => {
    setJudul(task.judul);
    setClientProyek(task.clientProyek);
    setRingkasan(task.ringkasan);
    setSpesifikasi(task.spesifikasi);
    setChecklist(JSON.parse(JSON.stringify(task.checklist || [])));
    if (task.deadline) setDeadline(task.deadline);
    if (task.prioritas) setPrioritas(task.prioritas);
    if (task.pic) setPic(task.pic);
    setKonfirmasi(task.perluKonfirmasi || "");

    setIsModalOpen(false);
    toast.success(`Format task "${task.judul}" berhasil diimpor ke form!`);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, labelName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Berhasil menyalin ${labelName} ke clipboard!`);
    });
  };

  // Toggle checklist item
  const toggleChecklistDone = (index: number) => {
    setChecklist((current) =>
      current.map((item, i) => (i === index ? { ...item, done: !item.done } : item)),
    );
  };

  const removeChecklistItem = (index: number) => {
    setChecklist((current) => current.filter((_, i) => i !== index));
  };

  const addChecklistItem = () => {
    const text = prompt("Masukkan poin instruksi revisi:");
    if (text && text.trim()) {
      const note = prompt("Sumber/referensi (opsional, contoh: WA 10:42 / Pin 3):") || "";
      setChecklist((current) => [...current, { text: text.trim(), note: note.trim(), done: false }]);
      toast.success("Poin checklist revisi ditambahkan.");
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const valid = newFiles.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" melebihi batas maksimal 5MB!`);
        return false;
      }
      return true;
    });
    setAttachedFiles((prev) => [...prev, ...valid]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBrandSource = async () => {
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sesi login tidak ditemukan.");
      const userId = authData.user.id;
      let payload: DBRow;
      if (aiTab === "upload") {
        if (!brandSourceFile) throw new Error("Pilih file brand guideline terlebih dahulu.");
        const safeName = brandSourceFile.name.replace(/[^\\w.-]/g, "-");
        uploadedPath = userId + "/" + client.id + "/brand/" + crypto.randomUUID() + "-" + safeName;
        const upload = await supabase.storage.from("client-files").upload(uploadedPath, brandSourceFile, { contentType: brandSourceFile.type, upsert: false });
        if (upload.error) throw upload.error;
        payload = { user_id: userId, client_id: client.id, asset_type: "guideline", name: brandSourceFile.name, file_path: uploadedPath, notes: "Uploaded brand source" };
      } else if (aiTab === "link") {
        if (!brandSourceUrl.trim()) throw new Error("Masukkan URL sumber brand.");
        payload = { user_id: userId, client_id: client.id, asset_type: "other", name: "Website / Brand URL", value: brandSourceUrl.trim() };
      } else if (aiTab === "social") {
        if (!brandSourceSocial.trim()) throw new Error("Masukkan akun media sosial client.");
        payload = { user_id: userId, client_id: client.id, asset_type: "other", name: "Social Media Profile", value: brandSourceSocial.trim() };
      } else {
        if (!brandSourcePrompt.trim()) throw new Error("Masukkan instruksi profil terlebih dahulu.");
        payload = { user_id: userId, client_id: client.id, asset_type: "guideline", name: "Custom Profile Prompt", value: brandSourcePrompt.trim() };
      }
      const { error } = await supabase.from("client_brand_assets").insert(payload);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey });
      setBrandSourceUrl(""); setBrandSourceSocial(""); setBrandSourcePrompt(""); setBrandSourceFile(null);
      toast.success("Sumber profil berhasil disimpan ke database.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("client-files").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan sumber profil.");
    } finally { setBusy(false); }
  };
  const handleTimelineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      toast.error("Harap isi judul brief / task.");
      return;
    }

    setBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

      const uploadedPaths: string[] = [];
      for (const file of attachedFiles) {
        if (userId) {
          const safeName = file.name.replace(/[^\w.-]/g, "-");
          const path = `${userId}/${client.id}/timeline/${crypto.randomUUID()}-${safeName}`;
          const { error } = await supabase.storage.from("client-files").upload(path, file);
          if (error) throw new Error(`Upload lampiran ${file.name} gagal: ${error.message}`);
          uploadedPaths.push(path);
        }
      }

      const { error } = await supabase.from("client_timeline_events").insert({
        client_id: client.id,
        user_id: userId,
        event_type: "task",
        title: judul.trim(),
        description: ringkasan.trim(),
        occurred_at: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
        metadata: {
          clientProyek,
          spesifikasi,
          checklist,
          prioritas,
          pic,
          konfirmasi,
          filePaths: uploadedPaths,
        },
      });

      if (error) {
        if (uploadedPaths.length) await supabase.storage.from("client-files").remove(uploadedPaths);
        throw error;
      }

      await qc.invalidateQueries({ queryKey });
      toast.success(`Brief "${judul}" berhasil ditambahkan ke Timeline!`);

      setJudul("");
      setRingkasan("");
      setSpesifikasi("");
      setChecklist([]);
      setKonfirmasi("");
      setAttachedFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan ke timeline.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setJudul("");
    setClientProyek(`${client.name} · Sub-proyek Utama`);
    setRingkasan("");
    setSpesifikasi("");
    setChecklist([]);
    setKonfirmasi("");
    setAttachedFiles([]);
    toast.error("Form telah dikosongkan.");
  };

  // Add new Custom Digital Asset directly into Supabase
  const handleAddDigitalAsset = async () => {
    if (!newAssetPlatform.trim() && !newAssetUser.trim()) {
      toast.error("Isi Platform atau Username aset digital.");
      return;
    }
    setBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

      const { error } = await supabase.from("client_digital_assets").insert({
        client_id: client.id,
        user_id: userId,
        asset_name: newAssetPlatform.trim() || "Aset Digital Klien",
        asset_type: "other",
        platform: newAssetPlatform.trim() || null,
        username: newAssetUser.trim() || null,
        notes: newAssetNote.trim() || null,
      });

      if (error) throw error;

      await qc.invalidateQueries({ queryKey });
      setNewAssetPlatform("");
      setNewAssetUser("");
      setNewAssetNote("");
      toast.success("Aset digital baru berhasil ditambahkan!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan aset digital.");
    } finally {
      setBusy(false);
    }
  };

  // Delete Digital Asset from Supabase
  const handleDeleteDigitalAsset = async (assetId: string) => {
    if (!window.confirm("Hapus aset digital ini?")) return;
    try {
      const { error } = await supabase.from("client_digital_assets").delete().eq("id", assetId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey });
      toast.info("Aset digital berhasil dihapus.");
    } catch (err) {
      toast.error("Gagal menghapus aset digital.");
    }
  };

  // Upload document directly into Supabase
  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (Maks. 10MB).");
      return;
    }

    setBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Sesi login tidak ditemukan.");

      const safeName = file.name.replace(/[^\w.-]/g, "-");
      const path = `${userId}/${client.id}/documents/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("client_documents").insert({
        client_id: client.id,
        user_id: userId,
        title: file.name,
        document_type: "other",
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (dbError) throw dbError;

      await qc.invalidateQueries({ queryKey });
      toast.success("Dokumen berhasil diunggah dan disimpan!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    } finally {
      setBusy(false);
    }
  };

  // Delete document from Supabase
  const handleDeleteDocument = async (docId: string, filePath: string) => {
    if (!window.confirm("Hapus dokumen ini?")) return;
    try {
      await supabase.storage.from("client-files").remove([filePath]);
      const { error } = await supabase.from("client_documents").delete().eq("id", docId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey });
      toast.info("Dokumen berhasil dihapus.");
    } catch (err) {
      toast.error("Gagal menghapus dokumen.");
    }
  };

  const openSignedFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-files")
        .createSignedUrl(filePath, 3600);
      if (error || !data?.signedUrl) throw error || new Error("File tidak ditemukan.");
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      toast.error("Gagal membuka file.");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start bg-[#dce3e8] p-2 text-slate-800 sm:p-5 lg:p-8">
      {/* Modal Impor dari Workboard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-[#003837] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                  <KanbanSquare className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Impor Task dari /workboard
                  </h3>
                  <p className="text-[11px] text-emerald-200/80">
                    Pilih task aktif untuk di-sinkronisasikan ke form agenda &amp; timeline klien
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 text-xs sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari task atau penanggung jawab..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <span className="self-end text-[11px] text-slate-500 sm:self-center">
                Tersambung ke repositori:{" "}
                <strong className="font-semibold text-emerald-700">
                  /workboard/{client.name.toLowerCase().replace(/\s+/g, "-")}
                </strong>
              </span>
            </div>

            {/* List of Workboard Tasks */}
            <div className="max-h-[380px] space-y-3 overflow-y-auto p-4 sm:p-5">
              {filteredWorkboardTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Inbox className="mx-auto mb-2 size-8 text-slate-300" />
                  <p className="text-xs">Tidak ditemukan task workboard yang cocok.</p>
                </div>
              ) : (
                filteredWorkboardTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{task.id}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${task.prioritasBadge}`}
                        >
                          {task.prioritas}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="size-3 text-slate-400" /> {task.deadlineDisplay}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 sm:text-sm">{task.judul}</h4>
                      <p className="text-[11px] font-semibold text-emerald-800">
                        {task.clientProyek}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-slate-500">{task.ringkasan}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="flex size-5 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-white">
                          {task.pic}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600">
                          PIC: {task.pic}
                        </span>
                        {task.perluKonfirmasi && (
                          <span className="max-w-xs truncate rounded bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-800">
                            ⚠️ {task.perluKonfirmasi}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyWorkboardTask(task)}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                    >
                      <Download className="size-3.5" />
                      <span>Terapkan ke Form</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs">
              <p className="text-[11px] text-slate-500">
                Tip: Mengimpor task otomatis mengisi judul, assignee, deadline, dan deskripsi.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-1.5 font-semibold text-slate-600 hover:bg-white transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Unified Container */}
      <div className="w-full max-w-[1400px] overflow-hidden rounded-2xl border border-slate-300 bg-[#f8fafc] shadow-2xl">
        {/* Top Navigation Bar */}
        <header className="flex select-none items-center justify-between bg-[#003837] px-4 py-2.5 text-xs tracking-wide text-white sm:px-6">
          <div className="flex items-center space-x-3 overflow-x-auto">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#ea580c] font-bold text-white shadow-sm">
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <nav className="flex items-center space-x-1">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center space-x-1.5 rounded px-3 py-1.5 text-slate-200 transition hover:bg-[#012a29] hover:text-white"
              >
                <Briefcase className="size-3.5 opacity-80" />
                <span>Companies</span>
              </button>
              <button
                type="button"
                className="flex items-center space-x-1.5 rounded bg-[#012625] px-3 py-1.5 font-medium text-white transition hover:bg-[#022e2d]"
              >
                <LayoutDashboard className="size-3.5 opacity-90" />
                <span>Workspace</span>
              </button>
            </nav>
          </div>
          <div className="flex items-center space-x-3 text-slate-300">
            <button type="button" aria-label="Cari" className="p-1 transition hover:text-white">
              <Search className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative p-1 transition hover:text-white"
            >
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400"></span>
            </button>
            <div className="flex size-7 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-bold text-[#78350f] shadow ring-2 ring-[#003837]">
              BF
            </div>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="space-y-4 p-4 sm:p-6">
          {/* 1. Client Profile Header Card */}
          <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-slate-50 to-transparent opacity-50"></div>

            <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-1.5 rounded border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-50"
                  title="Back to Companies"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="flex items-center space-x-4">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={client.name}
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-[#c9a75d] to-[#a67c27] text-center font-serif text-xs font-bold leading-none text-white">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        {client.name}
                      </h1>
                      <span className="inline-flex items-center space-x-1 rounded border border-[#fde68a] bg-[#fff8eb] px-2 py-0.5 text-[10px] font-medium text-[#d97706]">
                        <span className="size-1.5 rounded-full bg-[#f59e0b]"></span>
                        <span className="capitalize">{client.clientStatus || "Active Partner"}</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {client.legalName || client.name} · {client.industry || "Travel Umrah & Haji"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="relative z-10 mt-5 flex items-center justify-between overflow-x-auto border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center space-x-5" id="tab-nav-container">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center space-x-1.5 pb-1 whitespace-nowrap transition-all ${
                    activeTab === "profile"
                      ? "border-b-2 border-[#003837] font-bold text-[#003837]"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutTemplate className="size-4 text-emerald-600" />
                  <span>Profile Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`flex items-center space-x-1.5 pb-1 whitespace-nowrap transition-all ${
                    activeTab === "timeline"
                      ? "border-b-2 border-[#003837] font-bold text-[#003837]"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity className="size-3.5" />
                  <span>Timeline / Agenda</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("assets")}
                  className={`flex items-center space-x-1.5 pb-1 whitespace-nowrap transition-all ${
                    activeTab === "assets"
                      ? "border-b-2 border-[#003837] font-bold text-[#003837]"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Daftar Aset Digital &amp; Kredensial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center space-x-1.5 pb-1 whitespace-nowrap transition-all ${
                    activeTab === "documents"
                      ? "border-b-2 border-[#003837] font-bold text-[#003837]"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="size-3.5" />
                  <span>Dokumen Pendukung</span>
                </button>
              </div>
            </div>
          </section>

          {/* TAB CONTENT: PROFILE CLIENT */}
          {activeTab === "profile" && (
            <div className="space-y-5 animate-fade-in">
              {dbData?.brandProfile && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Brand Profile Tersimpan</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      Prioritas {dbData.brandProfile.service_priority || "standard"}
                    </span>
                  </div>
                  <div className="mb-4 flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5"><i className="size-4 rounded border" style={{ backgroundColor: dbData.brandProfile.primary_color }} /> Warna utama</span>
                    <span className="flex items-center gap-1.5"><i className="size-4 rounded border" style={{ backgroundColor: dbData.brandProfile.secondary_color }} /> Warna sekunder</span>
                    {dbData.brandProfile.tags?.map((tag: string) => <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{tag}</span>)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Overview", dbData.brandProfile.company_overview],
                      ["Tone of Voice", dbData.brandProfile.tone_of_voice],
                      ["Pain Points", dbData.brandProfile.pain_points],
                      ["Agency Goals", dbData.brandProfile.agency_goals],
                      ["DOs", dbData.brandProfile.do_rules],
                      ["DONTs", dbData.brandProfile.dont_rules],
                      ["Catatan Penting", dbData.brandProfile.important_notes],
                      ["Catatan Vault", dbData.brandProfile.vault_notes],
                    ].filter((item) => item[1]).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-slate-50 p-3">
                        <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</h3>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ✨ AI PROFILE BUILDER WIDGET ✨ */}
              <div className="relative mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
                <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-20">
                  <div className="size-32 rounded-full bg-emerald-400 blur-3xl"></div>
                </div>

                <div className="relative z-10 flex items-center justify-between border-b border-emerald-100 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h2 className="mb-1 text-sm font-bold leading-none text-slate-900">
                        AI Profile Builder
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        Auto-generate seluruh card profil klien dari berbagai sumber data.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                  >
                    {showAIPanel ? (
                      <>
                        <ChevronUp className="size-3.5" /> Sembunyikan
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" /> Tampilkan AI Builder
                      </>
                    )}
                  </button>
                </div>

                {showAIPanel && (
                  <div className="relative z-10 block p-5">
                    <div className="mb-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAITab("upload")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                          aiTab === "upload"
                            ? "bg-emerald-600 font-semibold text-white"
                            : "border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <FileUp className="size-3.5" /> Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setAITab("link")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                          aiTab === "link"
                            ? "bg-emerald-600 font-semibold text-white"
                            : "border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <LinkIcon className="size-3.5" /> Link / URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAITab("social")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                          aiTab === "social"
                            ? "bg-emerald-600 font-semibold text-white"
                            : "border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Instagram className="size-3.5" /> Social Media
                      </button>
                      <button
                        type="button"
                        onClick={() => setAITab("prompt")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                          aiTab === "prompt"
                            ? "bg-emerald-600 font-semibold text-white"
                            : "border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <MessageSquareDashed className="size-3.5" /> Custom Prompt
                      </button>
                    </div>

                    {/* Content Section */}
                    {aiTab === "upload" && (
                      <div
                        onClick={() => document.getElementById("ai-file-input")?.click()}
                        className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-emerald-200 bg-white p-6 text-center cursor-pointer transition-colors hover:bg-emerald-50"
                      >
                        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                          <CloudUpload className="size-5" />
                        </div>
                        <h3 className="mb-1 text-xs font-bold text-slate-700">
                          Upload Brand Guideline / Company Profile / Brief
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          PDF, DOCX, PPTX, atau TXT. AI akan mengekstrak warna, font, dan profil secara otomatis.
                        </p>
                        <input
                          type="file"
                          id="ai-file-input"
                          accept=".pdf,.docx,.pptx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              toast.success(`File "${e.target.files[0].name}" siap dianalisis AI!`);
                            }
                          }}
                        />
                      </div>
                    )}

                    {aiTab === "link" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Masukkan URL Website atau Landing Page Klien:
                        </label>
                        <input
                          type="url"
                          placeholder="https://sultanharamaingresik.com"
                          className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {aiTab === "social" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Username Instagram / Facebook / TikTok Klien:
                        </label>
                        <input
                          type="text"
                          placeholder="@sultanharamain_gresik"
                          className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {aiTab === "prompt" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Instruksi Khusus untuk AI Profile Builder:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ringkaskan profil bisnis travel umrah, keunggulan hotel bintang 5 Makkah/Madinah, dan poin komunikasi utama..."
                          className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          toast.success(
                            "AI Agent sedang mengumpulkan dan menyusun data profil klien...",
                          )
                        }
                        className="flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:shadow-lg"
                      >
                        <BrainCircuit className="size-4" /> Generate Profile Klien
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2-COLUMN GRID LAYOUT */}
              <div className="mt-4 grid grid-cols-1 gap-5 items-start lg:grid-cols-2">
                {/* GRID KIRI */}
                <div className="space-y-5">
                  {/* Card 1: Brand Identity */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md border border-purple-200 bg-purple-100 text-purple-600">
                          <Palette className="size-3.5" />
                        </div>
                        <h2 className="text-sm font-bold leading-none text-slate-900">
                          Brand Identity
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success("Memproses AI Generation untuk Card ini...")}
                          className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Sparkles className="size-3" /> AI
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info("Mode Edit Brand Identity diaktifkan")}
                          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Edit3 className="size-3" /> Edit
                        </button>
                      </div>
                    </div>
                    <div className="space-y-5 p-4">
                      <div>
                        <h3 className="mb-2 text-xs font-semibold text-slate-700">
                          Primary Color Palette
                        </h3>
                        <div className="flex gap-2">
                          <div
                            className="group flex cursor-pointer flex-col items-center gap-1"
                            onClick={() => copyToClipboard("#C9A75D", "Warna Emas")}
                          >
                            <div className="size-10 rounded border border-slate-200 bg-[#C9A75D] shadow-sm transition-transform group-hover:scale-105"></div>
                            <span className="font-mono text-[9px] uppercase text-slate-500">
                              #C9A75D
                            </span>
                          </div>
                          <div
                            className="group flex cursor-pointer flex-col items-center gap-1"
                            onClick={() => copyToClipboard("#003837", "Warna Hijau Gelap")}
                          >
                            <div className="size-10 rounded border border-slate-200 bg-[#003837] shadow-sm transition-transform group-hover:scale-105"></div>
                            <span className="font-mono text-[9px] uppercase text-slate-500">
                              #003837
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Mic className="size-3.5 text-slate-400" /> Tone of Voice
                        </h3>
                        <div className="group relative rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <button
                            className="absolute right-2 top-2 text-blue-400 opacity-0 transition group-hover:opacity-100 hover:text-blue-600"
                            onClick={() =>
                              copyToClipboard(
                                "Gunakan bahasa formal namun hangat, religius tanpa kesan menggurui. Sering gunakan sapaan Sahabat Haramain.",
                                "Tone of Voice",
                              )
                            }
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <p className="text-[11px] font-medium leading-relaxed text-blue-800">
                            &quot;Gunakan bahasa formal namun hangat, religius tanpa kesan menggurui.
                            Sering gunakan sapaan{" "}
                            <strong className="font-bold">Sahabat Haramain</strong>.&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Company Overview */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md border border-blue-200 bg-blue-100 text-blue-600">
                          <Info className="size-3.5" />
                        </div>
                        <h2 className="text-sm font-bold leading-none text-slate-900">
                          About Us &amp; Agency Objectives
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success("AI menganalisa dan menyusun Company Overview...")}
                          className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Sparkles className="size-3" /> AI
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info("Mode Edit diaktifkan")}
                          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Edit3 className="size-3" /> Edit
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <h3 className="mb-1 text-xs font-bold text-slate-800">Company Overview</h3>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          {client.companyProfile ||
                            client.description ||
                            "Sultan Barokah Haramain Cabang Gresik adalah biro perjalanan resmi penyedia layanan Umrah, Haji Khusus, serta distributor tunggal Air Zam Zam..."}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                          <h4 className="mb-1 flex items-center gap-1 text-[10px] font-bold text-orange-800">
                            <Target className="size-3" /> Pain Points Klien
                          </h4>
                          <ul className="list-inside list-disc space-y-1 text-[10px] text-orange-700">
                            <li>Desain promosi lama kaku.</li>
                            <li>Pesan komunikasi belum terstandardisasi.</li>
                          </ul>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <h4 className="mb-1 flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                            <Briefcase className="size-3" /> Tugas Kita
                          </h4>
                          <ul className="list-inside list-disc space-y-1 text-[10px] text-emerald-700">
                            <li>Rebranding aset digital premium.</li>
                            <li>Standardisasi konten social media.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Catatan Penting */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md border border-amber-200 bg-amber-100 text-amber-600">
                          <StickyNote className="size-3.5" />
                        </div>
                        <h2 className="text-sm font-bold leading-none text-slate-900">
                          Catatan Penting
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success("AI merangkum percakapan menjadi catatan...")}
                          className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Sparkles className="size-3" /> AI Rangkum
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success("Catatan berhasil disimpan!")}
                          className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-blue-200"
                        >
                          <Edit3 className="size-3" /> Save
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-amber-400">
                        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-1.5">
                          <button
                            type="button"
                            className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                            title="Bold"
                          >
                            <Bold className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                            title="Italic"
                          >
                            <Italic className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                            title="Underline"
                          >
                            <Underline className="size-3.5" />
                          </button>
                          <div className="mx-1 h-4 w-px bg-slate-300"></div>
                          <button
                            type="button"
                            className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                            title="Bullet List"
                          >
                            <List className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                            title="Numbered List"
                          >
                            <ListOrdered className="size-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={5}
                          value={catatanPentingText}
                          onChange={(e) => setCatatanPentingText(e.target.value)}
                          className="w-full resize-none p-3 text-xs leading-relaxed text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRID KANAN */}
                <div className="space-y-5">
                  {/* Card 4: System Guardrails */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md border border-rose-200 bg-rose-100 text-rose-600">
                          <ShieldAlert className="size-3.5" />
                        </div>
                        <h2 className="text-sm font-bold leading-none text-slate-900">
                          System Guardrails
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success("AI menganalisa Rules baru...")}
                          className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Sparkles className="size-3" /> AI
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info("Mode Edit diaktifkan")}
                          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Edit3 className="size-3" /> Edit
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-2.5">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <div>
                            <h4 className="text-[11px] font-bold text-emerald-800">
                              DO&apos;s (Wajib Dilakukan)
                            </h4>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-[10px] text-emerald-700">
                              <li>Selalu sertakan logo &quot;Izin Kemenag&quot;.</li>
                              <li>Gunakan dokumentasi keberangkatan jamaah asli.</li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-2.5">
                          <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                          <div>
                            <h4 className="text-[11px] font-bold text-rose-800">
                              DON&apos;Ts (Pantangan)
                            </h4>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-[10px] text-rose-700">
                              <li>Jangan pernah menggunakan font Comic Sans.</li>
                              <li>Dilarang mengubah rasio logo tanpa izin.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Directory & Performance */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md border border-teal-200 bg-teal-100 text-teal-600">
                          <BarChart2 className="size-3.5" />
                        </div>
                        <h2 className="text-sm font-bold leading-none text-slate-900">
                          Directory &amp; Performance
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success("AI mengupdate data performa digital...")}
                          className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Sparkles className="size-3" /> AI Auto-Sync
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 p-3 text-center">
                          <Instagram className="mx-auto mb-1 size-4 text-pink-600" />
                          <div className="text-sm font-bold text-slate-900">12.4K</div>
                          <div className="text-[9px] uppercase text-slate-500">Followers IG</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 text-center">
                          <BarChart2 className="mx-auto mb-1 size-4 text-emerald-600" />
                          <div className="text-sm font-bold text-slate-900">5.2K</div>
                          <div className="text-[9px] uppercase text-slate-500">Traffic Web</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: TIMELINE / AGENDA */}
          {activeTab === "timeline" && (
            <div className="mt-2 grid grid-cols-1 gap-5 items-start lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 text-emerald-600">
                        <ClipboardList className="size-4" />
                      </div>
                      <div>
                        <h2 className="mb-1 text-sm font-bold leading-none text-slate-900">
                          Tambah Aktivitas / Agenda Baru
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Format sinkron dengan struktur Brief &amp; Task dari halaman /workboard.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
                      >
                        <DownloadCloud className="size-3.5 text-emerald-600" />
                        <span>Impor dari /workboard</span>
                        <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          4 Tersedia
                        </span>
                      </button>
                    </div>
                  </div>

                  <form id="form-timeline" onSubmit={handleTimelineSubmit} className="space-y-5 p-5 sm:p-6">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Judul <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="brief-judul"
                        type="text"
                        value={judul}
                        onChange={(e) => setJudul(e.target.value)}
                        placeholder="Cth: Revisi Desain Spanduk Air Zam Zam — V3"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Client / Proyek</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          Nama Perusahaan · Sub-proyek / Kampanye
                        </span>
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 size-4 text-slate-400" />
                        <input
                          id="brief-client-proyek"
                          type="text"
                          value={clientProyek}
                          onChange={(e) => setClientProyek(e.target.value)}
                          placeholder="Cth: PT. Maju Mundur Bersama · Spanduk Keberangkatan Umrah"
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Ringkasan
                      </label>
                      <textarea
                        id="brief-ringkasan"
                        rows={2}
                        value={ringkasan}
                        onChange={(e) => setRingkasan(e.target.value)}
                        placeholder="Client meminta perbaikan pada preview: ukuran logo dan kontras font..."
                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Layers className="size-3.5 text-slate-400" /> Spesifikasi Teknis
                      </label>
                      <input
                        id="brief-spesifikasi"
                        type="text"
                        value={spesifikasi}
                        onChange={(e) => setSpesifikasi(e.target.value)}
                        placeholder="Cth: Landscape 3m × 1m · Flexi 340gsm · mata ayam 4 sudut"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <CheckSquare className="size-4 text-emerald-600" /> Checklist Revisi
                        </label>
                        <button
                          type="button"
                          onClick={addChecklistItem}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          <Plus className="size-3" /> Tambah Item Checklist
                        </button>
                      </div>

                      <div id="checklist-container" className="space-y-2">
                        {checklist.length === 0 ? (
                          <p className="py-1 text-xs italic text-slate-400">
                            Belum ada item checklist revisi.
                          </p>
                        ) : (
                          checklist.map((item, idx) => (
                            <div
                              key={idx}
                              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2 transition hover:border-slate-300"
                            >
                              <label className="flex flex-1 select-none cursor-pointer items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => toggleChecklistDone(idx)}
                                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span
                                  className={`text-xs ${
                                    item.done
                                      ? "font-normal text-slate-400 line-through"
                                      : "font-medium text-slate-800"
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </label>
                              <div className="flex shrink-0 items-center gap-2">
                                {item.note && (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                                    ({item.note})
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeChecklistItem(idx)}
                                  className="rounded p-1 text-slate-300 transition hover:text-rose-500"
                                  title="Hapus item"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                      <div className="md:col-span-5">
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Calendar className="size-3.5 text-slate-400" /> Deadline{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="brief-deadline"
                          type="datetime-local"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 transition focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Tag className="size-3.5 text-slate-400" /> Prioritas
                        </label>
                        <select
                          id="brief-prioritas"
                          value={prioritas}
                          onChange={(e) => setPrioritas(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="Enterprise">Enterprise</option>
                          <option value="Client Marah">Client Marah</option>
                          <option value="Client Nanyain!">Client Nanyain!</option>
                          <option value="Nyaris Deadline">Nyaris Deadline</option>
                          <option value="Masih Aman">Masih Aman</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <UserCheck className="size-3.5 text-slate-400" /> PIC
                        </label>
                        <select
                          id="brief-pic"
                          value={pic}
                          onChange={(e) => setPic(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="DS">DS (Dimas)</option>
                          <option value="AM">AM (Ammar)</option>
                          <option value="FM">FM (Fatimah)</option>
                          <option value="BF">BF (Budi F.)</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3.5 transition">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <AlertTriangle className="size-4 text-amber-600" /> Perlu konfirmasi
                        </label>
                        <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Catatan Kritis
                        </span>
                      </div>
                      <input
                        id="brief-konfirmasi"
                        type="text"
                        value={konfirmasi}
                        onChange={(e) => setKonfirmasi(e.target.value)}
                        placeholder="Cth: ukuran logo yang diinginkan client belum disebut."
                        className="w-full rounded-lg border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-amber-950 placeholder-amber-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Paperclip className="size-3.5 text-slate-500" /> Lampiran File (MOM, Preview Desain, Referensi)
                      </label>
                      <div
                        onClick={() => document.getElementById("timeline-upload-input")?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleFileUpload(e.dataTransfer.files);
                        }}
                        className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50"
                      >
                        <div className="mb-2 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all group-hover:scale-105 group-hover:text-emerald-600">
                          <Upload className="size-4" />
                        </div>
                        <h3 className="mb-0.5 text-xs font-semibold text-slate-700">
                          Pilih atau seret berkas ke sini
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          PDF, JPG, PNG, AI, PSD, ZIP (Maksimal 5MB per file)
                        </p>
                        <input
                          type="file"
                          id="timeline-upload-input"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                      </div>

                      {attachedFiles.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {attachedFiles.map((file, index) => {
                            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-slate-300"
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="shrink-0 rounded bg-emerald-50 p-1.5 text-emerald-600">
                                    <FileIcon className="size-4" />
                                  </div>
                                  <div className="truncate">
                                    <p
                                      className="max-w-[150px] truncate text-xs font-semibold text-slate-800 sm:max-w-[170px]"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400">
                                      {sizeMB} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachedFile(index)}
                                  className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                  title="Hapus File"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={busy}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                      >
                        <Send className="size-3.5" />
                        <span>{busy ? "Menyimpan..." : "Simpan ke Timeline"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="space-y-4 lg:col-span-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Kanban className="size-4 text-emerald-600" /> Task Workboard Siap Impor
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-[11px] font-semibold text-emerald-700 transition hover:text-emerald-800"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {filteredWorkboardTasks.length === 0 ? (
                      <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">Belum ada task tersimpan untuk client ini.</p>
                    ) : filteredWorkboardTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 transition hover:border-emerald-200 hover:bg-white"
                      >
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="font-mono font-semibold text-slate-400">{task.id}</span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${task.prioritasBadge}`}
                          >
                            {task.prioritas}
                          </span>
                        </div>
                        <p className="mb-1 line-clamp-1 text-[11px] font-bold leading-tight text-slate-800">
                          {task.judul}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[9px] text-slate-500">
                            <User className="size-3 text-slate-400" /> PIC: <strong>{task.pic}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => applyWorkboardTask(task)}
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                          >
                            <ArrowDownToDot className="size-3" /> Terapkan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <History className="size-4 text-blue-600" /> Agenda Mendatang
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      Bulan Ini
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {dbData?.events && dbData.events.length > 0 ? (
                      dbData.events.map((ev: DBRow) => (
                        <div key={ev.id} className="group relative flex gap-3">
                          <div className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-[9px] font-bold text-emerald-700 shadow-xs">
                            {ev.metadata?.pic || "DS"}
                          </div>
                          <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                                {ev.metadata?.prioritas || "Normal"}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                PIC: {ev.metadata?.pic || "DS"}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold leading-tight text-slate-800">
                              {ev.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                              {ev.description}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              <Clock className="size-3 text-slate-400" />{" "}
                              {new Date(ev.occurred_at).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">Belum ada agenda atau aktivitas tersimpan.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm">
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
                    <Info className="size-4 text-blue-600" /> Integrasi /workboard &amp; Timeline
                  </h4>
                  <p className="text-[11px] leading-relaxed text-blue-800">
                    Task yang diimpor dari <span className="font-semibold text-blue-950">/workboard</span>{" "}
                    otomatis tersinkronisasi. Estimasi tenggat, penanggung jawab (assignee), dan deskripsi task
                    langsung dihubungkan tanpa perlu mengetik ulang.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: DAFTAR ASET DIGITAL & KREDENSIAL */}
          {activeTab === "assets" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                  <ShieldCheck className="size-4 text-rose-500" />
                  Daftar Aset Digital &amp; Kredensial Klien
                </h2>
                <p className="mb-5 text-xs leading-relaxed text-slate-500">
                  Simpan metadata aset digital seperti platform, URL, dan username. Password serta secret 2FA dinonaktifkan sampai Secure Vault terenkripsi tersedia.
                </p>

                <div className="space-y-5">
                  {/* A. Akun Pusat (Master Email) */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Key className="size-3.5 text-slate-500" /> Akun Utama Klien (Master Email)
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                          Email Utama / Username
                        </label>
                        <input
                          type="text"
                          value={masterEmail}
                          onChange={(e) => setMasterEmail(e.target.value)}
                          placeholder="admin@domainklien.com"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                        Password, recovery code, dan secret 2FA belum dapat disimpan dengan aman. Fitur kredensial rahasia dinonaktifkan sampai Secure Vault terenkripsi tersedia.
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* B. Custom Accounts Repeater / Existing Assets */}
                  <div>
                    <h3 className="mb-2.5 text-xs font-bold text-slate-800">
                      Daftar Akun Lainnya (Medsos, Web, API, dll)
                    </h3>

                    {/* Existing Digital Assets from Supabase */}
                    <div className="space-y-3 mb-4">
                      {dbData?.assets && dbData.assets.length > 0 ? (
                        dbData.assets.map((asset: DBRow) => (
                          <div
                            key={asset.id}
                            className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900">{asset.asset_name}</p>
                              <p className="text-[11px] text-slate-500">
                                {asset.platform || asset.asset_type} · Username:{" "}
                                <strong className="text-slate-800">{asset.username || "—"}</strong>
                              </p>
                              {asset.notes && (
                                <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  {asset.notes}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDigitalAsset(asset.id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded border border-slate-200 bg-white transition shrink-0"
                              title="Hapus Aset"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">
                          Belum ada aset digital tersimpan di database.
                        </p>
                      )}
                    </div>

                    {/* Input Form for New Asset */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Plus className="size-3.5 text-rose-600" /> Tambah Kredensial Baru
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Platform / URL
                          </label>
                          <input
                            type="text"
                            value={newAssetPlatform}
                            onChange={(e) => setNewAssetPlatform(e.target.value)}
                            placeholder="Instagram / WP Admin"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Username / ID
                          </label>
                          <input
                            type="text"
                            value={newAssetUser}
                            onChange={(e) => setNewAssetUser(e.target.value)}
                            placeholder="@username"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div className="flex items-center rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-800">
                          Secret tidak disimpan sebelum Secure Vault tersedia.
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Catatan / Akses
                          </label>
                          <input
                            type="text"
                            value={newAssetNote}
                            onChange={(e) => setNewAssetNote(e.target.value)}
                            placeholder="Role Admin"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDigitalAsset}
                        disabled={busy}
                        className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-md transition shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="size-3.5" /> Simpan Aset Digital Ke Database
                      </button>
                    </div>
                  </div>

                  {/* C. Catatan Keamanan / Vault Note */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
                      Catatan Penting Keamanan &amp; Integrasi
                    </label>
                    <textarea
                      rows={2}
                      value={vaultNote}
                      onChange={(e) => setVaultNote(e.target.value)}
                      placeholder="Catatan instruksi khusus terkait login, prosedur OTP, peringatan masa aktif (expired date) hosting/domain, atau struktur parent-child account..."
                      className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: DOKUMEN PENDUKUNG */}
          {activeTab === "documents" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                  <FolderOpen className="size-4 text-amber-500" />
                  Dokumen Pendukung Klien
                </h2>

                {/* Dropzone Area */}
                <div
                  onClick={() => document.getElementById("tab-doc-file-input")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDocumentUpload(e.dataTransfer.files);
                  }}
                  className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-500 shadow-sm transition-transform group-hover:scale-110">
                    <CloudUpload className="size-5" />
                  </div>
                  <h3 className="mb-1 text-xs font-bold text-slate-900">
                    Klik untuk unggah atau seret &amp; lepas
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    NPWP, Kontrak, Guideline (PDF, DOCX, JPG - Maks 10MB)
                  </p>
                  <input
                    type="file"
                    id="tab-doc-file-input"
                    className="hidden"
                    onChange={(e) => handleDocumentUpload(e.target.files)}
                  />
                </div>

                {/* List Preview File yang Diunggah dari Database */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dbData?.docs && dbData.docs.length > 0 ? (
                    dbData.docs.map((d: DBRow) => {
                      const sizeMB = (d.file_size / (1024 * 1024)).toFixed(2);
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2.5 transition hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="rounded border border-slate-100 bg-white p-2 text-slate-500 shadow-sm">
                              <FileText className="size-4 text-blue-600" />
                            </div>
                            <div className="truncate">
                              <p className="w-40 truncate text-xs font-bold text-slate-700 sm:w-48">
                                {d.title || d.file_name}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400">
                                {sizeMB} MB · {new Date(d.created_at).toLocaleDateString("id-ID")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openSignedFile(d.file_path)}
                              className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-blue-200 hover:text-blue-600"
                              title="Buka Dokumen"
                            >
                              <Eye className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(d.id, d.file_path)}
                              className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-red-200 hover:text-red-600"
                              title="Hapus Dokumen"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                      Belum ada dokumen tersimpan untuk klien ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
