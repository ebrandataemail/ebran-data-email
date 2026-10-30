import { useRef, useState } from "react";
import {
  CloudUpload,
  Eye,
  FileImage,
  FileText,
  ScanText,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { asset } from "@/data/asset";
import { aiExtractDocument } from "@/lib/assistant/assistant.functions";
import { cn } from "@/lib/utils";
import { CopyButton, Panel } from "../primitives";
import { errorMessage } from "../use-ai";

type OcrResult = Awaited<ReturnType<typeof aiExtractDocument>>;

type FileItem = {
  id: string;
  name: string;
  size: string;
  type: "pdf" | "image" | "other";
  status: "processing" | "done" | "error" | "unsupported";
  fields?: number;
  result?: OcrResult;
  error?: string;
};

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ f }: { f: FileItem }) {
  if (f.status === "processing") return <Badge variant="ai-processing">Processing ✨</Badge>;
  if (f.status === "error")
    return (
      <Badge variant="danger" className="gap-1">
        <TriangleAlert className="size-3" />
        Gagal dipindai
      </Badge>
    );
  if (f.status === "unsupported") return <Badge variant="muted">Tidak dipindai</Badge>;
  const count = f.result?.fields.length ?? f.fields ?? 0;
  return (
    <Badge variant="muted" className="gap-1">
      <ScanText className="size-3" />
      {count} field diekstrak
    </Badge>
  );
}

export function AttachmentsTab() {
  const extract = useServerFn(aiExtractDocument);
  const [files, setFiles] = useState<FileItem[]>(asset.attachments as FileItem[]);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<FileItem>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const scan = async (item: FileItem, file: File) => {
    try {
      const base64 = await readBase64(file);
      const result = await extract({ data: { fileName: file.name, mediaType: file.type, base64 } });
      update(item.id, { status: "done", result });
      toast.success(`${file.name} selesai dipindai`, {
        description: `${result.fields.length} field diekstrak · ${result.documentType}`,
      });
    } catch (err) {
      const message = errorMessage(err);
      update(item.id, { status: "error", error: message });
      toast.error(`Gagal memindai ${file.name}`, { description: message });
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const entries = Array.from(list).map((file, i) => {
      const isPdf = file.type === "application/pdf";
      const isImage = IMAGE_TYPES.includes(file.type);
      const tooBig = file.size > MAX_BYTES;
      const item: FileItem = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: formatSize(file.size),
        type: isPdf ? "pdf" : isImage ? "image" : "other",
        status: tooBig ? "error" : isPdf || isImage ? "processing" : "unsupported",
        ...(tooBig ? { error: "File lebih dari 8 MB." } : {}),
      };
      return { item, file };
    });
    setFiles((prev) => [...entries.map((e) => e.item), ...prev]);
    const toScan = entries.filter((e) => e.item.status === "processing");
    if (toScan.length) toast("AI mulai memindai dokumen", { icon: "✨" });
    if (entries.some((e) => e.item.status === "unsupported"))
      toast("Hanya PDF, JPG, dan PNG yang bisa dipindai.");
    if (entries.some((e) => e.item.error)) toast.error("Ada file lebih dari 8 MB yang dilewati.");
    toScan.forEach((e) => void scan(e.item, e.file));
  };

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-strong bg-subtle px-6 py-12 text-center transition-all hover:border-ai/60 hover:bg-ai-soft/50",
          dragging && "dropzone-active",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="relative flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-transform group-hover:-translate-y-0.5">
          <CloudUpload className="size-5 text-muted-foreground group-hover:text-ai-foreground" />
          <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gradient-ai shadow-ai">
            <Sparkles className="size-3 text-ai-contrast" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Drag & Drop files here.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ✨ <span className="font-medium text-ai-foreground">AI</span> will automatically extract
            data (OCR).
          </p>
        </div>
        <span className="text-xs text-muted-foreground/80">PDF, JPG, PNG · maks. 8 MB</span>
      </div>

      <Panel title="File Terlampir" description={`${files.length} dokumen`}>
        <ul className="divide-y divide-border">
          {files.map((f) => {
            const Icon = f.type === "image" ? FileImage : FileText;
            return (
              <li
                key={f.id}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-subtle"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                    f.type === "image"
                      ? "border-success/25 bg-success-soft text-success-foreground"
                      : "border-destructive/20 bg-destructive-soft text-destructive",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{f.name}</span>
                    <StatusBadge f={f} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {f.size} · {f.error ?? f.result?.summary ?? "diunggah hari ini"}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Lihat ${f.name}`}
                    disabled={!f.result}
                    title={f.result ? "Lihat hasil OCR" : "Belum ada hasil OCR"}
                    onClick={() => setViewing(f)}
                  >
                    <Eye />
                  </Button>
                  <Button
                    variant="ghost-danger"
                    size="icon-sm"
                    aria-label={`Hapus ${f.name}`}
                    onClick={() => {
                      setFiles((prev) => prev.filter((x) => x.id !== f.id));
                      toast(`${f.name} dihapus`);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
          {files.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Belum ada lampiran.
            </li>
          )}
        </ul>
      </Panel>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="size-4 text-ai" />
              {viewing?.result?.documentType ?? "Hasil OCR"}
            </DialogTitle>
            <DialogDescription>{viewing?.result?.summary}</DialogDescription>
          </DialogHeader>
          <dl className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {viewing?.result?.fields.map((field, i) => (
              <div
                key={`${field.label}-${i}`}
                className="grid grid-cols-[140px_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm"
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="break-words font-medium text-foreground">{field.value}</dd>
                <CopyButton value={field.value} label={field.label} />
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
