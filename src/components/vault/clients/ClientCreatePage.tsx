import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  Bold,
  BrainCircuit,
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Globe,
  ImagePlus,
  Italic,
  Key,
  Layers,
  List,
  ListOrdered,
  Mail,
  Mic,
  Palette,
  Paperclip,
  Phone,
  Plus,
  PlusCircle,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Tag,
  Tags,
  Target,
  Trash2,
  Underline,
  UserCheck,
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
  password: string;
  showPassword?: boolean;
  note: string;
};

const createEmptyAccountRow = (): CustomAccountRow => ({
  id: crypto.randomUUID(),
  platform: "",
  username: "",
  password: "",
  showPassword: false,
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
  const [city, setCity] = useState("Gresik");

  // Profile Client Details (Brand Identity, Overview, Guardrails, Notes)
  const [color1, setColor1] = useState("#C9A75D");
  const [color2, setColor2] = useState("#003837");
  const [toneOfVoice, setToneOfVoice] = useState(
    "Gunakan bahasa formal namun hangat, religius tanpa kesan menggurui. Sering gunakan sapaan Sahabat Haramain.",
  );
  const [companyOverview, setCompanyOverview] = useState("");
  const [painPoints, setPainPoints] = useState(
    "• Desain promosi lama kaku.\n• Pesan komunikasi belum terstandardisasi.",
  );
  const [agencyGoals, setAgencyGoals] = useState(
    "• Rebranding aset digital premium.\n• Standardisasi konten social media.",
  );
  const [dosRules, setDosRules] = useState(
    "• Selalu sertakan logo Izin Kemenag.\n• Gunakan dokumentasi keberangkatan jamaah asli.",
  );
  const [dontsRules, setDontsRules] = useState(
    "• Jangan pernah menggunakan font Comic Sans.\n• Dilarang mengubah rasio logo tanpa izin.",
  );
  const [catatanPenting, setCatatanPenting] = useState(
    "• Kontrak kerja sama diperpanjang hingga Desember 2026.\n• Fokus Q4 adalah kampanye 'Umrah Nyaman Bersama Keluarga'.\n• Dilarang mengubah aset logo tanpa persetujuan Bpk. Dwi.",
  );

  // Card 2: Timeline & Agenda Awal
  const [startAt, setStartAt] = useState("2026-10-20T10:00");
  const [targetAt, setTargetAt] = useState("2026-10-25T10:00");
  const [briefJudul, setBriefJudul] = useState("Revisi Desain Spanduk Air Zam Zam — V3");
  const [briefRingkasan, setBriefRingkasan] = useState(
    "Client meminta dua perbaikan pada preview V3: ukuran logo dan kontras font.",
  );
  const [briefSpesifikasi, setBriefSpesifikasi] = useState(
    "Landscape 3m × 1m · Flexi 340gsm · mata ayam 4 sudut",
  );
  const [checklist, setChecklist] = useState<Array<{ text: string; note?: string; done: boolean }>>([
    { text: "Perbesar logo klien di bagian atas", note: "WA 10:42", done: false },
    { text: "Naikkan kontras font terhadap background", note: "Pin 2", done: false },
  ]);
  const [briefDeadline, setBriefDeadline] = useState("2026-10-28T15:00");
  const [briefPrioritas, setBriefPrioritas] = useState("Enterprise");
  const [briefPic, setBriefPic] = useState("DS");
  const [briefKonfirmasi, setBriefKonfirmasi] = useState(
    "ukuran logo yang diinginkan client belum disebut.",
  );

  // Card 3: Master Email & Custom Accounts
  const [masterEmail, setMasterEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recovery2fa, setRecovery2fa] = useState("");
  const [accounts, setAccounts] = useState<CustomAccountRow[]>([
    {
      id: crypto.randomUUID(),
      platform: "Instagram",
      username: "@sultanharamain_gresik",
      password: "••••••••",
      showPassword: false,
      note: "Hanya Admin",
    },
  ]);
  const [vaultNote, setVaultNote] = useState("");

  // Card 4: Dokumen Pendukung
  const [documents, setDocuments] = useState<File[]>([]);

  // Card 5: Klasifikasi & Penugasan
  const [status, setStatus] = useState("onhold");
  const [priority, setPriority] = useState("enterprise");
  const [tagsInput, setTagsInput] = useState("Umrah, Tour & Travel");

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
  const handleAIGenerate = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const p = aiPromptInput.trim() || "Sultan Haramain Gresik";
      const baseName = p.replace(/(https?:\/\/|www\.)/g, "").split(".")[0];
      const formattedName = baseName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      setName(formattedName || "Sultan Haramain Gresik");
      setLegalName(`PT. ${formattedName || "Sultan Barokah Haramain"} Cabang Gresik`);
      setIndustry("Travel Umrah & Haji Khusus");
      setEmail(`kontak@${baseName.toLowerCase().replace(/\s+/g, "") || "sultanharamain"}.com`);
      setPhone("0811-3107-707");
      setWebsite(`www.${baseName.toLowerCase().replace(/\s+/g, "") || "sultanharamaingresik"}.com`);
      setAddress("Jl. Samanhudi No. 37, Kebungson, Kec. Gresik, Jawa Timur 61114");

      setColor1("#C9A75D");
      setColor2("#003837");
      setToneOfVoice(
        `Gunakan bahasa formal namun hangat, religius tanpa kesan menggurui. Sering gunakan sapaan Sahabat ${formattedName || "Haramain"}.`,
      );
      setCompanyOverview(
        `${formattedName || "Sultan Barokah Haramain"} adalah biro perjalanan resmi penyedia layanan Umrah, Haji Khusus, serta distributor resmi paket perjalanan ibadah terpercaya.`,
      );
      setPainPoints(
        "• Desain promosi lama kaku dan kurang modern.\n• Pesan branding di media sosial belum terstandardisasi.",
      );
      setAgencyGoals(
        "• Rebranding aset digital & visual feed premium.\n• Standardisasi katalog promo dan landing page online.",
      );
      setDosRules(
        "• Selalu cantumkan nomor sertifikat izin resmi Kemenag.\n• Gunakan dokumentasi foto/video jemaah asli.",
      );
      setDontsRules(
        "• Jangan pernah menggunakan font tidak resmi atau kaku.\n• Dilarang mengubah rasio logo tanpa persetujuan tim.",
      );
      setCatatanPenting(
        `• Kontrak kerja sama aktif hingga Desember 2026.\n• Fokus Q4: Kampanye promo Umrah Ramadhan 1448H.\n• Dilarang merubah aset visual tanpa persetujuan manajemen.`,
      );

      setStartAt("2026-10-20T10:00");
      setTargetAt("2026-11-20T10:00");
      setBriefJudul(`Kampanye Branding & Launching Catalog ${formattedName}`);
      setBriefRingkasan(
        "Penyusunan aset visual, brosur cetak, dan landing page pemesanan paket Umrah.",
      );
      setBriefSpesifikasi("Digital Asset Pack + Landing Page Next.js + Brosur A5 3 Fold");
      setChecklist([
        { text: "Verifikasi Izin Kemenag & NPWP", note: "Legal", done: true },
        { text: "Rilis katalog paket promo terbaru", note: "Desain", done: false },
        { text: "Setup landing page pendaftaran online", note: "Dev", done: false },
      ]);
      setBriefDeadline("2026-11-15T15:00");
      setBriefPrioritas("Enterprise");
      setBriefPic("DS");
      setBriefKonfirmasi("Nomor kontak CS cabang perlu dikonfirmasi kembali.");

      setMasterEmail(`admin@${baseName.toLowerCase().replace(/\s+/g, "") || "sultanharamain"}.com`);
      setMasterPassword("SultanHaramain2026!");
      setRecoveryPhone("0812-3456-7890");
      setRecovery2fa("JBSWY3DPEHPK3PXP");

      setAccounts([
        {
          id: crypto.randomUUID(),
          platform: "Instagram",
          username: `@${baseName.toLowerCase().replace(/\s+/g, "") || "sultanharamain"}_official`,
          password: "••••••••",
          showPassword: false,
          note: "Main Admin",
        },
        {
          id: crypto.randomUUID(),
          platform: "WordPress Admin",
          username: "admin_web",
          password: "••••••••",
          showPassword: false,
          note: "CMS Portal",
        },
      ]);

      setIsGeneratingAI(false);
      toast.success("✨ Seluruh profil & timeline klien berhasil dibuat otomatis oleh AI!");
    }, 1000);
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
          industry: industry.trim() || tagsInput.trim() || undefined,
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

      // 3. Create Project & Initial Timeline Agenda
      const project = await saveProject({
        data: {
          name: `${name.trim()} - Proyek Utama`,
          description: briefRingkasan || `Timeline project: Start ${startAt} -> Target ${targetAt}. Priority: ${priority}`,
          clientId,
          status: status === "completed" ? "finished" : status === "active" ? "on-process" : "pending",
        },
      });

      // Save initial timeline events
      const timelineRows = [
        {
          user_id: userId,
          client_id: clientId,
          event_type: "project",
          title: briefJudul || "Kickoff Project & Setup Initial Agenda",
          description: briefRingkasan || "Kickoff meeting dan penyusunan struktur timeline.",
          occurred_at: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
          metadata: {
            project_id: project.id,
            spesifikasi: briefSpesifikasi,
            checklist,
            prioritas: briefPrioritas,
            pic: briefPic,
            konfirmasi: briefKonfirmasi,
          },
        },
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
        await supabase.from("client_timeline_events").insert(timelineRows);
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
          notes: [
            masterPassword ? `Password: ${masterPassword}` : null,
            recoveryPhone ? `Recovery HP: ${recoveryPhone}` : null,
            recovery2fa ? `2FA Secret: ${recovery2fa}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        });
      }

      accounts.forEach((acc) => {
        if (acc.platform.trim() || acc.username.trim() || acc.password.trim()) {
          digitalAssets.push({
            user_id: userId,
            client_id: clientId,
            asset_name: acc.platform.trim() || "Akun Klien",
            asset_type: "other",
            platform: acc.platform.trim() || null,
            username: acc.username.trim() || null,
            notes: [acc.password ? `Password: ${acc.password}` : null, acc.note ? `Note: ${acc.note}` : null]
              .filter(Boolean)
              .join(" | "),
          });
        }
      });

      if (digitalAssets.length) {
        await supabase.from("client_digital_assets").insert(digitalAssets);
      }

      // 5. Upload Supporting Documents
      for (const file of documents) {
        const path = await uploadPrivateFile(userId, clientId, file, "documents");
        await supabase.from("client_documents").insert({
          user_id: userId,
          client_id: clientId,
          title: file.name,
          document_type: "other",
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
        });
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
                    ✨ AI Smart Profile &amp; Timeline Generator
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ketik nama perusahaan, website, atau prompt singkat. AI akan mengisi profil, brand, timeline, dan kredensial secara otomatis!
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
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showMasterPassword ? "text" : "password"}
                              value={masterPassword}
                              onChange={(e) => setMasterPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full rounded-md border border-slate-200 bg-white py-2 pl-3 pr-10 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowMasterPassword(!showMasterPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showMasterPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
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
                            <div className="w-full md:w-1/4">
                              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                                Password
                              </label>
                              <input
                                type="password"
                                value={acc.password}
                                onChange={(e) =>
                                  setAccounts((rows) =>
                                    rows.map((row, i) =>
                                      i === index ? { ...row, password: e.target.value } : row,
                                    ),
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                              />
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
                      <option value="onhold">🔴 On Hold</option>
                      <option value="lead">🟡 New Lead / Prospek</option>
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
                      <option value="basic">Basic / Freelance Task</option>
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
