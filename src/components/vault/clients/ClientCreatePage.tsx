import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, CalendarClock, CloudUpload, FileText, ImagePlus, Plus, Save, ShieldCheck, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { workspaceSaveClient, workspaceSaveProject } from "@/lib/projects/projects.functions";

const KEY = ["workspace", "projects-clients"] as const;
type AccountDraft = { platform: string; username: string; url: string; note: string };
const emptyAccount = (): AccountDraft => ({ platform: "", username: "", url: "", note: "" });
const fieldClass = "h-10 rounded-md border-slate-200 text-sm focus-visible:ring-emerald-600";
const cardClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const labelClass = "text-xs font-semibold text-slate-700";

export function ClientCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveClient = useServerFn(workspaceSaveClient);
  const saveProject = useServerFn(workspaceSaveProject);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [companyProfile, setCompanyProfile] = useState("");
  const [scope, setScope] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [status, setStatus] = useState("active");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [targetAt, setTargetAt] = useState("");
  const [accounts, setAccounts] = useState<AccountDraft[]>([emptyAccount()]);
  const [documents, setDocuments] = useState<File[]>([]);

  const duration = useMemo(() => {
    if (!startAt || !targetAt) return "Lengkapi tanggal mulai dan target";
    const diff = new Date(targetAt).getTime() - new Date(startAt).getTime();
    if (!Number.isFinite(diff) || diff <= 0) return "Target harus setelah tanggal mulai";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${days} hari · ${hours} jam · ${minutes} menit`;
  }, [startAt, targetAt]);

  const chooseLogo = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Logo harus PNG/JPG/WEBP/SVG maksimal 2 MB");
      return;
    }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const addDocuments = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} melebihi batas 10 MB`);
        return false;
      }
      return true;
    });
    setDocuments((current) => [...current, ...accepted]);
  };

  const uploadPrivateFile = async (userId: string, clientId: string, file: File, folder: string) => {
    const safeName = file.name.replace(/[^\w.-]/g, "-");
    const path = `${userId}/${clientId}/${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("client-files").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw error;
    return path;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startAt && targetAt && new Date(targetAt) <= new Date(startAt)) {
      toast.error("Target penyelesaian harus setelah tanggal mulai");
      return;
    }
    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      const userId = authData.user.id;
      let logoPath: string | null = null;
      // Save the logo first so its path can be included in the client record.
      if (logo) {
        const safeName = logo.name.replace(/[^\w.-]/g, "-");
        logoPath = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("client-files").upload(logoPath, logo, { contentType: logo.type, upsert: false });
        if (error) throw error;
      }
      const saved = await saveClient({ data: {
        name, legalName, industry, contactEmail: email, contactPhone: phone, website,
        address, city, description, companyProfile, scopeOfWork: scope, internalNotes,
        clientStatus: status, logoPath,
      } });
      const clientId = saved.id;
      if (projectName.trim()) {
        const project = await saveProject({ data: { name: projectName.trim(), description: projectDescription, clientId, status: "active" } });
        const timelineRows = [
          startAt ? { user_id: userId, client_id: clientId, event_type: "project", title: "Project dimulai", description: projectName.trim(), occurred_at: new Date(startAt).toISOString(), metadata: { project_id: project.id, milestone: "start" } } : null,
          targetAt ? { user_id: userId, client_id: clientId, event_type: "project", title: "Target penyelesaian project", description: projectName.trim(), occurred_at: new Date(targetAt).toISOString(), metadata: { project_id: project.id, milestone: "target" } } : null,
        ].filter(Boolean);
        if (timelineRows.length) {
          const { error } = await (supabase.from("client_timeline_events" as any) as any).insert(timelineRows);
          if (error) throw error;
        }
      }
      const digitalAssets = accounts.filter((item) => item.platform.trim() || item.username.trim() || item.url.trim()).map((item) => ({
        user_id: userId, client_id: clientId, asset_name: item.platform.trim() || "Akun digital",
        asset_type: "other", platform: item.platform.trim() || null, username: item.username.trim() || null,
        asset_url: item.url.trim() || null, notes: item.note.trim() || null,
      }));
      if (digitalAssets.length) {
        const { error } = await (supabase.from("client_digital_assets" as any) as any).insert(digitalAssets);
        if (error) throw error;
      }
      for (const file of documents) {
        const path = await uploadPrivateFile(userId, clientId, file, "documents");
        const { error } = await (supabase.from("client_documents" as any) as any).insert({
          user_id: userId, client_id: clientId, title: file.name, document_type: "other",
          file_path: path, file_name: file.name, mime_type: file.type || null, file_size: file.size,
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Client berhasil dibuat");
      await navigate({ to: "/clients" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan client");
    } finally {
      setBusy(false);
    }
  };

  return <div className="min-h-screen bg-[#dce3e8]">
    <AppSidebar />
    <main className="lg:pl-64">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-[#f8fafc] shadow-2xl">
          <header className="flex items-center justify-between gap-3 bg-[#003837] px-4 py-3 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-600"><Building2 className="size-4"/></span>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-[#012625] px-3 py-2 font-semibold">＋ Tambah Klien</span>
                <button type="button" onClick={() => void navigate({to:"/clients"})} className="rounded px-3 py-2 text-slate-200 hover:bg-[#012a29]">Daftar Perusahaan</button>
              </div>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-950">{authInitials()}</span>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
            <div><h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Formulir Pendaftaran Klien & Proyek Baru</h1><p className="mt-1 text-xs text-slate-500">Lengkapi data perusahaan, kontak, timeline proyek, dan aset digital.</p></div>
            <Button type="button" variant="outline" size="sm" onClick={() => void navigate({to:"/clients"})}><ArrowLeft className="mr-1.5 size-3.5"/>Kembali</Button>
          </div>
          <form onSubmit={submit} className="p-4 sm:p-6">
            <div className="grid items-start gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <section className={cardClass}>
                  <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><Building2 className="size-4 text-emerald-600"/>Profil Utama Klien</h2>
                  <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <label className="flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-emerald-500">
                      {logoPreview ? <img src={logoPreview} alt="Preview logo" className="size-full object-cover"/> : <ImagePlus className="size-6"/>}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event)=>chooseLogo(event.target.files?.[0])}/>
                    </label>
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Logo / Foto Profil Perusahaan</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, atau SVG · Maks. 2 MB. Disimpan di bucket privat client-files.</p>{logo&&<button type="button" className="mt-2 text-xs font-semibold text-red-600" onClick={()=>{setLogo(null);setLogoPreview("");}}>Hapus logo</button>}</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2"><Label className={labelClass}>Nama Perusahaan / Merek *</Label><Input className={fieldClass} required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Sultan Haramain Gresik"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Nama Legal Perusahaan</Label><Input className={fieldClass} value={legalName} onChange={e=>setLegalName(e.target.value)} placeholder="PT / CV / Yayasan"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Industri</Label><Input className={fieldClass} value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="Travel, retail, pendidikan"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Email Kontak Resmi</Label><Input className={fieldClass} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="kontak@perusahaan.com"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Telepon / WhatsApp</Label><Input className={fieldClass} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xx-xxxx-xxxx"/></div>
                    <div className="space-y-1.5 md:col-span-2"><Label className={labelClass}>Website Utama</Label><Input className={fieldClass} type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://perusahaan.com"/></div>
                    <div className="space-y-1.5 md:col-span-2"><Label className={labelClass}>Alamat Lengkap Perusahaan</Label><Textarea rows={3} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Alamat kantor lengkap..."/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Kota</Label><Input className={fieldClass} value={city} onChange={e=>setCity(e.target.value)} placeholder="Gresik"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Deskripsi Singkat</Label><Input className={fieldClass} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ringkasan bisnis client"/></div>
                  </div>
                </section>
                <section className={cardClass}>
                  <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><CalendarClock className="size-4 text-blue-600"/>Timeline & Skala Proyek</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2"><Label className={labelClass}>Nama Project (opsional)</Label><Input className={fieldClass} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Contoh: Website & Digital Marketing"/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Tanggal Start Project</Label><Input className={fieldClass} type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} disabled={!projectName.trim()}/></div>
                    <div className="space-y-1.5"><Label className={labelClass}>Target Penyelesaian</Label><Input className={fieldClass} type="datetime-local" value={targetAt} onChange={e=>setTargetAt(e.target.value)} disabled={!projectName.trim()}/></div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 md:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Kalkulasi Jangka Waktu</p><p className="mt-1 font-mono text-sm font-bold text-emerald-900">{projectName.trim()?duration:"Isi nama project untuk mengaktifkan timeline"}</p><p className="mt-1 text-[10px] text-emerald-800">Tanggal start dan target akan disimpan sebagai aktivitas timeline client.</p></div>
                    <div className="space-y-1.5 md:col-span-2"><Label className={labelClass}>Deskripsi / Scope Project</Label><Textarea rows={3} value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="Tujuan dan ruang lingkup project..."/></div>
                  </div>
                </section>
                <section className={cardClass}>
                  <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><ShieldCheck className="size-4 text-rose-500"/>Daftar Aset Digital & Kredensial Klien</h2>
                  <p className="mb-4 text-xs leading-relaxed text-slate-500">Tambahkan platform, URL login, username, dan catatan hak akses. Password, API secret, dan kode 2FA tidak disimpan melalui formulir ini; simpan rahasia melalui Vault agar tidak tersimpan sebagai teks biasa.</p>
                  <div className="space-y-3">{accounts.map((account,index)=><div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <div className="space-y-1"><Label className="text-[10px]">Platform / URL Login</Label><Input className="h-9 bg-white text-xs" value={account.platform} onChange={e=>setAccounts(rows=>rows.map((row,i)=>i===index?{...row,platform:e.target.value}:row))} placeholder="Instagram / WordPress"/></div>
                    <div className="space-y-1"><Label className="text-[10px]">Username / ID</Label><Input className="h-9 bg-white text-xs" value={account.username} onChange={e=>setAccounts(rows=>rows.map((row,i)=>i===index?{...row,username:e.target.value}:row))} placeholder="@username / ID client"/></div>
                    <div className="space-y-1"><Label className="text-[10px]">URL</Label><Input className="h-9 bg-white text-xs" value={account.url} onChange={e=>setAccounts(rows=>rows.map((row,i)=>i===index?{...row,url:e.target.value}:row))} placeholder="https://..."/></div>
                    <div className="flex items-end gap-2"><div className="min-w-0 flex-1 space-y-1"><Label className="text-[10px]">Catatan / Hak Akses</Label><Input className="h-9 bg-white text-xs" value={account.note} onChange={e=>setAccounts(rows=>rows.map((row,i)=>i===index?{...row,note:e.target.value}:row))} placeholder="Admin / Editor"/></div><Button type="button" size="icon" variant="ghost" onClick={()=>setAccounts(rows=>rows.filter((_,i)=>i!==index))} aria-label="Hapus baris"><Trash2 className="size-4 text-red-500"/></Button></div>
                  </div>)}</div>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={()=>setAccounts(rows=>[...rows,emptyAccount()])}><Plus className="mr-1 size-3.5"/>Tambah Akun / Aset</Button>
                </section>
                <section className={cardClass}>
                  <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><FileText className="size-4 text-amber-500"/>Dokumen Pendukung</h2>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:border-blue-400 hover:bg-blue-50"><CloudUpload className="mb-2 size-7 text-blue-500"/><span className="text-xs font-bold text-slate-800">Klik untuk pilih dokumen</span><span className="mt-1 text-[10px] text-slate-500">PDF, DOCX, JPG, PNG · Maks. 10 MB per file<input type="file" multiple className="sr-only" onChange={e=>addDocuments(e.target.files)}/></span></label>
                  {documents.length>0&&<div className="mt-3 space-y-2">{documents.map((file,index)=><div key={index} className="flex items-center justify-between gap-2 rounded-md border bg-slate-50 p-2 text-xs"><span className="truncate">{file.name} · {(file.size/1048576).toFixed(2)} MB</span><button type="button" className="text-red-600" onClick={()=>setDocuments(rows=>rows.filter((_,i)=>i!==index))}>Hapus</button></div>)}</div>}
                </section>
                <section className={cardClass}>
                  <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><Building2 className="size-4 text-indigo-600"/>Profil & Catatan Internal</h2>
                  <div className="space-y-3"><div className="space-y-1.5"><Label className={labelClass}>Company Profile</Label><Textarea rows={4} value={companyProfile} onChange={e=>setCompanyProfile(e.target.value)} placeholder="Sejarah, produk/layanan, target pasar, keunggulan, positioning..."/></div><div className="space-y-1.5"><Label className={labelClass}>Scope of Work</Label><Textarea rows={4} value={scope} onChange={e=>setScope(e.target.value)} placeholder="Website, SEO, social media, ads, maintenance, reporting..."/></div><div className="space-y-1.5"><Label className={labelClass}>Catatan Internal</Label><Textarea rows={3} value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} placeholder="Catatan tim internal..."/></div></div>
                </section>
              </div>
              <aside className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
                <section className={cardClass}><h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><Tags className="size-4 text-purple-600"/>Klasifikasi & Penugasan</h2><div className="space-y-2"><Label className={labelClass}>Status Client</Label><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="active">Active Partner</option><option value="on-hold">On Hold</option><option value="prospect">New Lead / Prospek</option><option value="completed">Completed / Selesai</option><option value="inactive">Tidak Aktif</option></select></div><p className="mt-4 text-[11px] leading-relaxed text-slate-500">Client, project, milestone timeline, aset digital, dan dokumen akan disimpan ke workspace Supabase sesuai hak akses akun.</p></section>
                <section className={cardClass}><p className="mb-4 text-[11px] leading-relaxed text-slate-500">Periksa kembali informasi sebelum menyimpan. File disimpan di bucket privat dan metadata mengikuti kebijakan akses client.</p><div className="flex flex-col gap-2"><Button type="submit" disabled={busy||!name.trim()} className="bg-[#003837] font-bold text-white hover:bg-[#022e2d]"><Save className="mr-2 size-4"/>{busy?"Menyimpan...":"Simpan Klien Baru"}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>void navigate({to:"/clients"})}>Batalkan</Button></div></section>
              </aside>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>;
}

function authInitials() { return "ED"; }
