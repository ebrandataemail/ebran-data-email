import { useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  Check,
  Copy,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { boardColumns, images, type BoardColumn, type TimelineTask } from "./data";

export function TaskBoard({ query }: { query: string }) {
  const [columns, setColumns] = useState<BoardColumn[]>(boardColumns);
  const q = query.trim().toLowerCase();

  function remove(colId: string, taskId: string) {
    setColumns((cols) =>
      cols.map((c) =>
        c.id !== colId
          ? c
          : {
              ...c,
              groups: c.groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) })),
            },
      ),
    );
    toast("Task dihapus");
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.id} className="min-w-0">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-extrabold tracking-tight text-wb-ink">{col.title}</h3>
            <button
              type="button"
              aria-label={`Tambah task di ${col.title}`}
              onClick={() => toast(`Tambah task baru di ${col.title}`)}
              className="flex h-5 w-8 items-center justify-center rounded-md border border-dashed border-border-strong text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" />
            </button>
          </div>

          <FeaturedCard />

          <div className="relative mt-3 pl-1">
            <span className="absolute bottom-0 left-[9px] top-1 w-0.5 bg-border-strong" aria-hidden />
            {col.groups.map((g) => {
              const tasks = g.tasks.filter(
                (t) => !q || t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q),
              );
              if (!tasks.length) return null;
              return (
                <div key={g.date} className="mb-2">
                  <div className="relative flex items-center gap-2 py-1.5 pl-5">
                    <span className="absolute left-[5px] size-2.5 rotate-45 border border-border-strong bg-card" />
                    <span className="h-px w-2 bg-border-strong" />
                    <span className="text-[10px] text-muted-foreground">{g.date}</span>
                  </div>
                  <div className="space-y-2.5">
                    {tasks.map((t) => (
                      <TaskCard key={t.id} task={t} onDelete={() => remove(col.id, t.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function FeaturedCard() {
  return (
    <div className="mt-2 rounded-2xl bg-wb-green p-3 shadow-card">
      <div className="flex items-center gap-2">
        <img
          src={images.sultanEmblem}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          className="size-6 rounded-full border border-border bg-card object-cover"
        />
        <span className="text-[13px] font-medium text-wb-ink">Sultan Haramain Gresik</span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-destructive">
        <AlertTriangle className="size-4 fill-destructive text-card" />
        Telat : 1 Hari, 2 Jam, 30 Menit
      </p>
      <div className="mt-2 rounded-xl bg-card p-3 shadow-soft">
        <p className="text-[13px] font-medium text-wb-ink">Desain Label Air Zam Zam</p>
        <div className="mt-2 flex items-center justify-between text-[8px] text-wb-ink">
          <span>Desain</span>
          <span className="text-[10px] tracking-wider text-muted-foreground">85%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[85%] rounded-full bg-wb-teal" />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md bg-wb-teal py-0.5 pl-0.5 pr-2 text-brand-contrast">
          <span className="flex items-center gap-1 text-[8.5px]">
            <span className="flex size-3.5 items-center justify-center rounded-sm bg-card/20">
              <CalendarDays className="size-2.5" />
            </span>
            30 November 2026
          </span>
          <span className="text-[8px] font-bold">4 Hari Tersisa</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-wb-teal text-brand-contrast">
              <Briefcase className="size-2" />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-wb-ink">
              Office
            </span>
          </span>
          <ActionIcons onDelete={() => toast("Task utama tidak bisa dihapus dari sini")} />
        </div>
      </div>
    </div>
  );
}

const toneBg: Record<TimelineTask["tone"], string> = {
  green: "bg-wb-green",
  blue: "bg-wb-blue",
  yellow: "bg-wb-yellow",
};

const tagStyle: Record<TimelineTask["tag"], string> = {
  FREELANCE: "bg-wb-freelance",
  OFFICE: "bg-wb-office",
  LAINNYA: "bg-wb-other",
};

function StatusPill({ status }: { status: TimelineTask["status"] }) {
  if (status === "safe") {
    return (
      <span className="relative flex w-full max-w-[110px] items-center rounded-full border border-wb-green-strong py-1 pl-3 pr-2 text-[8.5px] font-bold text-wb-ink">
        <Check className="absolute -left-1 -top-1.5 size-3.5 text-wb-green-strong" strokeWidth={3} />
        Masih Aman
      </span>
    );
  }
  const isClient = status === "client";
  return (
    <span
      className={cn(
        "relative flex w-full max-w-[110px] items-center rounded-full border py-1 pl-2.5 pr-2 text-[8.5px] font-bold",
        isClient ? "border-destructive text-destructive" : "border-wb-yellow-strong text-wb-orange",
      )}
    >
      <span
        className={cn(
          "absolute -left-1 -top-2 text-[15px] font-black leading-none",
          isClient ? "text-destructive" : "text-wb-yellow-strong",
        )}
      >
        !
      </span>
      {isClient ? "Client Nanyain" : "Nyaris Deadline"}
    </span>
  );
}

function TaskCard({ task, onDelete }: { task: TimelineTask; onDelete: () => void }) {
  return (
    <div className="relative pl-6">
      <img
        src={task.avatar}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        className="absolute left-0 top-1 size-5 rounded-full border border-card object-cover shadow-soft"
      />
      <div className={cn("rounded-2xl p-2.5 shadow-soft transition hover:shadow-card", toneBg[task.tone])}>
        <p
          className={cn(
            "font-bold text-wb-ink",
            task.bigTitle ? "text-[13.5px]" : "text-[11px]",
          )}
        >
          {task.title}
        </p>
        <p className="mt-0.5 pl-1 text-[8.5px] italic leading-snug text-muted-foreground">
          {task.subtitle}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <StatusPill status={task.status} />
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "border-2 border-card/60 px-1.5 py-px text-[5.5px] font-bold tracking-[0.2em] text-brand-contrast shadow-soft",
                tagStyle[task.tag],
              )}
            >
              {task.tag}
            </span>
            <ActionIcons onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionIcons({ onDelete }: { onDelete: () => void }) {
  return (
    <span className="flex items-center gap-0.5 text-wb-ink">
      <IconBtn label="Lihat" onClick={() => toast("Membuka detail task")}>
        <Eye />
      </IconBtn>
      <IconBtn label="Duplikat" onClick={() => toast.success("Task diduplikat")}>
        <Copy />
      </IconBtn>
      <IconBtn label="Edit" onClick={() => toast("Mode edit task")}>
        <Pencil />
      </IconBtn>
      <IconBtn label="Hapus" onClick={onDelete}>
        <Trash2 />
      </IconBtn>
    </span>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded p-px transition-colors hover:bg-card/70 [&_svg]:size-2.5 [&_svg]:fill-current"
    >
      {children}
    </button>
  );
}
