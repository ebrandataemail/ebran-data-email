import { supabase } from "@/integrations/supabase/client";
import { effectiveDueMs, localTimeKey } from "./reminders";

/** Alarm presets selected by default for a newly scheduled task (minutes before the deadline). */
export const DEFAULT_OFFSETS = [60, 15];

export type TaskSchedule = {
  /** "HH:MM" in device time, "" when the task has no time yet. */
  time: string;
  hasTime: boolean;
  /** Offsets (minutes before deadline) of the reminders that are still pending. */
  offsets: number[];
};

/**
 * Standalone schedule helpers used by the task form.
 * (The alert panel's hook has its own equivalent save path; both write the same tables.)
 */
export async function loadTaskSchedule(
  taskId: string,
  dueDate: string | null,
): Promise<TaskSchedule> {
  const [task, rem] = await Promise.all([
    (supabase.from("client_tasks" as any) as any).select("due_at").eq("id", taskId).maybeSingle(),
    (supabase.from("task_reminders" as any) as any)
      .select("offset_minutes")
      .eq("task_id", taskId)
      .eq("status", "pending"),
  ]);
  if (task.error) throw task.error;
  if (rem.error) throw rem.error;
  const eff = effectiveDueMs({ due_date: dueDate }, task.data?.due_at);
  if (!eff?.hasTime) return { time: "", hasTime: false, offsets: [...DEFAULT_OFFSETS] };
  const offsets = [
    ...new Set(((rem.data ?? []) as { offset_minutes: number }[]).map((r) => r.offset_minutes)),
  ].sort((a, b) => b - a);
  return { time: localTimeKey(new Date(eff.ms)), hasTime: true, offsets };
}

/** Sets the exact deadline time and replaces the task's pending reminders. */
export async function saveTaskSchedule(
  taskId: string,
  date: string,
  time: string,
  offsets: number[],
) {
  const due = new Date(`${date}T${time}:00`);
  if (Number.isNaN(due.getTime())) throw new Error("Tanggal atau jam tidak valid.");

  // Only due_at is written here; due_date was already saved with the task itself.
  const { data, error } = await (supabase.from("client_tasks" as any) as any)
    .update({ due_at: due.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Task tidak ditemukan atau akses ditolak oleh kebijakan keamanan.");

  const del = await (supabase.from("task_reminders" as any) as any)
    .delete()
    .eq("task_id", taskId)
    .eq("status", "pending");
  if (del.error) throw del.error;

  const nowMs = Date.now();
  const rows = [...new Set(offsets)]
    .map((minutes) => ({
      task_id: taskId,
      offset_minutes: minutes,
      remind_at: new Date(due.getTime() - minutes * 60_000).toISOString(),
      channel: "in_app",
    }))
    .filter((row) => new Date(row.remind_at).getTime() > nowMs);
  if (rows.length) {
    const ins = await (supabase.from("task_reminders" as any) as any).insert(rows);
    if (ins.error) throw ins.error;
  }
}

/** Removes the exact time and any pending reminders (the date-only deadline stays). */
export async function clearTaskSchedule(taskId: string) {
  const { error } = await (supabase.from("client_tasks" as any) as any)
    .update({ due_at: null, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
  const del = await (supabase.from("task_reminders" as any) as any)
    .delete()
    .eq("task_id", taskId)
    .eq("status", "pending");
  if (del.error) throw del.error;
}
