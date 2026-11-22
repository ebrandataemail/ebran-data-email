import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, Mail, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type InboxMessage = {
  from: string;
  subject: string;
  receivedAt: string | null;
  verificationCode: string | null;
  codeDetected: boolean;
};

export function GmailInboxMonitor({ emailAccountId, email }: { emailAccountId: string; email: string }) {
  const [busy, setBusy] = useState<"connect" | "latest" | "disconnect" | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "reauth_required">("disconnected");
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const invoke = async (action: string) => {
    const { data, error } = await supabase.functions.invoke("gmail-oauth", {
      body: { action, emailAccountId },
    });
    if (error) throw new Error(error.message || "Permintaan Gmail gagal.");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const checkConnection = async () => {
    try {
      const data = await invoke("status");
      setConnected(Boolean(data.connected));
      setConnectionStatus(data.status === "reauth_required" ? "reauth_required" : data.connected ? "connected" : "disconnected");
      setConnectedEmail(data.googleEmail || null);
      setCheckedAt(data.lastCheckedAt || null);
    } catch {
      setConnected(false);
      setConnectionStatus("disconnected");
    }
  };

  useEffect(() => { void checkConnection(); }, [emailAccountId]);

  const connect = async () => {
    setBusy("connect");
    try {
      const data = await invoke("connect");
      if (!data.authorizationUrl) throw new Error("URL otorisasi Google tidak tersedia.");
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      toast.error("Tidak dapat menghubungkan Gmail", { description: error instanceof Error ? error.message : "Terjadi kesalahan." });
      setBusy(null);
    }
  };

  const checkLatest = async () => {
    setBusy("latest");
    try {
      const data = await invoke("latest");
      setConnected(true);
      setConnectionStatus("connected");
      setConnectedEmail(data.connectedEmail || email);
      setMessage(data.message || null);
      setCheckedAt(new Date().toISOString());
      if (!data.message) toast.info("Inbox tidak memiliki email masuk.");
    } catch (error) {
      await checkConnection();
      toast.error("Gagal mengecek inbox", { description: error instanceof Error ? error.message : "Terjadi kesalahan." });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await invoke("disconnect");
      setConnected(false);
      setConnectionStatus("disconnected");
      setConnectedEmail(null);
      setMessage(null);
      toast.success("Koneksi Gmail diputus.");
    } catch (error) {
      toast.error("Gagal memutus koneksi", { description: error instanceof Error ? error.message : "Terjadi kesalahan." });
    } finally {
      setBusy(null);
    }
  };

  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";

  return (
    // Berada di dalam tab (isi tab sudah punya padding): tanpa border, margin, atau card sendiri.
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground"><Mail className="size-4" /></span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground">Gmail Inbox Monitor</h4>
            <p className="text-xs text-muted-foreground">Cek email terbaru dan kode verifikasi tanpa membuka banyak akun.</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={connected ? "success" : "muted"}>
                {connected ? "Gmail terhubung" : connectionStatus === "reauth_required" ? "Perlu hubungkan ulang" : "Belum terhubung"}
              </Badge>
              {connectedEmail && <span className="break-all text-xs text-muted-foreground">{connectedEmail}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {connected ? (
            <>
              <Button size="sm" onClick={checkLatest} disabled={!!busy}>
                {busy === "latest" ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
                Cek Email Terbaru
              </Button>
              <Button size="sm" variant="outline" onClick={disconnect} disabled={!!busy}>
                <Unplug className="mr-1.5 size-3.5" /> Putuskan
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={connect} disabled={!!busy}>
              {busy === "connect" ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 size-3.5" />}
              Hubungkan Gmail
            </Button>
          )}
        </div>
      </div>

      {/* Email terbaru: area inset (tanpa border); kode verifikasi dipisah garis, bukan kotak lagi. */}
      {message && (
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 break-words text-sm font-medium text-foreground">{message.subject || "(Tanpa subjek)"}</p>
            <span className="text-xs text-muted-foreground">{formatDate(message.receivedAt)}</span>
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">Dari: {message.from || "—"}</p>
          {message.verificationCode ? (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Kode verifikasi terdeteksi</p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-foreground">{message.verificationCode}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(message.verificationCode!); toast.success("Kode disalin."); }}>
                <Copy className="mr-1.5 size-3.5" /> Salin
              </Button>
            </div>
          ) : <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Tidak ditemukan pola kode verifikasi pada email terbaru.</p>}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Check className="mr-1 inline size-3" /> Akses hanya-baca. Isi email dan kode tidak disimpan permanen. {checkedAt ? `Terakhir dicek: ${formatDate(checkedAt)}.` : "Pengecekan hanya berjalan saat tombol ditekan."}
      </p>
    </section>
  );
}
