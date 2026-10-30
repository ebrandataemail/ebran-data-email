import { useState } from "react";
import { LoaderCircle, Mail, MessageCircle, Phone, ShieldUser, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { asset } from "@/data/asset";
import { aiGenerateNote } from "@/lib/assistant/assistant.functions";
import { CopyButton, FieldRow, Panel } from "../primitives";
import { errorMessage } from "../use-ai";

export function ProfileTab() {
  const p = asset.profile;
  const [note, setNote] = useState(p.note);
  const [generating, setGenerating] = useState(false);
  const wa = p.whatsapp.replace(/\D/g, "");

  const generateNote = useServerFn(aiGenerateNote);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await generateNote({ data: { draft: note } });
      setNote(res.note);
      toast("Catatan dibuat oleh AI", { icon: "✨" });
    } catch (err) {
      toast.error("AI gagal menulis catatan", { description: errorMessage(err) });
    } finally {
      setGenerating(false);
    }
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
            {generating ? "AI sedang menulis…" : "AI Auto-Generate Notes"}
          </Button>
        }
      >
        <div className="p-5">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            readOnly={generating}
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
