import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleCheck, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeCsv } from "@/lib/vault/normalize";
import { vaultImportCsv } from "@/lib/vault/vault.functions";
import { errorMessage } from "../use-ai";
import { ACCOUNTS_KEY } from "./use-accounts";

type Report = Awaited<ReturnType<typeof vaultImportCsv>>;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-subtle px-3 py-2.5">
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const importFn = useServerFn(vaultImportCsv);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  // Local preview with the same normalizer the server uses (passwords stay in the browser until saved).
  const preview = useMemo(() => (file ? normalizeCsv(file.text) : null), [file]);

  const reset = () => {
    setFile(null);
    setReport(null);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) {
      toast.error("File terlalu besar (maks. 2 MB).");
      return;
    }
    setReport(null);
    setFile({ name: f.name, text: await f.text() });
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await importFn({ data: { csv: file.text } });
      setReport(res);
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success("Impor selesai", {
        description: `${res.added} akun baru · ${res.updated} diperbarui · ${res.projects} proyek`,
      });
    } catch (err) {
      toast.error("Impor gagal", { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const projects = preview?.accounts.reduce((n, a) => n + a.projects.length, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Impor & sinkronkan dari CSV</DialogTitle>
          <DialogDescription>
            Kolom: Link (email), Kode (password), Proyek Lovable, Link Lovable, Catatan. Email yang
            sudah ada akan diperbarui, bukan diduplikasi. Password dienkripsi sebelum disimpan.
          </DialogDescription>
        </DialogHeader>

        {!report && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-subtle px-4 py-5 text-left transition-colors hover:border-ai/60"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background">
              <FileSpreadsheet className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {file?.name ?? "Pilih file CSV"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Ekspor Google Sheets → File → Download → CSV
              </span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </button>
        )}

        {preview && !report && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Baris di file" value={preview.totalRows} />
              <Stat label="Akun unik" value={preview.accounts.length} />
              <Stat label="Proyek Lovable" value={projects} />
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {preview.cleaned.length > 0 && (
                <li>• {preview.cleaned.length} email dirapikan (titik/teks berlebih dihapus)</li>
              )}
              {preview.merged.length > 0 && (
                <li>• {preview.merged.length} baris duplikat digabung ke email yang sama</li>
              )}
              {preview.skipped.length > 0 && (
                <li className="text-destructive">
                  • {preview.skipped.length} baris dilewati (email tidak valid)
                </li>
              )}
              <li>• {preview.accounts.filter((a) => !a.password).length} akun tanpa password</li>
            </ul>
          </div>
        )}

        {report && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CircleCheck className="size-4 text-success" />
              Tersimpan ke database
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Akun baru" value={report.added} />
              <Stat label="Diperbarui" value={report.updated} />
              <Stat label="Proyek" value={report.projects} />
            </div>
            {[...report.cleaned, ...report.merged, ...report.skipped].length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-xs text-muted-foreground">
                {report.cleaned.map((i) => (
                  <li key={`c${i.row}`}>
                    <Badge variant="muted" className="mr-1.5 px-1.5 py-0">
                      baris {i.row}
                    </Badge>
                    {i.message}
                  </li>
                ))}
                {report.merged.map((i) => (
                  <li key={`m${i.row}`}>
                    <Badge variant="muted" className="mr-1.5 px-1.5 py-0">
                      baris {i.row}
                    </Badge>
                    {i.message}
                  </li>
                ))}
                {report.skipped.map((i) => (
                  <li key={`s${i.row}`} className="text-destructive">
                    <Badge variant="danger" className="mr-1.5 px-1.5 py-0">
                      baris {i.row}
                    </Badge>
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {report ? (
            <Button onClick={() => onOpenChange(false)}>Selesai</Button>
          ) : (
            <Button onClick={run} disabled={!preview?.accounts.length || busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {busy ? "Menyimpan…" : `Impor ${preview?.accounts.length ?? ""} akun`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
