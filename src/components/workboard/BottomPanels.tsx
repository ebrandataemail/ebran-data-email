import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Bot,
  ChevronDown,
  Dribbble,
  Headset,
  Image as ImageIcon,
  MoreHorizontal,
  Music,
  NotebookText,
  PenLine,
  PenTool,
  Search,
  Shield,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { images } from "./data";
import type { WorkboardActivity, WorkboardClient, WorkboardTask } from "./useWorkboardData";

/* ---------------------------------------------------------------- Calendar */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Highlights from the reference design (October). */
const highlights: Record<number, "orange" | "teal" | "lavender"> = {
  2: "orange", 3: "orange",
  6: "teal", 9: "teal", 12: "teal", 15: "teal", 19: "teal", 24: "teal", 26: "teal", 27: "teal",
  18: "lavender", 21: "lavender", 29: "lavender",
};

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function CalendarPanel({
  tasks = [], activities = [],
}: {
  tasks?: WorkboardTask[];
  activities?: WorkboardActivity[];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));

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
    <div className="rounded-3xl bg-wb-beige p-3 shadow-card">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-wb-beige-deep px-4 py-2 text-[13px] font-semibold text-wb-ink">Kalender kerja</span>
        <span className="ml-auto text-[9px] text-muted-foreground">{tasks.length} task · {activities.length} aktivitas</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" aria-label="Bulan sebelumnya" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink hover:bg-wb-beige-deep"><ArrowLeft className="size-4" /></button>
        <span className="text-[13px] font-semibold text-wb-ink">{new Date(cursor.year, cursor.month, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Bulan berikutnya" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink hover:bg-wb-beige-deep"><ArrowRight className="size-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["S", "S", "R", "K", "J", "S", "M"].map((day, index) => <span key={index} className="pb-1 text-[11px] font-medium text-wb-ink">{day}</span>)}
        {cells.map((cell, index) => {
          const dateKey = cell.current ? localDateKey(new Date(cursor.year, cursor.month, cell.day)) : "";
          const hasTask = !!tasksByDate.get(dateKey)?.length;
          const hasActivity = !!activitiesByDate.get(dateKey)?.length;
          const isSelected = !!dateKey && selectedDate === dateKey;
          return (
            <button key={index} type="button" disabled={!cell.current} onClick={() => setSelectedDate(dateKey)}
              className={cn("relative flex h-9 flex-col items-center justify-center rounded-md text-[11px] transition",
                !cell.current && "text-muted-foreground/40",
                cell.current && "bg-card/70 text-wb-ink hover:bg-card",
                isSelected && "ring-2 ring-wb-ink ring-offset-1 ring-offset-wb-beige")}>
              {cell.day}
              {cell.current && (hasTask || hasActivity) && <span className="absolute bottom-1 flex gap-0.5">
                {hasTask && <i className="size-1 rounded-full bg-wb-blue-strong" />}
                {hasActivity && <i className="size-1 rounded-full bg-wb-orange" />}
              </span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full bg-wb-blue-strong" /> Deadline task</span>
        <span className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full bg-wb-orange" /> Aktivitas aktual</span>
      </div>
      {selectedDate && <div className="mt-3 border-t border-wb-beige-deep pt-3">
        <p className="text-[10px] font-bold text-wb-ink">{formatDate(selectedDate)}</p>
        {selectedTasks.map((task) => <div key={task.id} className="mt-2 flex items-start justify-between gap-2 text-[9px]">
          <span className="min-w-0 flex-1 text-wb-ink">{task.title}</span><span className="shrink-0 text-muted-foreground">{task.status}</span>
        </div>)}
        {selectedActivities.map((activity) => <div key={activity.id} className="mt-2 border-l-2 border-wb-orange pl-2 text-[9px]">
          <p className="font-semibold text-wb-ink">{activity.title}</p><p className="text-muted-foreground">{activity.event_type} · {new Date(activity.occurred_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>)}
        {!selectedTasks.length && !selectedActivities.length && <p className="mt-2 text-[9px] text-muted-foreground">Tidak ada deadline atau aktivitas tercatat pada tanggal ini.</p>}
      </div>}
    </div>
  );
}

/* ---------------------------------------------------------- Work list */

export function WorkListPanel({
  tasks, clients,
}: {
  tasks: WorkboardTask[];
  clients: WorkboardClient[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const today = localDateKey(new Date());
  const items = useMemo(() => {
    const filtered = tasks.filter((task) => !query || [
      task.title, task.description ?? "", task.assignee ?? "", clientById.get(task.client_id)?.name ?? "",
    ].join(" ").toLowerCase().includes(query.toLowerCase()));
    return filtered.sort((a, b) => {
      const aDone = ["finished", "cancel"].includes(a.status);
      const bDone = ["finished", "cancel"].includes(b.status);
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aDue = a.due_date ?? "9999-12-31";
      const bDue = b.due_date ?? "9999-12-31";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [tasks, query, clients]);
  const selected = items.find((task) => task.id === active) ?? items[0];

  function deadlineLabel(task: WorkboardTask) {
    if (!task.due_date) return "Tanpa deadline";
    if (task.due_date < today && !["finished", "cancel"].includes(task.status)) return "Terlambat";
    if (task.due_date === today) return "Hari ini";
    return formatDate(task.due_date);
  }

  return <div className="min-w-0">
    <div className="flex items-center justify-between gap-2"><h3 className="text-[15px] font-extrabold tracking-tight text-wb-ink">DAFTAR PEKERJAAN</h3><span className="rounded-full bg-card px-3 py-1 text-[10px] text-wb-ink shadow-soft">{items.length} task</span></div>
    <label className="mt-2 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 shadow-soft"><Search className="size-3 text-wb-ink"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari task / proyek / client" className="min-w-0 flex-1 bg-transparent text-[9px] font-semibold text-wb-ink outline-none placeholder:text-muted-foreground"/></label>
    <ul className="mt-2 border-r border-border bg-card">
      {items.slice(0, 12).map((task) => {
        const overdue = task.due_date && task.due_date < today && !["finished", "cancel"].includes(task.status);
        return <li key={task.id}><button type="button" onClick={() => setActive(task.id)} className={cn("flex w-full items-start gap-3 border-b border-border px-2 py-3 text-left hover:bg-muted/60", selected?.id === task.id && "bg-muted/70")}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-wb-blue text-[9px] font-bold text-wb-ink">{(clientById.get(task.client_id)?.name ?? "C").slice(0, 2).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="truncate text-[11px] font-semibold text-wb-ink">{task.title}</span><span className={cn("shrink-0 text-[8px]", overdue ? "font-bold text-destructive" : "text-muted-foreground")}>{deadlineLabel(task)}</span></span>
          <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{clientById.get(task.client_id)?.name ?? "Client tidak ditemukan"} · {task.status}</span>
          <span className="mt-1 block text-[8px] text-muted-foreground">Aktual diperbarui: {new Date(task.updated_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
        </button></li>;
      })}
      {!items.length && <li className="px-2 py-6 text-center text-[10px] text-muted-foreground">Belum ada task sesuai pencarian.</li>}
    </ul>
    {selected && <div className="mt-2 rounded-lg border bg-card p-3"><p className="text-[10px] font-bold text-wb-ink">{selected.title}</p><p className="mt-1 text-[9px] text-muted-foreground">{selected.description || "Tidak ada deskripsi."}</p><p className="mt-2 text-[9px] text-muted-foreground">PIC: {selected.assignee || "Belum ditentukan"} · Prioritas: {selected.priority}</p><p className="mt-1 text-[9px] text-muted-foreground">Deadline: {selected.due_date ? formatDate(selected.due_date) : "Belum ditentukan"} · Aktivitas terakhir: {new Date(selected.updated_at).toLocaleString("id-ID")}</p></div>}
  </div>;
}

/* -------------------------------------------------------- AI secretary */

const prompts = [
  { label: "Design", icon: PenLine },
  { label: "Sales", icon: TrendingUp },
  { label: "Sports", icon: Dribbble },
  { label: "Email", icon: AtSign },
  { label: "Music", icon: Music },
  { label: "Image", icon: ImageIcon },
];

const topics = [
  {
    title: "AI in Healthcare",
    body: "Smarter care powered by intelligent technology, transforming the way healthcare is delivered.",
    icon: Shield,
  },
  {
    title: "AI in Design",
    body: "Empowering designers to create faster, smarter, and more visually compelling with AI.",
    icon: PenTool,
  },
];

export function AiSecretaryPanel() {
  return (
    <div className="min-w-0 rounded-sm bg-gradient-to-b from-wb-cyan-soft via-card to-wb-cyan-soft p-2">
      <div className="flex items-center gap-2">
        <Headset className="size-6 text-wb-cyan" />
        <h3 className="flex-1 text-[11.5px] font-semibold text-wb-ink">Tanya Sekertaris AI Anda</h3>
        <img
          src={images.avatarMan}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          className="size-6 rounded-full object-cover"
        />
      </div>

      <Link
        to="/ai"
        className="mt-10 flex items-center justify-center gap-1.5 rounded-md bg-wb-cyan py-2 text-[11px] font-semibold text-wb-ink shadow-soft transition hover:brightness-95"
      >
        <Bot className="size-3.5" /> Start Chat
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-wb-ink">Popular Prompt</span>
        <Link to="/ai" className="text-[8.5px] font-semibold text-wb-ink hover:underline">
          View All
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {prompts.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => toast(`Prompt "${label}" dipilih`, { description: "Buka Tanya AI untuk memulai." })}
            className="flex items-center justify-center gap-0.5 rounded-md bg-muted py-1.5 text-[9.5px] font-semibold text-wb-ink transition-colors hover:bg-border"
          >
            {label}
            <Icon className="size-2.5 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-wb-ink">Popular Topics</span>
        <Link to="/ai" className="text-[8.5px] font-semibold text-wb-ink hover:underline">
          View All
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {topics.map(({ title, body, icon: Icon }) => (
          <Link
            key={title}
            to="/ai"
            className="relative rounded-lg bg-wb-cyan-soft p-2 shadow-soft transition hover:shadow-card"
          >
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-card text-wb-cyan">
              <ArrowUpRight className="size-2.5" />
            </span>
            <span className="flex size-5 items-center justify-center rounded-full bg-wb-cyan text-brand-contrast">
              <Icon className="size-2.5" />
            </span>
            <p className="mt-2 text-[8px] font-semibold text-wb-ink">{title}</p>
            <p className="text-[7.5px] font-medium leading-snug text-wb-ink">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
