import type { WorkboardTask } from "./useWorkboardData";

/**
 * Single source of truth for task statuses, priorities and urgency.
 * Used by Task Board, Calendar and Daftar Task so labels and colors never drift.
 * Colors use design tokens only (see styles.css).
 */
export const taskStatuses = [
  { id: "things-to-do", title: "TERTUNDA", dot: "bg-warning" },
  { id: "queue-on-process", title: "ANTRIAN", dot: "bg-wb-cyan" },
  { id: "on-process", title: "ON PROSES", dot: "bg-wb-blue-strong" },
  { id: "pending", title: "PENDING", dot: "bg-muted-foreground" },
  { id: "revision", title: "REVIEW CLIENT", dot: "bg-wb-purple" },
  { id: "finished", title: "SELESAI", dot: "bg-success" },
  { id: "cancel", title: "CANCEL / STOP", dot: "bg-destructive" },
] as const;

export const taskPriorities = [
  { id: "low", label: "Rendah" },
  { id: "medium", label: "Sedang" },
  { id: "high", label: "Tinggi" },
] as const;

export const statusMeta = (id: string) => taskStatuses.find((s) => s.id === id);
export const isClosed = (status: string) => status === "finished" || status === "cancel";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const dueEnd = (value: string) => new Date(value + "T23:59:59").getTime();
export const dateLabel = (value: string) =>
  new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const shortDateLabel = (value: string) =>
  new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
export const isLate = (value: string | null) => !!value && dueEnd(value) < Date.now();

export type UrgencyLevel = "late" | "soon" | "safe" | "done" | "stopped";

/** The only semantic color in the task UI: urgency. */
export function urgencyOf(
  task: Pick<WorkboardTask, "status" | "due_date">,
): { level: UrgencyLevel; label: string; className: string } | null {
  if (task.status === "finished") {
    return { level: "done", label: "Selesai", className: "bg-success-soft text-success-foreground" };
  }
  if (task.status === "cancel") {
    return { level: "stopped", label: "Dihentikan", className: "bg-muted text-muted-foreground" };
  }
  if (!task.due_date) return null;
  const end = dueEnd(task.due_date);
  const now = Date.now();
  if (end < now) {
    const days = Math.floor((now - end) / DAY_MS) + 1;
    return {
      level: "late",
      label: "Telat " + days + " hari",
      className: "bg-destructive-soft text-destructive",
    };
  }
  if (end - now <= 2 * DAY_MS) {
    return {
      level: "soon",
      label: "Nyaris deadline",
      className: "bg-warning-soft text-warning-foreground",
    };
  }
  return { level: "safe", label: "Masih aman", className: "bg-success-soft text-success-foreground" };
}
