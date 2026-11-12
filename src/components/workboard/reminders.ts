import { DAY_MS } from "./status";
import type { WorkboardTask } from "./useWorkboardData";

/** Reminder row from public.task_reminders. */
export type TaskReminder = {
  id: string;
  task_id: string;
  remind_at: string;
  offset_minutes: number;
  channel: "in_app" | "browser" | "email" | "ntfy";
  status: "pending" | "fired" | "dismissed";
  snoozed_until: string | null;
  fired_at: string | null;
  created_at: string;
};

/** Quick presets: how long before the deadline the alarm should ring. */
export const OFFSET_PRESETS = [
  { minutes: 1440, label: "1 hari sebelum" },
  { minutes: 180, label: "3 jam sebelum" },
  { minutes: 60, label: "1 jam sebelum" },
  { minutes: 15, label: "15 menit sebelum" },
  { minutes: 0, label: "Tepat waktu" },
] as const;

export const HOUR_MS = 60 * 60 * 1000;

export function localDateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localTimeKey(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Effective deadline of a task. due_at (date + time) is only trusted while its local date still
 * equals due_date; otherwise the deadline falls back to the end of due_date (23:59:59).
 */
export function effectiveDueMs(
  task: Pick<WorkboardTask, "due_date">,
  dueAt?: string | null,
): { ms: number; hasTime: boolean } | null {
  if (!task.due_date) return null;
  if (dueAt) {
    const d = new Date(dueAt);
    if (!Number.isNaN(d.getTime()) && localDateKey(d) === task.due_date) {
      return { ms: d.getTime(), hasTime: true };
    }
  }
  return { ms: new Date(task.due_date + "T23:59:59").getTime(), hasTime: false };
}

export function fmtDuration(totalMinutes: number) {
  const mins = Math.max(1, Math.round(totalMinutes));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return h ? `${d} hari ${h} jam` : `${d} hari`;
  if (h) return m ? `${h} jam ${m} menit` : `${h} jam`;
  return `${m} menit`;
}

export function offsetLabel(minutes: number) {
  return minutes === 0 ? "Tepat waktu deadline" : `${fmtDuration(minutes)} sebelum deadline`;
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Short human label for how close a deadline is, e.g. "Dalam 2 jam" / "Telat 3 jam" / "Besok". */
export function dueLabel(eff: { ms: number; hasTime: boolean }, now: number) {
  const diff = eff.ms - now;
  if (eff.hasTime) {
    return diff < 0 ? `Telat ${fmtDuration(-diff / 60000)}` : `Dalam ${fmtDuration(diff / 60000)}`;
  }
  if (diff < 0) return `Telat ${Math.floor(-diff / DAY_MS) + 1} hari`;
  const days = Math.round((startOfDay(eff.ms) - startOfDay(now)) / DAY_MS);
  if (days <= 0) return "Deadline hari ini";
  if (days === 1) return "Deadline besok";
  return `Deadline ${days} hari lagi`;
}

/** Absolute date/time label in the device time zone. */
export function whenLabel(ms: number, hasTime = true) {
  const d = new Date(ms);
  if (!hasTime) {
    return (
      d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) +
      " · tanpa jam"
    );
  }
  return d.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
