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
import { images, workItems, type WorkItem } from "./data";

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

export function CalendarPanel() {
  // October 2025 starts on a Wednesday, matching the reference grid (29, 30, 1…).
  const [cursor, setCursor] = useState({ year: 2025, month: 9 });
  const [selected, setSelected] = useState<number | null>(null);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const prevDays = new Date(cursor.year, cursor.month, 0).getDate();
    const out: { day: number; current: boolean }[] = [];
    for (let i = offset - 1; i >= 0; i--) out.push({ day: prevDays - i, current: false });
    for (let d = 1; d <= days; d++) out.push({ day: d, current: true });
    let n = 1;
    while (out.length % 7) out.push({ day: n++, current: false });
    return out;
  }, [cursor]);

  const isReferenceMonth = cursor.year === 2025 && cursor.month === 9;

  function shift(delta: number) {
    setSelected(null);
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  return (
    <div className="rounded-3xl bg-wb-beige p-3 shadow-card">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-wb-beige-deep px-4 py-2 text-[13px] font-semibold text-wb-ink">
          Calendar
        </span>
        <button
          type="button"
          aria-label="Catatan kalender"
          className="flex size-9 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink transition-colors hover:bg-wb-beige-deep"
        >
          <NotebookText className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Lainnya"
          className="ml-auto flex size-9 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink transition-colors hover:bg-wb-beige-deep"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => shift(-1)}
          className="flex size-8 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink transition-colors hover:bg-wb-beige-deep"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-[13px] font-semibold text-wb-ink">
          {monthNames[cursor.month]}
        </span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => shift(1)}
          className="flex size-8 items-center justify-center rounded-full border border-wb-beige-deep text-wb-ink transition-colors hover:bg-wb-beige-deep"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-[12px] font-medium text-wb-ink">
            {d}
          </span>
        ))}
        {cells.map((c, i) => {
          const tone = c.current && isReferenceMonth ? highlights[c.day] : undefined;
          const isSel = c.current && selected === c.day;
          return (
            <button
              key={i}
              type="button"
              disabled={!c.current}
              onClick={() => setSelected(c.day)}
              className={cn(
                "h-7 rounded-md text-[12px] transition",
                !c.current && "text-muted-foreground/60",
                c.current && !tone && "bg-card/70 text-wb-ink hover:bg-card",
                tone === "orange" && "bg-wb-orange text-brand-contrast",
                tone === "teal" && "bg-wb-teal text-brand-contrast",
                tone === "lavender" && "bg-wb-lavender text-wb-ink",
                isSel && "ring-2 ring-wb-ink ring-offset-1 ring-offset-wb-beige",
              )}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Work list */

const avatarColor: Record<WorkItem["color"], string> = {
  red: "bg-wb-red",
  pink: "bg-wb-pink",
  amber: "bg-wb-amber",
};

export function WorkListPanel() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState("w1");
  const items = workItems.filter(
    (w) => !q || `${w.name} ${w.preview}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-extrabold tracking-tight text-wb-ink">DAFTAR PEKERJAAN</h3>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[10px] text-wb-ink shadow-soft transition-colors hover:bg-muted"
        >
          Thursday, April 17th <ChevronDown className="size-3" />
        </button>
      </div>
      <label className="mt-2 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 shadow-soft">
        <Search className="size-3 text-wb-ink" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Task/Project/client."
          className="min-w-0 flex-1 bg-transparent text-[9px] font-semibold text-wb-ink outline-none placeholder:text-wb-ink"
        />
        <kbd className="rounded border border-border bg-muted px-1 font-mono text-[7px] text-muted-foreground">
          ⌘ K
        </kbd>
      </label>

      <ul className="mt-2 border-r border-border bg-card">
        {items.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => setActive(w.id)}
              className={cn(
                "flex w-full items-start gap-3 px-2 py-3.5 text-left transition-colors hover:bg-muted/60",
                active === w.id && "bg-muted/70",
              )}
            >
              <span className="relative shrink-0">
                {w.photo ? (
                  <img
                    src={w.photo}
                    alt=""
                    width={28}
                    height={28}
                    loading="lazy"
                    className="size-7 rounded-md object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md text-[9px] font-semibold text-brand-contrast",
                      avatarColor[w.color],
                    )}
                  >
                    {w.initials}
                  </span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-card bg-wb-orange" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-wb-ink">{w.name}</span>
                  <span className="shrink-0 text-[9.5px] text-muted-foreground">{w.time}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{w.preview}</span>
              </span>
            </button>
          </li>
        ))}
        {!items.length && (
          <li className="px-2 py-6 text-center text-[11px] text-muted-foreground">Tidak ada pekerjaan cocok.</li>
        )}
      </ul>
    </div>
  );
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
