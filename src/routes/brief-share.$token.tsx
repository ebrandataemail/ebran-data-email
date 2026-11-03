import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/brief-share/$token")({
  head: () => ({ meta: [{ title: "Client Brief · Ebran Data Email" }] }),
  component: SharedBriefPage,
});

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function SharedBriefPage() {
  const { token } = Route.useParams();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const tokenHash = await hashToken(token);
        const { data, error: rpcError } = await (supabase as any).rpc("get_shared_task_brief", { p_token_hash: tokenHash });
        if (rpcError) throw rpcError;
        if (!data) throw new Error("Tautan brief tidak valid, telah dicabut, atau sudah kedaluwarsa.");
        if (active) setBrief(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Brief tidak dapat dibuka.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function submitFeedback() {
    if (clientName.trim().length < 2) { toast.error("Masukkan nama Anda."); return; }
    if (brief?.permissions?.allow_comments && !comment.trim() && !decision) { toast.error("Masukkan komentar atau pilihan konfirmasi."); return; }
    if (!brief?.permissions?.allow_comments && !decision) { toast.error("Pilih konfirmasi jika tersedia."); return; }
    setSubmitting(true);
    try {
      const tokenHash = await hashToken(token);
      const { data, error: rpcError } = await (supabase as any).rpc("submit_shared_task_brief_feedback", {
        p_token_hash: tokenHash,
        p_client_name: clientName.trim(),
        p_comment: comment.trim() || null,
        p_decision: decision || null,
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error("Feedback tidak dapat dikirim. Periksa izin tautan atau masa berlakunya.");
      setSent(true);
      toast.success("Tanggapan berhasil dikirim.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim tanggapan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Membuka brief…</div></main>;
  if (error || !brief) return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><section className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-3 text-lg font-bold">Brief tidak tersedia</h1><p className="mt-2 text-sm text-muted-foreground">{error || "Tautan tidak valid."}</p></section></main>;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span><div><p className="text-xs font-bold text-muted-foreground">EBRAN DATA EMAIL</p><h1 className="text-base font-bold">Client Brief &amp; Scope</h1></div></div>
          <span className="rounded-full border border-border px-3 py-1 text-xs">Version {brief.version}</span>
        </header>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Shared task brief</p><h2 className="mt-1 text-2xl font-bold">{brief.title}</h2></div><button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Print / Save PDF</button></div>
          <p className="mt-2 text-xs text-muted-foreground">Dokumen ini dibagikan sebagai acuan scope dan hasil pekerjaan. Hanya informasi yang diizinkan pemilik brief yang ditampilkan.</p>
          <div className="mt-6 space-y-5">
            {(brief.sections ?? []).map((section: any) => <article key={section.key} className="border-t border-border pt-4"><h3 className="text-sm font-bold">{section.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{section.content || "—"}</p></article>)}
          </div>
          <div className="mt-6 border-t border-border pt-5"><h3 className="text-sm font-bold">Deliverables &amp; Acceptance Criteria</h3><div className="mt-3 space-y-3">{(brief.deliverables ?? []).map((item: any) => <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><span className="rounded-full bg-muted px-2 py-1 text-[10px] capitalize">{String(item.scope_type).replaceAll("_"," ")}</span></div><p className="mt-2 text-xs text-muted-foreground">{item.description}</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><p>Jumlah: <b>{item.quantity}</b></p><p>Format: <b>{item.format || "—"}</b></p><p>Revisi: <b>{item.revision_quota} putaran</b></p><p>Spesifikasi: <b>{item.specifications || "—"}</b></p></div>{item.acceptance_criteria?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{item.acceptance_criteria.map((criterion: string, index: number) => <li key={index}>{criterion}</li>)}</ul>}</article>)}</div></div>
        </section>
        {(brief.permissions?.allow_comments || brief.permissions?.allow_confirmation) && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" /><h3 className="text-base font-bold">Tanggapan Client</h3></div>{sent ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="size-5" /> Tanggapan Anda telah diterima dan dicatat.</div> : <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Nama Anda<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Nama pemberi tanggapan" /></label>{brief.permissions?.allow_comments && <label className="block text-xs font-semibold">Komentar / catatan<textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Tulis masukan atau pertanyaan…" /></label>}{brief.permissions?.allow_confirmation && <label className="block text-xs font-semibold">Konfirmasi brief<select value={decision} onChange={(e) => setDecision(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Belum memilih</option><option value="confirmed">Saya mengonfirmasi brief versi ini</option><option value="changes_requested">Saya meminta perubahan / klarifikasi</option></select></label>}<button type="button" onClick={() => void submitFeedback()} disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{submitting ? "Mengirim…" : "Kirim Tanggapan"}</button></div>}</section>}
        <p className="text-center text-[10px] text-muted-foreground">Tautan ini hanya menampilkan versi brief yang dibagikan. Persetujuan client dan approval internal dicatat sebagai peristiwa terpisah.</p>
      </div>
    </main>
  );
}
