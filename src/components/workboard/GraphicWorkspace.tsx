import { useState } from "react";
import {
  Bell,
  Bold,
  Calendar,
  CheckCircle2,
  Circle,
  CircleCheck,
  Clock,
  CloudDownload,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Send,
  Share2,
  Tag,
  Underline,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { images, initialChat, type ChatMessage } from "./data";
import type { WorkboardActivity, WorkboardClient, WorkboardDocument, WorkboardProject, WorkboardTask } from "./useWorkboardData";
import { supabase } from "@/integrations/supabase/client";

type Pin = { id: number; x: number; y: number; fresh?: boolean };

export function GraphicWorkspace({clients,projects,tasks,documents,activities}:{clients:WorkboardClient[];projects:WorkboardProject[];tasks:WorkboardTask[];documents:WorkboardDocument[];activities:WorkboardActivity[]}) {
  const client=clients[0];
  const project=projects[0];
  const clientTasks=tasks.filter(t=>t.client_id===client?.id);
  const clientDocs=documents.filter(d=>d.client_id===client?.id);
  const clientActivities=activities.filter(a=>a.client_id===client?.id).slice(0,3);
  async function openDocument(path:string){const {data,error}=await supabase.storage.from("client-files").createSignedUrl(path,300);if(error||!data?.signedUrl){toast.error(error?.message??"File tidak dapat dibuka");return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");}
  const [version, setVersion] = useState<"V1" | "V2" | "V3">("V3");
  const [pins, setPins] = useState<Pin[]>([
    { id: 1, x: 50, y: 22 },
    { id: 2, x: 50, y: 70 },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [draft, setDraft] = useState("");
  const [decision, setDecision] = useState<"approved" | "revision" | null>(null);

  function addPin(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = pins.length + 1;
    setPins((p) => [...p, { id, x, y, fresh: true }]);
    toast.success(`Pinpoint #${id} ditambahkan`, {
      description: "Tulis catatan revisi di kolom komentar.",
    });
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), author: "Client", initials: "CL", time: "Baru saja", text },
    ]);
    setDraft("");
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
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive" />
        </button>
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(200px,0.95fr)_minmax(0,1.85fr)_minmax(200px,0.85fr)]">
        {/* Left column: live client/project data */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-[13px] font-bold leading-snug text-wb-ink">{client?.legal_name||client?.name||"Belum ada client"} — Project &amp; Account Overview</h3>
            <dl className="mt-4 space-y-3 text-[11px]">
              <Row icon={<Clock />} label="Created time"><span className="font-semibold text-wb-ink">{project?new Date(project.created_at).toLocaleString("id-ID"):client?new Date(client.created_at).toLocaleDateString("id-ID"):"—"}</span></Row>
              <Row icon={<Circle className="fill-current" />} label="Project" smallIcon><span className="font-semibold text-wb-ink">{project?.name??"Belum ada proyek"}</span></Row>
              <Row icon={<CircleCheck />} label="Status"><span className="rounded-full bg-wb-purple-soft px-2 py-0.5 text-[10px] font-semibold text-wb-purple">{project?.status??client?.client_status??"—"}</span></Row>
              <Row icon={<Calendar />} label="Open Tasks"><span className="font-semibold text-wb-ink">{clientTasks.filter(t=>!["finished","cancel"].includes(t.status)).length} task</span></Row>
              <Row icon={<Tag />} label="Industri"><span className="font-semibold text-wb-ink">{client?.industry??"—"}</span></Row>
              <Row icon={<User />} label="PIC"><span className="font-semibold text-wb-ink">{client?.contact_name??"—"}</span></Row>
            </dl>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-3 py-2 text-muted-foreground"><FileText className="size-3.5"/><span className="text-[11px] font-semibold text-wb-ink">Client Brief &amp; Scope</span></div>
            <div className="space-y-2 p-3">
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{client?.company_profile||client?.description||"Profil client belum diisi."}</p>
              <div className="border-l-2 border-wb-blue pl-2 text-[11px] leading-relaxed text-muted-foreground"><b className="text-wb-ink">Scope of Work:</b><p className="whitespace-pre-wrap">{client?.scope_of_work||project?.description||"Belum ada scope of work."}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold text-wb-ink"><Paperclip className="size-3.5 text-wb-blue-strong"/> Dokumen Client</h4>
            <div className="mt-3 space-y-2">
              {clientDocs.map(doc=><button key={doc.id} type="button" onClick={()=>void openDocument(doc.file_path)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:bg-muted">
                <span className="flex size-6 items-center justify-center rounded bg-wb-blue/40 text-wb-blue-strong"><FileText className="size-3.5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-wb-ink">{doc.title||doc.file_name}</span><span className="block text-[9px] text-muted-foreground">{doc.document_type} · {doc.file_name}</span></span><CloudDownload className="size-3.5 text-muted-foreground"/>
              </button>)}
              {!clientDocs.length&&<p className="rounded-lg border border-dashed p-3 text-center text-[10px] text-muted-foreground">Belum ada dokumen untuk client ini.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="text-[11px] font-semibold text-wb-ink">Aktivitas Terbaru</h4>
            <div className="mt-2 space-y-2">{clientActivities.map(a=><div key={a.id} className="border-l-2 border-wb-blue pl-2"><p className="text-[10px] font-semibold text-wb-ink">{a.title}</p><p className="text-[9px] text-muted-foreground">{new Date(a.occurred_at).toLocaleString("id-ID")} · {a.event_type}</p></div>)}{!clientActivities.length&&<p className="text-[9px] text-muted-foreground">Belum ada aktivitas client.</p>}</div>
          </div>
        </div>

        {/* Center: design preview */}
        <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-wb-ink">Design Preview</h3>
            <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
              {(["V1", "V2", "V3"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                    version === v
                      ? "bg-card font-bold text-wb-ink shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex min-h-[420px] flex-1 flex-col rounded-lg bg-muted/60 p-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[9px] font-medium text-wb-ink shadow-soft">
              <MapPin className="size-3 text-wb-blue-strong" />
              Click area gambar untuk memberikan catatan revisi (Pinpoint)
            </span>
            <div
              role="button"
              tabIndex={0}
              aria-label="Tambah pinpoint revisi"
              onClick={addPin}
              onKeyDown={(e) => e.key === "Enter" && toast("Klik dengan mouse untuk menaruh pinpoint")}
              className="group relative mx-auto mt-2 w-[92%] cursor-crosshair"
            >
              <img
                src={images.labelV3}
                alt={`Desain label Air Zam Zam Sultan Haramain — versi ${version}`}
                width={1440}
                height={800}
                className={cn(
                  "block w-full shadow-card transition",
                  version === "V1" && "grayscale",
                  version === "V2" && "saturate-50",
                )}
              />
              {pins.map((p) => (
                <span
                  key={p.id}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className={cn(
                    "absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-wb-blue-strong text-[9px] font-bold text-brand-contrast shadow-card transition-opacity",
                    p.fresh ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {p.id}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="text-[11px] font-semibold text-wb-ink">Gatekeepers (Action)</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDecision("approved");
                  toast.success("Desain disetujui");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md bg-wb-green-strong px-2 py-2 text-[10px] font-semibold text-brand-contrast transition hover:brightness-95",
                  decision === "approved" && "ring-2 ring-wb-green-strong/40 ring-offset-1",
                )}
              >
                <CheckCircle2 className="size-3.5" /> Approve Desain
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecision("revision");
                  toast("Permintaan revisi dikirim");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border border-border-strong bg-card px-2 py-2 text-[10px] font-medium text-wb-ink transition hover:bg-muted",
                  decision === "revision" && "border-wb-orange text-wb-orange",
                )}
              >
                <MessageSquare className="size-3.5" /> Ajukan Revisi
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <h4 className="text-[11px] font-semibold text-wb-ink">Omnichannel &amp; Automations</h4>
            <div className="mt-2 space-y-1.5">
              <AutoButton icon={<MessageCircle className="text-wb-green-strong" />} label="Kirim Notifikasi WA (Auto)" />
              <AutoButton icon={<Mail className="text-wb-blue-strong" />} label="Kirim Email Detail & Invoice" />
              <div className="border-t border-border pt-1.5">
                <AutoButton icon={<Share2 className="text-muted-foreground" />} label="Bagikan Preview via WA" />
              </div>
              <button
                type="button"
                disabled
                className="w-full rounded-md bg-muted px-2 py-1.5 text-[9px] font-medium text-muted-foreground/70"
              >
                Posting ke IG/FB
              </button>
            </div>
          </div>

          <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <h4 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11px] font-semibold text-wb-ink">
              <MessageSquare className="size-3.5 text-wb-blue-strong" /> Sistem Komunikasi Interaktif
            </h4>
            <div className="wb-hex-pattern flex-1 space-y-3 overflow-y-auto p-2.5">
              {messages.map((m) =>
                m.author === "Designer" ? (
                  <div key={m.id} className="flex gap-1.5">
                    <Initials text={m.initials} className="mt-0.5 bg-wb-ink" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-wb-ink">
                        {m.author} <span className="ml-1 font-normal text-muted-foreground">{m.time}</span>
                      </p>
                      <p className="mt-1 rounded-lg border border-border bg-card p-2 text-[9.5px] leading-relaxed text-wb-ink shadow-soft">
                        {m.text}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex flex-row-reverse gap-1.5">
                    <Initials text={m.initials} className="mt-0.5 bg-wb-purple" />
                    <div className="min-w-0 flex-1">
                      <p className="text-right text-[8px] text-muted-foreground">
                        {m.time} <span className="ml-1 text-[9px] font-bold text-wb-ink">{m.author}</span>
                      </p>
                      <div className="mt-1 rounded-lg border border-border bg-card p-2 shadow-soft">
                        {m.pin !== undefined && (
                          <div className="mb-1 flex items-center gap-1">
                            <span className="flex size-3.5 items-center justify-center rounded-full bg-wb-blue-strong text-[7px] font-bold text-brand-contrast">
                              {m.pin}
                            </span>
                            <span className="rounded border border-border bg-muted px-1 py-px text-[7px] text-muted-foreground">
                              Pin Point di area gambar
                            </span>
                          </div>
                        )}
                        <p className="text-[9.5px] leading-relaxed text-wb-ink">{m.text}</p>
                        <div className="mt-2 h-px bg-border" />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-border p-2"
            >
              <div className="flex items-center rounded-full border border-border bg-muted/60 px-3 py-1.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Kirim komentar umum (non-pin)..."
                  className="min-w-0 flex-1 bg-transparent text-[10px] text-wb-ink outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" aria-label="Kirim" className="text-wb-blue-strong hover:opacity-80">
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
  smallIcon,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  smallIcon?: boolean;
}) {
  return (
    <div className="grid grid-cols-[78px_1fr] items-start gap-2">
      <dt className="flex items-start gap-1.5 text-muted-foreground">
        <span
          className={cn(
            "mt-px flex shrink-0 items-center justify-center [&_svg]:size-3",
            smallIcon && "[&_svg]:size-1.5 mt-1 w-3",
          )}
        >
          {icon}
        </span>
        <span className="leading-tight">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Initials({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-card text-[7px] font-bold text-brand-contrast",
        className,
      )}
    >
      {text}
    </span>
  );
}

function FileRow({ name, size, kind }: { name: string; size: string; kind: "pdf" | "image" }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded",
          kind === "pdf" ? "bg-destructive/10 text-destructive" : "bg-wb-blue/40 text-wb-blue-strong",
        )}
      >
        {kind === "pdf" ? <FileText className="size-3.5" /> : <ImageIcon className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-semibold text-wb-ink">{name}</p>
        <p className="text-[9px] text-muted-foreground">{size}</p>
      </div>
      <button
        type="button"
        aria-label={`Unduh ${name}`}
        onClick={() => toast(`Mengunduh ${name}`)}
        className="flex size-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CloudDownload className="size-3" />
      </button>
    </div>
  );
}

function AutoButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={() => toast.success(label, { description: "Otomasi dijalankan (simulasi)." })}
      className="flex w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-left text-[9.5px] font-medium text-wb-ink transition-colors hover:bg-muted [&_svg]:size-3"
    >
      {icon}
      {label}
    </button>
  );
}
