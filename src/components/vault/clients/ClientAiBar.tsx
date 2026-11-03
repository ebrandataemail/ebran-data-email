import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, MessageSquare, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aiGenerateClientProfile } from "@/lib/assistant/client-ai.functions";
import { errorMessage } from "../use-ai";

type Scope = "all" | "brand" | "overview" | "guardrails" | "notes";
const scopes: { id: Scope; label: string }[] = [
  { id: "all", label: "Seluruh profil" },
  { id: "brand", label: "Brand (warna, tone, tag)" },
  { id: "overview", label: "Overview & tujuan" },
  { id: "guardrails", label: "Guardrails (DO / DON'T)" },
  { id: "notes", label: "Catatan penting (rangkum aktivitas)" },
];

const textFields = [
  ["company_overview", "Overview perusahaan"],
  ["tone_of_voice", "Tone of voice"],
  ["pain_points", "Pain points"],
  ["agency_goals", "Tujuan agensi"],
  ["do_rules", "DO (wajib)"],
  ["dont_rules", "DON'T (pantangan)"],
  ["important_notes", "Catatan penting"],
] as const;
type TextKey = (typeof textFields)[number][0];

type Draft = Record<TextKey, string> & {
  primary_color: string;
  secondary_color: string;
  tags: string;
  missing_info: string[];
};

type BrandProfileTable = {
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("File tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

/**
 * Per-client AI actions: open the per-client chat and generate/save the brand profile.
 * AI output is always a draft the user reviews before it is saved.
 */
export function ClientAiBar({ clientId, clientName }: { clientId: string; clientName: string }) {
  const qc = useQueryClient();
  const generate = useServerFn(aiGenerateClientProfile);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [url, setUrl] = useState("");
  const [social, setSocial] = useState("");
  const [instruction, setInstruction] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const res = await generate({
        data: {
          clientId,
          scope,
          url: url.trim() || undefined,
          social: social.trim() || undefined,
          instruction: instruction.trim() || undefined,
          file: file
            ? { name: file.name, mediaType: file.type, base64: await toBase64(file) }
            : undefined,
        },
      });
      const p = res.profile;
      setDraft({
        company_overview: p.company_overview,
        tone_of_voice: p.tone_of_voice,
        pain_points: p.pain_points,
        agency_goals: p.agency_goals,
        do_rules: p.do_rules,
        dont_rules: p.dont_rules,
        important_notes: p.important_notes,
        primary_color: p.primary_color ?? "",
        secondary_color: p.secondary_color ?? "",
        tags: p.tags.join(", "),
        missing_info: p.missing_info,
      });
      toast.success("Draf profil dibuat. Periksa sebelum disimpan.");
    } catch (error) {
      toast.error("AI gagal membuat profil", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sesi login tidak ditemukan.");
      const values: Record<string, unknown> = { user_id: auth.user.id, client_id: clientId };
      for (const [key] of textFields) {
        const value = draft[key].trim();
        if (value) values[key] = value;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(draft.primary_color)) values["primary_color"] = draft.primary_color;
      if (/^#[0-9A-Fa-f]{6}$/.test(draft.secondary_color)) {
        values["secondary_color"] = draft.secondary_color;
      }
      const tags = draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tags.length) values["tags"] = tags;
      if (Object.keys(values).length <= 2) throw new Error("Tidak ada isi untuk disimpan.");
      const table = supabase.from("client_brand_profiles" as never) as unknown as BrandProfileTable;
      const { error } = await table.upsert(values, { onConflict: "client_id" });
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ["client-workspace-detail", clientId] });
      await qc.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success("Profil client disimpan.");
      setDraft(null);
      setOpen(false);
    } catch (error) {
      toast.error("Gagal menyimpan profil", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold leading-none text-slate-900">Asisten AI · {clientName}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tanya soal client ini, atau susun profil dari URL, file, dan data yang sudah ada.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/ai" search={{ assetId: "client:" + clientId }}>
              <MessageSquare className="mr-1.5 size-4" />
              Tanya AI
            </Link>
          </Button>
          <Button size="sm" onClick={() => setOpen((value) => !value)}>
            <Sparkles className="mr-1.5 size-4" />
            {open ? "Tutup" : "Generate Profil dengan AI"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-emerald-100 pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Bagian yang dibuat
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal"
              >
                {scopes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              URL website (opsional)
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://contoh.com"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Akun sosial (opsional)
              <input
                value={social}
                onChange={(e) => setSocial(e.target.value)}
                placeholder="@username"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              File brand guideline / brief (PDF, JPG, PNG, WEBP, TXT · maks. 8 MB)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs font-normal"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 md:col-span-2">
              Instruksi tambahan (opsional)
              <textarea
                rows={2}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Contoh: fokus ke audiens keluarga muda, hindari bahasa terlalu formal."
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm font-normal"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            AI hanya memakai data client ini dan sumber di atas. Isi dari URL atau file dianggap data,
            bukan perintah. Bagian tanpa dasar fakta dibiarkan kosong.
          </p>
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? (
              <LoaderCircle className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 size-4" />
            )}
            {busy ? "AI sedang menyusun…" : "Generate Draf"}
          </Button>

          {draft && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Draf AI — belum disimpan</h3>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  aria-label="Buang draf"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              </div>
              {draft.missing_info.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Perlu dikonfirmasi ke client:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {draft.missing_info.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {textFields.map(([key, label]) => (
                  <label key={key} className="space-y-1 text-xs font-semibold text-slate-700">
                    {label}
                    <textarea
                      rows={4}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm font-normal"
                    />
                  </label>
                ))}
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Warna utama (#RRGGBB)
                  <input
                    value={draft.primary_color}
                    onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Warna sekunder (#RRGGBB)
                  <input
                    value={draft.secondary_color}
                    onChange={(e) => setDraft({ ...draft, secondary_color: e.target.value })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                  Tag (pisahkan koma)
                  <input
                    value={draft.tags}
                    onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                  Buang
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? (
                    <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 size-4" />
                  )}
                  Simpan ke profil
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Hanya kolom yang terisi yang disimpan. Kolom kosong tidak menimpa profil yang sudah ada.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
