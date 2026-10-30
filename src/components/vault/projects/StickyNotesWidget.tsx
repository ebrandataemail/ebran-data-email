import { useState, useEffect } from "react";
import { StickyNote, Plus, Trash2, Pin, X, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface NoteItem {
  id: string;
  content: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple";
  clientId?: string | undefined;
  clientName?: string | undefined;
  isPinned: boolean;
  createdAt: string;
}

const COLOR_CLASSES: Record<
  NoteItem["color"],
  { bg: string; border: string; text: string; pin: string }
> = {
  yellow: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-950 dark:text-amber-100",
    pin: "text-amber-600 dark:text-amber-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-950 dark:text-blue-100",
    pin: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-950 dark:text-emerald-100",
    pin: "text-emerald-600 dark:text-emerald-400",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/50",
    border: "border-pink-200 dark:border-pink-800",
    text: "text-pink-950 dark:text-pink-100",
    pin: "text-pink-600 dark:text-pink-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-950 dark:text-purple-100",
    pin: "text-purple-600 dark:text-purple-400",
  },
};

const STORAGE_KEY = "vault_kanban_sticky_notes_v1";

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: "note-1",
    content: "Follow up proposal kontrak Sultan Haramain Gresik jam 14:00 WIB.",
    color: "yellow",
    clientName: "Sultan Haramain Gresik",
    isPinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    content: "Cek token akses Google Ads & Meta Pixel sebelum launch campaign.",
    color: "blue",
    isPinned: false,
    createdAt: new Date().toISOString(),
  },
];

interface StickyNotesWidgetProps {
  clients: Array<{ id: string; name: string }>;
}

export function StickyNotesWidget({ clients }: StickyNotesWidgetProps) {
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    if (typeof window === "undefined") return DEFAULT_NOTES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  const [isOpen, setIsOpen] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState<NoteItem["color"]>("yellow");
  const [newClientId, setNewClientId] = useState<string>("none");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore storage errors
    }
  }, [notes]);

  const addNote = () => {
    if (!newContent.trim()) return;
    const client = clients.find((c) => c.id === newClientId);
    const item: NoteItem = {
      id: `note-${Date.now()}`,
      content: newContent.trim(),
      color: newColor,
      clientId: newClientId === "none" ? undefined : newClientId,
      clientName: client ? client.name : undefined,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [item, ...prev]);
    setNewContent("");
    setIsAdding(false);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const togglePin = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Catatan Tempel (Sticky Notes)
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {notes.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(!isAdding)}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 size-3.5" />
            Tambah Catatan
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Panel"
          >
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Form to Add Note */}
          {isAdding && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Buat Catatan Pengingat</span>
                <Button size="icon-sm" variant="ghost" onClick={() => setIsAdding(false)}>
                  <X className="size-3.5" />
                </Button>
              </div>
              <Textarea
                placeholder="Tulis pengingat cepat atau instruksi khusus client di sini…"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-16 text-xs bg-background"
                rows={2}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Warna:</span>
                  <div className="flex gap-1">
                    {(["yellow", "blue", "green", "pink", "purple"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={cn(
                          "size-5 rounded-full border transition-transform",
                          c === "yellow" && "bg-amber-300 border-amber-400",
                          c === "blue" && "bg-blue-300 border-blue-400",
                          c === "green" && "bg-emerald-300 border-emerald-400",
                          c === "pink" && "bg-pink-300 border-pink-400",
                          c === "purple" && "bg-purple-300 border-purple-400",
                          newColor === c && "ring-2 ring-primary scale-110",
                        )}
                        aria-label={`Warna ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={newClientId} onValueChange={setNewClientId}>
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue placeholder="Tautkan Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button size="sm" onClick={addNote} className="h-7 text-xs">
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Notes Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sortedNotes.map((note) => {
              const colorStyle = COLOR_CLASSES[note.color];
              return (
                <div
                  key={note.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-lg border p-3 shadow-xs transition-all hover:shadow-sm",
                    colorStyle.bg,
                    colorStyle.border,
                    colorStyle.text,
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      {note.clientName ? (
                        <span className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold">
                          <Tag className="size-2.5" />
                          {note.clientName}
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-60">Catatan Cepat</span>
                      )}

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => togglePin(note.id)}
                          className={cn(
                            "p-1 transition-opacity hover:opacity-100",
                            note.isPinned ? colorStyle.pin : "opacity-30 hover:opacity-70",
                          )}
                          title={note.isPinned ? "Lepas pin" : "Pin ke atas"}
                        >
                          <Pin className="size-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          className="p-1 opacity-30 transition-opacity hover:opacity-100 hover:text-destructive"
                          title="Hapus catatan"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-xs leading-relaxed font-sans">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-2 text-[10px] opacity-50 text-right">
                    {new Date(note.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              );
            })}

            {sortedNotes.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                Belum ada catatan tempel. Klik tombol &quot;Tambah Catatan&quot; untuk membuat
                pengingat task client.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
