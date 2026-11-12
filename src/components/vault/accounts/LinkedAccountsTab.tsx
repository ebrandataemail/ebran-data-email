import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { vaultDeleteLinkedAsset, vaultListLinkedAssets, vaultRevealLinkedAssetSecrets, vaultSaveLinkedAsset } from "@/lib/vault/vault.functions";
import { errorMessage } from "../use-ai";

const CATEGORIES = [
  { key: "social", label: "Social Media" },
  { key: "developer", label: "Website & Developer" },
  { key: "ads", label: "Ads & Marketing" },
  { key: "finance", label: "Finance & Payment" },
  { key: "contact", label: "Kontak" },
  { key: "entertainment", label: "Game & Hiburan" },
  { key: "ai_automation", label: "AI & Automation" },
  { key: "custom", label: "Custom Account" },
] as const;
type Category = (typeof CATEGORIES)[number]["key"];
type LinkedAsset = Awaited<ReturnType<typeof vaultListLinkedAssets>>[number];
type Draft = {
  provider: string; displayName: string; username: string; loginEmail: string; phone: string;
  websiteUrl: string; loginUrl: string; password: string; secret: string; status: string; note: string;
};
const EMPTY: Draft = { provider: "", displayName: "", username: "", loginEmail: "", phone: "", websiteUrl: "", loginUrl: "", password: "", secret: "", status: "manual", note: "" };
const KEY = (id: string) => ["vault", "linked-assets", id] as const;

