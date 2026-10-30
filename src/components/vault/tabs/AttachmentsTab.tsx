import { useRef, useState } from "react";
import { CloudUpload, Eye, FileImage, FileText, ScanText, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { asset, type Attachment } from "@/data/asset";
import { cn } from "@/lib/utils";
import { Panel } from "../primitives";

export function AttachmentsTab() {
  const [files, setFiles] = useState<Attachment[]>(asset.attachments);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const added: Attachment[] = Array.from(list).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      type: f.type.startsWith("image") ? "image" : "pdf",
      status: "processing",
    }));
    setFiles((prev) => [...added, ...prev]);
    toast("Hermes AI mulai memindai dokumen", { icon: "✨" });
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
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="relative flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-transform group-hover:-translate-y-0.5">
          <CloudUpload className="size-5 text-muted-foreground group-hover:text-ai-foreground" />
          <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gradient-ai shadow-ai">
            <Sparkles className="size-3 text-ai-contrast" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Drag & Drop files here.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ✨ <span className="font-medium text-ai-foreground">Hermes AI</span> will automatically extract data (OCR).
          </p>
        </div>
        <span className="text-xs text-muted-foreground/80">PDF, JPG, PNG · maks. 10 MB</span>
      </div>

      <Panel title="File Terlampir" description={`${files.length} dokumen`}>
        <ul className="divide-y divide-border">
          {files.map((f) => {
            const Icon = f.type === "image" ? FileImage : FileText;
            return (
              <li key={f.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-subtle">
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
                    {f.status === "processing" ? (
                      <Badge variant="ai-processing">Processing ✨</Badge>
                    ) : (
                      <Badge variant="muted" className="gap-1">
                        <ScanText className="size-3" />
                        {"fields" in f && f.fields} field diekstrak
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{f.size} · diunggah hari ini</span>
                </div>
                <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" aria-label={`Lihat ${f.name}`}>
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
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada lampiran.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
