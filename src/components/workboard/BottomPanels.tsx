import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DAY_MS,
  dateLabel,
  dueEnd,
  isClosed,
  shortDateLabel,
  statusMeta,
  urgencyOf,
} from "./status";
import type { WorkboardActivity, WorkboardClient, WorkboardTask } from "./useWorkboardData";

/* ---------------------------------------------------------------- Calendar */

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Day tint = same semantics as the rest of the board (urgency / review / has task). */
const tones = {
  soon: "bg-warning-soft text-warning-foreground",
  review: "bg-wb-purple-soft text-wb-purple",
  task: "bg-wb-blue-strong/10 text-wb-blue-strong",
} as const;

function toneOf(dayTasks: WorkboardTask[] | undefined): keyof typeof tones | null {
  if (!dayTasks?.length) return null;
  const open = dayTasks.filter((t) => !isClosed(t.status));
  if (
    open.some((t) => {
      const level = urgencyOf(t)?.level;
      return level === "late" || level === "soon";
    })
  ) {
    return "soon";
  }
  if (open.some((t) => t.status === "revision")) return "review";
  return "task";
}

export function CalendarPanel({
  tasks = [],
  activities = [],
}: {
  tasks?: WorkboardTask[];
  activities?: WorkboardActivity[];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const todayKey = localDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const prevDays = new Date(cursor.year, cursor.month, 0).getDate();
    const out: { day: number; current: boolean }[] = [];
    for (let i = offset - 1; i >= 0; i--) out.push({ day: prevDays - i, current: false });
    for (let day = 1; day <= days; day++) out.push({ day, current: true });
    let nextDay = 1;
    while (out.length % 7) out.push({ day: nextDay++, current: false });
    return out;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, WorkboardTask[]>();
    tasks.forEach((task) => {
      if (!task.due_date) return;
      grouped.set(task.due_date, [...(grouped.get(task.due_date) ?? []), task]);
    });
    return grouped;
  }, [tasks]);

  const activitiesByDate = useMemo(() => {
    const grouped = new Map<string, WorkboardActivity[]>();
    activities.forEach((activity) => {
      const key = localDateKey(activity.occurred_at);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), activity]);
    });
    return grouped;
  }, [activities]);

  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const selectedActivities = activitiesByDate.get(selectedDate) ?? [];

  function shift(delta: number) {
    setCursor((current) => {
      const month = current.month + delta;
      return { year: current.year + Math.floor(month / 12), month: ((month % 12) + 12) % 12 };
    });
    setSelectedDate("");
  }

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold tracking-tight text-wb-ink">Kalender</h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} task · {activities.length} aktivitas
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => shift(-1)}
          className="flex size-10 items-center justify-center rounded-lg border border-border text-wb-ink hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-wb-ink">
          {new Date(cursor.year, cursor.month, 1).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => shift(1)}
          className="flex size-10 items-center justify-center rounded-lg border border-border text-wb-ink hover:bg-muted"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
          <span key={day} className="pb-1 text-xs font-semibold text-muted-foreground">
            {day}
          </span>
        ))}
        {cells.map((cell, index) => {
          const dateKey = cell.current
            ? localDateKey(new Date(cursor.year, cursor.month, cell.day))
            : "";
          const tone = cell.current ? toneOf(tasksByDate.get(dateKey)) : null;
          const hasActivity = !!activitiesByDate.get(dateKey)?.length;
          const isSelected = !!dateKey && selectedDate === dateKey;
          const isToday = !!dateKey && dateKey === todayKey;
          return (
            <button
              key={index}
              type="button"
              disabled={!cell.current}
              onClick={() => setSelectedDate(dateKey)}
              aria-label={cell.current ? dateLabel(dateKey) : undefined}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold transition",
                !cell.current && "text-muted-foreground/40",
                cell.current && (tone ? tones[tone] : "bg-muted text-wb-ink"),
                cell.current && "hover:brightness-95",
                isToday && "border border-wb-ink",
                isSelected && "ring-2 ring-wb-ink ring-offset-1 ring-offset-card",
              )}
            >
              {cell.day}
              {hasActivity && <i className="absolute bottom-1 size-1 rounded-full bg-wb-orange" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded-sm bg-wb-blue-strong/10 ring-1 ring-wb-blue-strong/40" /> Ada task
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded-sm bg-warning-soft ring-1 ring-warning-foreground/40" /> Nyaris
          deadline / telat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded-sm bg-wb-purple-soft ring-1 ring-wb-purple/40" /> Review Client
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-1.5 rounded-full bg-wb-orange" /> Aktivitas
        </span>
      </div>
      {selectedDate && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-bold text-wb-ink">{dateLabel(selectedDate)}</p>
          {selectedTasks.map((task) => (
            <div key={task.id} className="mt-2 flex items-start justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 text-wb-ink">{task.title}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <i className={cn("size-2 rounded-full", statusMeta(task.status)?.dot)} />
                {statusMeta(task.status)?.title ?? task.status}
              </span>
            </div>
          ))}
          {selectedActivities.map((activity) => (
            <div key={activity.id} className="mt-2 border-l-2 border-wb-orange pl-2 text-xs">
              <p className="font-semibold text-wb-ink">{activity.title}</p>
              <p className="text-muted-foreground">
                {activity.event_type} ·{" "}
                {new Date(activity.occurred_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
          {!selectedTasks.length && !selectedActivities.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tidak ada deadline atau aktivitas tercatat pada tanggal ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Daftar Task */

type WorkFilter = "all" | "late" | "week";
const workFilters: { id: WorkFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "late", label: "Telat" },
  { id: "week", label: "Minggu ini" },
];
const PAGE = 6;

export function WorkListPanel({
  tasks,
  clients,
}: {
  tasks: WorkboardTask[];
  clients: WorkboardClient[];
}) {
  const [filter, setFilter] = useState<WorkFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const items = useMemo(() => {
    const now = Date.now();
    const filtered = tasks.filter((task) => {
      if (filter === "all") return true;
      if (isClosed(task.status) || !task.due_date) return false;
      if (filter === "late") return urgencyOf(task)?.level === "late";
      return dueEnd(task.due_date) - now <= 7 * DAY_MS;
    });
    return filtered.sort((a, b) => {
      const aDone = isClosed(a.status);
      const bDone = isClosed(b.status);
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aDue = a.due_date ?? "9999-12-31";
      const bDue = b.due_date ?? "9999-12-31";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [tasks, filter]);

  const visible = showAll ? items : items.slice(0, PAGE);
  const selected = items.find((task) => task.id === active) ?? items[0];

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold tracking-tight text-wb-ink">Daftar Task</h3>
        <span className="text-xs text-muted-foreground">Urut deadline</span>
      </div>
      <div className="mt-4 inline-flex gap-1 rounded-lg bg-muted p-1" role="tablist">
        {workFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setShowAll(false);
            }}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-bold transition",
              filter === f.id ? "bg-card text-wb-ink shadow-soft" : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {visible.map((task) => {
          const client = clientById.get(task.client_id);
          const meta = statusMeta(task.status);
          const urgency = urgencyOf(task);
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => setActive(task.id)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted/50",
                  selected?.id === task.id && "border-wb-ink/40 bg-muted/50",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wb-ink text-xs font-bold text-white">
                    {(client?.name ?? "C").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-wb-ink">{task.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {client?.name ?? "Client tidak ditemukan"}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
                    <i className={cn("size-2.5 rounded-full", meta?.dot ?? "bg-muted-foreground")} />
                    {meta?.title ?? task.status}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {urgency && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          urgency.className,
                        )}
                      >
                        {urgency.label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {task.due_date ? shortDateLabel(task.due_date) : "Tanpa deadline"}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {!items.length && (
          <li className="py-6 text-center text-xs text-muted-foreground">
            Tidak ada task untuk filter ini.
          </li>
        )}
      </ul>
      {items.length > PAGE && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {visible.length} dari {items.length} task
          </span>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-wb-blue-strong hover:underline"
          >
            {showAll ? "Ringkas" : "Lihat semua"}
          </button>
        </div>
      )}
      {selected && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-bold text-wb-ink">{selected.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected.description || "Tidak ada deskripsi."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            PIC: {selected.assignee || "Belum ditentukan"} · Prioritas: {selected.priority}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deadline: {selected.due_date ? dateLabel(selected.due_date) : "Belum ditentukan"} ·
            Diperbarui: {new Date(selected.updated_at).toLocaleString("id-ID")}
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- AI secretary */

const quickPrompts = [
  { label: "Task hari ini", text: "Ringkas semua task yang deadline-nya hari ini." },
  {
    label: "Task telat",
    text: "Tampilkan task yang sudah telat dan beri saran urutan pengerjaannya.",
  },
  { label: "Follow-up client", text: "Buatkan draf pesan follow-up yang sopan ke client." },
  {
    label: "Brief standar",
    text: "Susun brief standar (judul, ringkasan, spesifikasi, checklist revisi, deadline) dari catatan revisi client berikut:",
  },
];

export function AiSecretaryPanel() {
  const navigate = useNavigate();
  const copyPrompt = async (text: string) => {
    let copied = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copied = false;
    }
    toast(copied ? "Prompt disalin" : "Prompt siap dipakai", {
      description: text,
      action: { label: "Buka Tanya AI", onClick: () => void navigate({ to: "/ai" }) },
    });
  };
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-ai-soft text-ai-foreground">
          <Bot className="size-4" />
        </span>
        <h3 className="flex-1 text-base font-extrabold tracking-tight text-wb-ink">
          Tanya Sekretaris AI
        </h3>
      </div>
      <Link
        to="/ai"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-ai text-sm font-bold text-wb-ink shadow-ai transition hover:brightness-95"
      >
        <Bot className="size-4" /> Mulai Chat
      </Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-wb-ink">Prompt cepat</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {quickPrompts.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => void copyPrompt(p.text)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-wb-ink transition hover:bg-muted"
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        AI hanya menerima konteks yang sudah disaring dari password dan secret.
      </p>
    </div>
  );
}