export function LinkedAccountsTab({ emailAccountId }: { emailAccountId: string }) {
  const listFn = useServerFn(vaultListLinkedAssets);
  const saveFn = useServerFn(vaultSaveLinkedAsset);
  const revealFn = useServerFn(vaultRevealLinkedAssetSecrets);
  const deleteFn = useServerFn(vaultDeleteLinkedAsset);
  const client = useQueryClient();
  const [category, setCategory] = useState<Category>("social");
  const [editing, setEditing] = useState<LinkedAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<{ id: string; password: string | null; secret: string | null } | null>(null);

  const query = useQuery({ queryKey: KEY(emailAccountId), queryFn: () => listFn({ data: { emailAccountId } }), staleTime: 20_000 });
  const rows = query.data ?? [];
  const filtered = useMemo(() => rows.filter((row) => row.category === category), [rows, category]);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const startAdd = () => { setEditing(null); setDraft(EMPTY); setAdding(true); };
  const startEdit = (row: LinkedAsset) => {
    setEditing(row); setDraft({
      provider: row.provider, displayName: row.displayName, username: row.username ?? "",
      loginEmail: row.loginEmail ?? "", phone: row.phone ?? "", websiteUrl: row.websiteUrl ?? "",
      loginUrl: row.loginUrl ?? "", password: "", secret: "", status: row.status, note: row.note ?? "",
    }); setAdding(true); setShown(null);
  };
  const closeForm = () => { setAdding(false); setEditing(null); setDraft(EMPTY); };
  const patch = (key: keyof Draft, value: string) => setDraft((old) => ({ ...old, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      await saveFn({ data: {
        id: editing?.id ?? null, emailAccountId, category, provider: draft.provider,
        displayName: draft.displayName, username: draft.username || null, loginEmail: draft.loginEmail || null,
        phone: draft.phone || null, websiteUrl: draft.websiteUrl || null, loginUrl: draft.loginUrl || null,
        password: draft.password || null, secret: draft.secret || null, status: draft.status, note: draft.note || null,
      } });
      await client.invalidateQueries({ queryKey: KEY(emailAccountId) });
      toast.success(editing ? "Akun terkait diperbarui" : "Akun terkait ditambahkan");
      closeForm();
    } catch (error) { toast.error("Gagal menyimpan akun", { description: errorMessage(error) }); }
    finally { setBusy(false); }
  };

  const reveal = async (row: LinkedAsset) => {
    if (shown?.id === row.id) { setShown(null); return; }
    try { const value = await revealFn({ data: { id: row.id } }); setShown({ id: row.id, ...value }); }
    catch (error) { toast.error("Gagal membuka kredensial", { description: errorMessage(error) }); }
  };

  const remove = async (row: LinkedAsset) => {
    if (!window.confirm(`Hapus ${row.displayName} dari kategori ini?`)) return;
    try { await deleteFn({ data: { id: row.id } }); await client.invalidateQueries({ queryKey: KEY(emailAccountId) }); toast.success("Akun terkait dihapus"); }
    catch (error) { toast.error("Gagal menghapus", { description: errorMessage(error) }); }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Akun Digital Terkait</h3>
          <p className="text-sm text-muted-foreground">Kelola akun sosial, developer, pembayaran, kontak, hiburan, dan AI yang terkait dengan email induk ini.</p>
        </div>
        <Button size="sm" onClick={startAdd}><Plus className="size-4" /> Tambah Akun</Button>
      </div>

      <Tabs value={category} onValueChange={(value) => { setCategory(value as Category); closeForm(); setShown(null); }}>
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max flex-wrap justify-start">
            {CATEGORIES.map((item) => <TabsTrigger key={item.key} value={item.key} className="text-xs">
              {item.label} <span className="ml-1 text-muted-foreground">{rows.filter((row) => row.category === item.key).length}</span>
            </TabsTrigger>)}
          </TabsList>
        </div>
        {CATEGORIES.map((item) => <TabsContent key={item.key} value={item.key} className="mt-4 space-y-3">
          {adding && category === item.key && (
            <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{editing ? "Edit akun" : "Tambah akun baru"} · {item.label}</div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={closeForm}><X /></Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Platform / Provider *</Label><Input required value={draft.provider} onChange={(e) => patch("provider", e.target.value)} placeholder="Instagram, GitHub, BCA..." /></div>
                <div className="space-y-1.5"><Label>Nama akun / Label *</Label><Input required value={draft.displayName} onChange={(e) => patch("displayName", e.target.value)} placeholder="Nama akun atau identitas" /></div>
                <div className="space-y-1.5"><Label>Username / ID</Label><Input value={draft.username} onChange={(e) => patch("username", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Email login</Label><Input type="email" value={draft.loginEmail} onChange={(e) => patch("loginEmail", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Nomor telepon</Label><Input value={draft.phone} onChange={(e) => patch("phone", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Website</Label><Input value={draft.websiteUrl} onChange={(e) => patch("websiteUrl", e.target.value)} placeholder="https://..." /></div>
                <div className="space-y-1.5"><Label>URL Login</Label><Input value={draft.loginUrl} onChange={(e) => patch("loginUrl", e.target.value)} placeholder="https://..." /></div>
                <div className="space-y-1.5"><Label>Status</Label><Select value={draft.status} onValueChange={(value) => patch("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Dicatat manual</SelectItem><SelectItem value="connected">Terhubung / terverifikasi</SelectItem><SelectItem value="needs_attention">Perlu perhatian</SelectItem><SelectItem value="disabled">Nonaktif</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Password {editing ? "(kosongkan jika tidak diganti)" : ""}</Label><Input type="password" autoComplete="new-password" value={draft.password} onChange={(e) => patch("password", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>API Key / Token / Secret {editing ? "(kosongkan jika tidak diganti)" : ""}</Label><Input type="password" autoComplete="new-password" value={draft.secret} onChange={(e) => patch("secret", e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Catatan</Label><Textarea rows={3} value={draft.note} onChange={(e) => patch("note", e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeForm}>Batal</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />} Simpan Akun</Button></div>
              <p className="text-xs text-muted-foreground">Password dan API secret dienkripsi di server. Nilainya tidak dikirim kembali saat daftar akun dimuat.</p>
            </form>
          )}

          {query.isPending ? <div className="py-8 text-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Memuat akun terkait…</div> :
           query.isError ? <div className="py-8 text-center text-sm text-destructive">{errorMessage(query.error)} <Button variant="outline" size="sm" onClick={() => query.refetch()}>Coba lagi</Button></div> :
           filtered.length === 0 && !adding ? <div className="rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="font-medium">Belum ada akun di kategori {item.label}</p><p className="mt-1 text-sm text-muted-foreground">Tambahkan akun menggunakan formulir standar Ebran.</p><Button className="mt-3" variant="outline" size="sm" onClick={startAdd}><Plus className="size-4" /> Tambah Akun</Button></div> :
           filtered.map((row) => <div key={row.id} className="rounded-xl border bg-card p-4">
             <div className="flex flex-wrap items-start justify-between gap-3">
               <div className="min-w-0 space-y-1">
                 <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{row.displayName}</span><Badge variant={row.status === "connected" ? "success" : row.status === "needs_attention" ? "warning" : "muted"}>{row.status === "connected" ? "Terhubung" : row.status === "needs_attention" ? "Perlu perhatian" : row.status === "disabled" ? "Nonaktif" : "Manual"}</Badge><Badge variant="outline">{row.provider}</Badge></div>
                 <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                   {row.username && <span>@{row.username}</span>}{row.loginEmail && <span>{row.loginEmail}</span>}{row.phone && <span>{row.phone}</span>}
                 </div>
                 {row.loginUrl && <a href={row.loginUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{row.loginUrl}</a>}
                 {row.note && <p className="pt-1 text-sm text-muted-foreground">{row.note}</p>}
                 {shown?.id === row.id && <div className="mt-2 rounded-md bg-muted p-2 font-mono text-xs break-all">{shown.password && <div>Password: {shown.password}</div>}{shown.secret && <div>Secret: {shown.secret}</div>}{!shown.password && !shown.secret && "Tidak ada kredensial tersimpan."}<p className="mt-1 font-sans text-muted-foreground">Otomatis disembunyikan setelah 30 detik.</p></div>}
               </div>
               <div className="flex items-center gap-1">
                 {(row.hasPassword || row.hasSecret) && <Button size="icon-sm" variant="outline" aria-label="Tampilkan kredensial" onClick={() => reveal(row)}>{shown?.id === row.id ? <EyeOff /> : <Eye />}</Button>}
                 <Button size="icon-sm" variant="outline" aria-label="Edit akun" onClick={() => startEdit(row)}><Pencil /></Button>
                 <Button size="icon-sm" variant="ghost-danger" aria-label="Hapus akun" onClick={() => remove(row)}><Trash2 /></Button>
               </div>
             </div>
           </div>)}
        </TabsContent>)}
      </Tabs>
    </section>
  );
}
