import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BrainCircuit,
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CloudUpload,
  FolderOpen,
  Globe,
  ImagePlus,
  Key,
  Mail,
  Mic,
  Palette,
  Phone,
  Plus,
  PlusCircle,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Tags,
  Target,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { workspaceSaveClient, workspaceSaveProject } from "@/lib/projects/projects.functions";

const KEY = ["workspace", "projects-clients"] as const;

type CustomAccountRow = {
  id: string;
  platform: string;
  username: string;
  note: string;
};

const createEmptyAccountRow = (): CustomAccountRow => ({
  id: crypto.randomUUID(),
  platform: "",
  username: "",
  note: "",
});

export function ClientCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveClient = useServerFn(workspaceSaveClient);
  const saveProject = useServerFn(workspaceSaveProject);

  const [busy, setBusy] = useState(false);
  const [userInitials, setUserInitials] = useState("BF");

  // AI Auto-Generate Prompt Input
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Card 1: Logo & Profil Utama Klien
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // Profile Client Details (Brand Identity, Overview, Guardrails, Notes)
  const [color1, setColor1] = useState("#C9A75D");
  const [color2, setColor2] = useState("#003837");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [companyOverview, setCompanyOverview] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [agencyGoals, setAgencyGoals] = useState("");
  const [dosRules, setDosRules] = useState("");
  const [dontsRules, setDontsRules] = useState("");
  const [catatanPenting, setCatatanPenting] = useState("");

  // Card 2: Timeline & Agenda Awal
  const [startAt, setStartAt] = useState("");
  const [targetAt, setTargetAt] = useState("");
  const [briefJudul, setBriefJudul] = useState("");
  const [briefRingkasan, setBriefRingkasan] = useState("");
  const [briefSpesifikasi, setBriefSpesifikasi] = useState("");
  const [checklist, setChecklist] = useState<Array<{ text: string; note?: string; done: boolean }>>([]);
  const [briefDeadline, setBriefDeadline] = useState("");
  const [briefPrioritas, setBriefPrioritas] = useState("Standard");
  const [briefPic, setBriefPic] = useState("");
  const [briefKonfirmasi, setBriefKonfirmasi] = useState("");

  // Card 3: Master Email & Custom Accounts
  const [masterEmail, setMasterEmail] = useState("");
  const [accounts, setAccounts] = useState<CustomAccountRow[]>([]);
  const [vaultNote, setVaultNote] = useState("");

  // Card 4: Dokumen Pendukung
  const [documents, setDocuments] = useState<File[]>([]);

  // Card 5: Klasifikasi & Penugasan
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("standard");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserInitials(data.user.email.slice(0, 2).toUpperCase());
      }
    });
  }, []);

  // Duration calculation logic
  const durationDisplay = useMemo(() => {
    if (!startAt || !targetAt) return "0d : 0h : 0m : 0s";
    const start = new Date(startAt).getTime();
    const target = new Date(targetAt).getTime();
    if (isNaN(start) || isNaN(target) || start >= target) {
      return "0d : 0h : 0m : 0s";
    }
    let diff = Math.abs(target - start) / 1000;
    const days = Math.floor(diff / 86400);
    diff -= days * 86400;
    const hours = Math.floor(diff / 3600) % 24;
    diff -= hours * 3600;
    const minutes = Math.floor(diff / 60) % 60;
    return `${days}d : ${hours}h : ${minutes}m : 0s`;
  }, [startAt, targetAt]);

  // AI Auto-Generate Handler
  // Local helper only: no external AI provider or Lovable token is called.
  const handleAIGenerate = () => {
    const prompt = aiPromptInput.trim();
    if (!prompt) {
      toast.error("Masukkan nama client atau URL terlebih dahulu.");
      return;
    }
    setIsGeneratingAI(true);
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
    const source = urlMatch ? prompt.replace(urlMatch[0], "").trim() : prompt;
    const formattedName = source
      .replace(/(https?:\/\/|www\.)/gi, "")
      .split(".")[0]
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    if (formattedName) setName(formattedName);
    if (urlMatch) setWebsite(urlMatch[0]);
    setIsGeneratingAI(false);
    toast.info("Nama dan URL diisi sebagai draft lokal. AI belum dijalankan dan tidak ada data contoh yang dibuat.");
  };

  const handleLogoChange = (file?: File) => {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/jpg", "image/svg+xml"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      toast.error("Ukuran file terlalu besar. Maksimal 2MB (JPG, PNG, SVG).");
      return;
    }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview("");
  };

  const handleDocFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const valid = newFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (Maks. 10MB).`);
        return false;
      }
      return true;
    });
    setDocuments((current) => [...current, ...valid]);
  };

  const removeDoc = (index: number) => {
    setDocuments((current) => current.filter((_, i) => i !== index));
  };

  const uploadPrivateFile = async (
    userId: string,
    clientId: string,
    file: File,
    folder: string,
  ) => {
    const safeName = file.name.replace(/[^\w.-]/g, "-");
    const path = `${userId}/${clientId}/${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("client-files")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Nama Perusahaan / Merek wajib diisi.");
      return;
    }

    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }
      const userId = authData.user.id;

      // 1. Upload Logo if provided
      let logoPath: string | null = null;
      if (logo) {
        const safeName = logo.name.replace(/[^\w.-]/g, "-");
        logoPath = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: logoError } = await supabase.storage
          .from("client-files")
          .upload(logoPath, logo, { contentType: logo.type, upsert: false });
        if (logoError) throw logoError;
      }

      // 2. Save Client Record
      const fullCompanyProfile = `Overview:\n${companyOverview || description}\n\nPain Points:\n${painPoints}\n\nTugas Kita:\n${agencyGoals}\n\nTone of Voice:\n${toneOfVoice}\n\nDOs:\n${dosRules}\n\nDONTs:\n${dontsRules}`;

      const savedClient = await saveClient({
        data: {
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          industry: industry.trim() || undefined,
          contactEmail: email.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          description: catatanPenting.trim() || `Client ${name.trim()}`,
          companyProfile: fullCompanyProfile,
          scopeOfWork: agencyGoals,
          internalNotes: catatanPenting,
          clientStatus: status,
          logoPath,
        },
      });
      const clientId = savedClient.id;

      // Persist the form's brand/profile fields as structured, reusable data.
      const { error: profileError } = await (supabase.from("client_brand_profiles" as any) as any)
        .insert({
          user_id: userId,
          client_id: clientId,
          primary_color: color1,
          secondary_color: color2,
          tone_of_voice: toneOfVoice.trim() || null,
          company_overview: companyOverview.trim() || null,
          pain_points: painPoints.trim() || null,
          agency_goals: agencyGoals.trim() || null,
          do_rules: dosRules.trim() || null,
          dont_rules: dontsRules.trim() || null,
          important_notes: catatanPenting.trim() || null,
          vault_notes: vaultNote.trim() || null,
          tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
          service_priority: priority === "basic" ? "standard" : priority,
        });
      if (profileError) throw new Error(`Profil brand gagal disimpan: ${profileError.message}`);

      // 3. Create Project & Initial Timeline Agenda
      const project = await saveProject({
        data: {
          name: `${name.trim()} - Proyek Utama`,
          description: briefRingkasan.trim() || null,
          clientId,
          status: status === "completed" ? "archived" : status === "active" ? "active" : "paused",
        },
      });

      // Save initial timeline events
      const hasInitialBrief = Boolean(
        briefJudul.trim() ||
        briefRingkasan.trim() ||
        briefSpesifikasi.trim() ||
        checklist.length ||
        briefDeadline ||
        startAt,
      );
      const timelineRows = [
        hasInitialBrief
          ? {
              user_id: userId,
              client_id: clientId,
              event_type: "project",
              title: briefJudul.trim() || "Kickoff Project",
              description: briefRingkasan.trim() || null,
              occurred_at: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
              metadata: {
                project_id: project.id,
                spesifikasi: briefSpesifikasi,
                checklist,
                prioritas: briefPrioritas,
                pic: briefPic,
                konfirmasi: briefKonfirmasi,
                deadline: briefDeadline || null,
              },
            }
          : null,
        targetAt
          ? {
              user_id: userId,
              client_id: clientId,
              event_type: "milestone",
              title: "Target Penyelesaian Project",
              description: `Target penyelesaian: ${name.trim()}`,
              occurred_at: new Date(targetAt).toISOString(),
              metadata: { project_id: project.id, milestone: "target" },
            }
          : null,
      ].filter(Boolean);

      if (timelineRows.length) {
        const { error: timelineError } = await supabase.from("client_timeline_events").insert(timelineRows);
        if (timelineError) throw new Error(`Timeline gagal disimpan: ${timelineError.message}`);
      }

      // 4. Save Master Account & Custom Digital Assets
      const digitalAssets = [];
      if (masterEmail.trim()) {
        digitalAssets.push({
          user_id: userId,
          client_id: clientId,
          asset_name: "Akun Utama Klien (Master Email)",
          asset_type: "email",
          username: masterEmail.trim(),
          notes: null,
        });
      }

      accounts.forEach((acc) => {
        if (acc.platform.trim() || acc.username.trim()) {
          digitalAssets.push({
            user_id: userId,
            client_id: clientId,
            asset_name: acc.platform.trim() || "Akun Klien",
            asset_type: "other",
            platform: acc.platform.trim() || null,
            username: acc.username.trim() || null,
            notes: acc.note.trim() || null,
          });
        }
      });

      if (digitalAssets.length) {
        const { error: assetsError } = await supabase.from("client_digital_assets").insert(digitalAssets);
        if (assetsError) throw new Error(`Aset digital gagal disimpan: ${assetsError.message}`);
      }

      // 5. Upload Supporting Documents
      for (const file of documents) {
        const path = await uploadPrivateFile(userId, clientId, file, "documents");
        const { error: documentError } = await supabase.from("client_documents").insert({
          user_id: userId,
          client_id: clientId,
          title: file.name,
          document_type: "other",
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
        });
        if (documentError) {
          await supabase.storage.from("client-files").remove([path]);
          throw new Error(`Dokumen ${file.name} gagal disimpan: ${documentError.message}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Klien & Proyek Baru Berhasil Disimpan!");
      await navigate({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan data klien.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#dce3e8] p-2 text-slate-800 sm:p-6 lg:p-8">
      <AppSidebar />

      <main className="flex flex-col items-center lg:pl-64">
        {/* Main Unified Container */}
        <div className="w-full max-w-[1400px] overflow-hidden rounded-xl border border-slate-300 bg-[#f8fafc] shadow-2xl">
          {/* Top Navigation Bar */}
          <header className="flex select-none items-center justify-between bg-[#003837] px-4 py-2.5 text-xs tracking-wide text-white sm:px-6">
            <div className="flex items-center space-x-3 overflow-x-auto">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#ea580c] font-bold text-white shadow-sm"
                title="Enterprise CRM Platform"
              >
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
                  className="flex items-center space-x-1.5 rounded bg-[#012625] px-3 py-1.5 font-medium text-white transition hover:bg-[#022e2d]"
                >
                  <PlusCircle className="size-3.5 opacity-90" />
                  <span>Tambah Klien</span>
                </button>
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/clients" })}
                  className="flex items-center space-x-1.5 rounded px-3 py-1.5 text-slate-200 transition hover:bg-[#012a29] hover:text-white"
                >
                  <Building2 className="size-3.5 opacity-80" />
                  <span>Daftar Perusahaan</span>
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-3 text-slate-300">
              <div
                className="flex size-7 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-bold text-[#78350f] shadow"
                title="Workspace Admin"
              >
                {userInitials}
              </div>
            </div>
          </header>

          {/* Header Formulir */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Formulir Pendaftaran Klien &amp; Proyek Baru
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Lengkapi data profil perusahaan, brand identity, timeline agenda, dan aset digital.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigate({ to: "/clients" })}
              className="hidden items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
            >
              <ArrowLeft className="size-3.5 text-slate-500" />
              <span>Kembali</span>
            </button>
          </div>

          {/* ✨ AI SMART PROFILE & TIMELINE GENERATOR ✨ */}
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    ✨ Bantuan Isi Profil (Lokal)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Isi nama atau URL untuk membantu mengisi field dasar. Tidak memanggil AI eksternal atau token Lovable.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                placeholder="Contoh: Sultan Haramain Gresik - Biro Travel Umrah & Haji Khusus"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGeneratingAI}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
              >
                <BrainCircuit className="size-4" />
                <span>{isGeneratingAI ? "Menyusun Data..." : "Otomatis Generate dengan AI"}</span>
              </button>
            </div>
          </div>

          {/* Area Formulir Utama */}
          <form id="add-client-form" onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-12">
              {/* Kolom Kiri (8 Cols) */}
              <div className="space-y-6 lg:col-span-8">
                {/* Card 1: Informasi Utama Klien */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <Building className="size-4 text-emerald-600" />
                    Profil Utama Klien
                  </h2>

                  {/* UPLOAD LOGO SECTION */}
                  <div className="mb-6 flex items-center space-x-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div
                      className="group relative cursor-pointer"
                      onClick={() => document.getElementById("logo-upload-input")?.click()}
                    >
                      <div className="relative z-10 flex size-16 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-colors group-hover:border-emerald-500 group-hover:text-emerald-600">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Preview Logo"
                            className="absolute inset-0 size-full object-cover bg-white z-20"
                          />
                        ) : (
                          <>
                            <ImagePlus className="mb-0.5 size-5" />
                            <span className="text-[8px] font-semibold text-center leading-tight">
                              Upload<br />Logo
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        id="logo-upload-input"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleLogoChange(e.target.files?.[0])}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Logo / Foto Profil Perusahaan
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Unggah logo resmi klien untuk mempermudah identifikasi pada Kanban dan Dashboard. <br />
                        <span className="font-medium">Format:</span> JPG, PNG, atau SVG (Maks. 2MB).
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 transition hover:bg-emerald-100"
                          onClick={() => document.getElementById("logo-upload-input")?.click()}
                        >
                          Pilih Gambar
                        </button>
                        {logo && (
                          <button
                            type="button"
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 transition hover:bg-red-100"
                            onClick={removeLogo}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Nama Perusahaan */}
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Nama Perusahaan / Merek <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Cth: Sultan Haramain Gresik"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Email Kontak Resmi <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Cth: kontak@perusahaan.com"
                          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          required
                        />
                      </div>
                    </div>

                    {/* Telepon */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Cth: 0811-3107-707"
                          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          required
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Website Utama
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="Cth: www.sultanharamaingresik.com"
                          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Alamat Lengkap */}
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Alamat Lengkap Perusahaan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Jl. Samanhudi No. 37, Kebungson, Kec. Gresik, Jawa Timur 61114"
                        className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Brand Identity & Overview (Penyesuaian Profile Client) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <Palette className="size-4 text-purple-600" />
                    Brand Identity &amp; Overview
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Primary Palette 1 (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color1}
                          onChange={(e) => setColor1(e.target.value)}
                          className="size-9 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={color1}
                          onChange={(e) => setColor1(e.target.value)}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Primary Palette 2 (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color2}
                          onChange={(e) => setColor2(e.target.value)}
                          className="size-9 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={color2}
                          onChange={(e) => setColor2(e.target.value)}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Mic className="size-3.5 text-slate-400" /> Tone of Voice
                      </label>
                      <input
                        type="text"
                        value={toneOfVoice}
                        onChange={(e) => setToneOfVoice(e.target.value)}
                        placeholder="Gunakan bahasa formal namun hangat..."
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Company Overview
                      </label>
                      <textarea
                        rows={2}
                        value={companyOverview}
                        onChange={(e) => setCompanyOverview(e.target.value)}
                        placeholder="Sejarah singkat, lini bisnis, dan positioning perusahaan..."
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <Target className="size-3 text-orange-600" /> Pain Points Klien
                      </label>
                      <textarea
                        rows={3}
                        value={painPoints}
                        onChange={(e) => setPainPoints(e.target.value)}
                        placeholder="• Desain promosi lama kaku..."
                        className="w-full rounded-md border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs text-orange-950"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <Briefcase className="size-3 text-emerald-600" /> Tugas Kita (Agency Objectives)
                      </label>
                      <textarea
                        rows={3}
                        value={agencyGoals}
                        onChange={(e) => setAgencyGoals(e.target.value)}
                        placeholder="• Rebranding aset digital premium..."
                        className="w-full rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Pengaturan Timeline & Agenda Brief */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <CalendarClock className="size-4 text-blue-600" />
                    Timeline &amp; Agenda Proyek Utama
                  </h2>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Tanggal Start Project <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Target Penyelesaian <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={targetAt}
                        onChange={(e) => setTargetAt(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>

                    {/* Kalkulasi Display Box */}
                    <div className="flex flex-col justify-between gap-2 rounded-md border border-[#99f6e4] bg-[#ccfbf1] p-3 text-[#0f766e] shadow-sm sm:flex-row sm:items-center md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <span className="size-2 animate-pulse rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Kalkulasi Jangka Waktu :
                        </span>
                      </div>
                      <div className="rounded border border-[#99f6e4] bg-white/50 px-3 py-1 font-mono text-sm font-bold tracking-wide">
                        {durationDisplay}
                      </div>
                    </div>

                    {/* Brief / Task Awal */}
                    <div className="space-y-3 md:col-span-2 border-t border-slate-100 pt-3">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ClipboardList className="size-4 text-emerald-600" /> Agenda / Brief Task Awal
                      </h3>

                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Judul Agenda
                          </label>
                          <input
                            type="text"
                            value={briefJudul}
                            onChange={(e) => setBriefJudul(e.target.value)}
                            className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Ringkasan Brief
                          </label>
                          <textarea
                            rows={2}
                            value={briefRingkasan}
                            onChange={(e) => setBriefRingkasan(e.target.value)}
                            className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-600">
                              Prioritas
                            </label>
                            <select
                              value={briefPrioritas}
                              onChange={(e) => setBriefPrioritas(e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                              <option value="Enterprise">Enterprise</option>
                              <option value="Client Marah">Client Marah</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Normal">Normal</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-600">
                              PIC
                            </label>
                            <select
                              value={briefPic}
                              onChange={(e) => setBriefPic(e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                              <option value="DS">DS (Dimas)</option>
                              <option value="AM">AM (Ammar)</option>
                              <option value="FM">FM (Fatimah)</option>
                              <option value="BF">BF (Budi F.)</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-600">
                              Deadline Task
                            </label>
                            <input
                              type="datetime-local"
                              value={briefDeadline}
                              onChange={(e) => setBriefDeadline(e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: System Guardrails & Catatan Penting */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <ShieldAlert className="size-4 text-rose-500" />
                    System Guardrails &amp; Catatan Penting
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="size-4 text-emerald-600" /> DO&apos;s (Wajib Dilakukan)
                      </label>
                      <textarea
                        rows={3}
                        value={dosRules}
                        onChange={(e) => setDosRules(e.target.value)}
                        className="w-full rounded border border-emerald-200 bg-white p-2 text-xs text-emerald-950"
                      />
                    </div>

                    <div className="rounded-md border border-rose-200 bg-rose-50/50 p-3">
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-rose-800">
                        <XCircle className="size-4 text-rose-600" /> DON&apos;Ts (Pantangan)
                      </label>
                      <textarea
                        rows={3}
                        value={dontsRules}
                        onChange={(e) => setDontsRules(e.target.value)}
                        className="w-full rounded border border-rose-200 bg-white p-2 text-xs text-rose-950"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <StickyNote className="size-4 text-amber-500" /> Catatan Penting Internal
                      </label>
                      <textarea
                        rows={3}
                        value={catatanPenting}
                        onChange={(e) => setCatatanPenting(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 5: Kredensial & Aset Digital */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <ShieldCheck className="size-4 text-rose-500" />
                    Daftar Aset Digital &amp; Kredensial Klien
                  </h2>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Key className="size-3.5 text-slate-500" /> Akun Utama Klien (Master Email)
                      </h3>
                      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                        Password, recovery code, dan secret 2FA belum dapat disimpan dengan aman. Simpan hanya username/metadata di sini; jangan masukkan rahasia sampai Secure Vault terenkripsi tersedia.
                      </p>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Email Utama / Username
                          </label>
                          <input
                            type="text"
                            value={masterEmail}
                            onChange={(e) => setMasterEmail(e.target.value)}
                            placeholder="admin@domainklien.com"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                        <div className="flex items-center rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          Kolom password dinonaktifkan sampai penyimpanan terenkripsi tersedia.
                        </div>
                      </div>
                    </div>

                    {/* Custom Accounts Repeater */}
                    <div>
                      <h3 className="mb-2 text-xs font-bold text-slate-800">
                        Daftar Akun Lainnya (Medsos, Web, API, dll)
                      </h3>

                      <div className="space-y-3">
                        {accounts.map((acc, index) => (
                          <div
                            key={acc.id}
                            className="group relative flex flex-col items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row"
                          >
                            <div className="w-full md:w-1/4">
                              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                                Platform
                              </label>
                              <input
                                type="text"
                                value={acc.platform}
                                onChange={(e) =>
                                  setAccounts((rows) =>
                                    rows.map((row, i) =>
                                      i === index ? { ...row, platform: e.target.value } : row,
                                    ),
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                              />
                            </div>
                            <div className="w-full md:w-1/4">
                              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                                Username
                              </label>
                              <input
                                type="text"
                                value={acc.username}
                                onChange={(e) =>
                                  setAccounts((rows) =>
                                    rows.map((row, i) =>
                                      i === index ? { ...row, username: e.target.value } : row,
                                    ),
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                              />
                            </div>
                            <div className="w-full md:w-1/4 flex items-center text-[10px] text-amber-700">
                              Password belum tersedia di Secure Vault dan tidak boleh dimasukkan di form ini.
                            </div>
                            <div className="w-full md:w-1/4">
                              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                                Note
                              </label>
                              <input
                                type="text"
                                value={acc.note}
                                onChange={(e) =>
                                  setAccounts((rows) =>
                                    rows.map((row, i) =>
                                      i === index ? { ...row, note: e.target.value } : row,
                                    ),
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setAccounts((rows) => [...rows, createEmptyAccountRow()])}
                        className="mt-3 flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        <Plus className="size-3.5" /> Tambah Akun / Kredensial
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 6: Dokumen Pendukung */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <FolderOpen className="size-4 text-amber-500" />
                    Dokumen Pendukung
                  </h2>

                  <div
                    onClick={() => document.getElementById("doc-upload-input")?.click()}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50"
                  >
                    <CloudUpload className="mb-2 size-7 text-blue-500" />
                    <span className="text-xs font-bold text-slate-800">
                      Klik untuk unggah atau seret file
                    </span>
                    <span className="mt-1 text-[10px] text-slate-500">
                      PDF, DOCX, JPG, PNG · Maks. 10 MB per file
                    </span>
                    <input
                      type="file"
                      id="doc-upload-input"
                      multiple
                      className="hidden"
                      onChange={(e) => handleDocFiles(e.target.files)}
                    />
                  </div>

                  {documents.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {documents.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded border bg-slate-50 p-2 text-xs"
                        >
                          <span className="truncate">
                            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDoc(index)}
                            className="text-red-600"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan (4 Cols) - Klasifikasi & Aksi */}
              <div className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
                {/* Card 5: Klasifikasi & Penugasan */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <Tags className="size-4 text-purple-600" />
                    Klasifikasi &amp; Penugasan
                  </h2>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Status Client / Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
                    >
                      <option value="active">🟢 Active Partner</option>
                      <option value="on-hold">🔴 On Hold</option>
                      <option value="prospect">🟡 New Lead / Prospek</option>
                      <option value="completed">🔵 Completed / Selesai</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Prioritas Layanan
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
                    >
                      <option value="enterprise">Enterprise (High Priority)</option>
                      <option value="standard">Standard</option>
                      <option value="priority">Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Label Kategori (Tags)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Cth: Umrah, Tour & Travel"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Pisahkan dengan tanda koma (,)</p>
                  </div>
                </div>

                {/* Card 6: Tombol Aksi Simpan */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
                    Dengan menyimpan form ini, Workspace Proyek, Profile Client, dan Agenda Timeline baru akan secara otomatis dibuat.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center space-x-2 rounded-md bg-[#003837] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#022e2d] disabled:opacity-50"
                    >
                      <Save className="size-4" />
                      <span>{busy ? "Menyimpan Klien..." : "Simpan Klien Baru"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void navigate({ to: "/clients" })}
                      className="flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Batalkan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
