import { useState } from "react";
import { LoaderCircle, Mail, MessageCircle, Phone, ShieldUser, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { asset } from "@/data/asset";
import { CopyButton, FieldRow, Panel } from "../primitives";

const AI_NOTE =
  "Akun resmi komunitas Newton Badminton. Dipakai untuk posting jadwal mabar tiap Sabtu di GOR Galaxi (07.00–10.00 WIB), rekap skor, dan info pendaftaran member baru. Akses Super Admin dipegang Grey; login wajib via proxy Malang agar tidak memicu verifikasi ulang.";

export function ProfileTab() {
  const p = asset.profile;
  const [note, setNote] = useState(p.note);
  const [generating, setGenerating] = useState(false);
  const wa = p.whatsapp.replace(/\D/g, "");

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setNote(AI_NOTE);
      setGenerating(false);
      toast("Catatan dibuat oleh Hermes AI", { icon: "✨" });
    }, 1400);
  };

  return (
    <div className="space-y-6">
      <Panel title="Informasi Profil" description="Identitas dan kontak yang terhubung ke akun ini.">
        <div className="divide-y divide-border">
          <FieldRow icon={<ShieldUser />} label="Role / Akses">
            <Badge variant="muted">{p.role}</Badge>
          </FieldRow>
          <FieldRow icon={<Mail />} label="Email Login">
            <span>{p.emailLogin}</span>
            <CopyButton value={p.emailLogin} label="Email login" />
          </FieldRow>
          <FieldRow icon={<Phone />} label="No. HP Terhubung">
            <span className="tabular-nums">{p.phone}</span>
            <CopyButton value={p.phone} label="Nomor HP" />
          </FieldRow>
          <FieldRow icon={<MessageCircle />} label="WhatsApp Terhubung">
            <span className="tabular-nums">{p.whatsapp}</span>
            <Button variant="outline" size="xs" asChild>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle className="text-success" />
                Chat
              </a>
            </Button>
          </FieldRow>
        </div>
      </Panel>

      <Panel
        title="Deskripsi / Note"
        description="Konteks penggunaan akun untuk tim."
        action={
          <Button variant="ai-ghost" size="xs" onClick={generate} disabled={generating}>
            {generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {generating ? "Hermes sedang menulis…" : "AI Auto-Generate Notes"}
          </Button>
        }
      >
        <div className="p-5">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className={
              generating
                ? "ai-shimmer resize-none border-ai/40 text-sm leading-relaxed"
                : "resize-none bg-subtle text-sm leading-relaxed focus-visible:bg-background"
            }
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Markdown didukung</span>
            <span className="tabular-nums">{note.length} karakter</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
