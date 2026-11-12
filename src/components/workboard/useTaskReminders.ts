import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isClosed } from "./status";
import { dueLabel, effectiveDueMs, offsetLabel, type TaskReminder } from "./reminders";
import type { WorkboardTask } from "./useWorkboardData";

const TICK_MS = 30_000;
const LOUD_WINDOW_MS = 2 * 60 * 60 * 1000;

function pushNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.png" });
  } catch {
    /* some mobile browsers only allow notifications through a service worker */
  }
}

/**
 * Early-warning engine for scheduled tasks.
 * - loads reminders + exact deadlines (due_at) from Supabase and keeps them in sync (realtime)
 * - every 30s (and when the tab becomes visible) fires reminders that are due:
 *   in-app toast + browser notification, then marks them as "fired"
 * - ntfy reminders are claimed and delivered by the server-side Supabase Cron worker, even when the tab is closed.
 */
export function useTaskReminders(
  tasks: WorkboardTask[],
  clientName: (clientId: string) => string,
  onTasksChanged: () => Promise<void>,
) {
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [dueAtById, setDueAtById] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const firing = useRef(new Set<string>());
  const clientNameRef = useRef(clientName);
  const onChangedRef = useRef(onTasksChanged);
  const dueAtRef = useRef(dueAtById);
  clientNameRef.current = clientName;
  onChangedRef.current = onTasksChanged;
  dueAtRef.current = dueAtById;

  const refresh = useCallback(async () => {
    const [rem, due] = await Promise.all([
      (supabase.from("task_reminders" as any) as any)
        .select("id,task_id,remind_at,offset_minutes,channel,status,snoozed_until,fired_at,created_at")
        .order("remind_at", { ascending: true }),
      (supabase.from("client_tasks" as any) as any).select("id,due_at").not("due_at", "is", null),
    ]);
    if (rem.error) throw rem.error;
    if (due.error) throw due.error;
    setReminders((rem.data ?? []) as TaskReminder[]);
    setDueAtById(
      Object.fromEntries(((due.data ?? []) as { id: string; due_at: string }[]).map((r) => [r.id, r.due_at])),
    );
  }, []);

  useEffect(() => {
    let alive = true;
    refresh()
      .then(() => {
        if (!alive) return;
        setReady(true);
        setUnavailable(false);
      })
      .catch(() => {
        if (alive) setUnavailable(true);
      });
    const reload = () => {
      if (!alive) return;
      void refresh()
        .then(() => alive && setUnavailable(false))
        .catch(() => undefined);
    };
    const channel = supabase
      .channel("workboard-reminders")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_reminders" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_tasks" }, reload)
      .subscribe();
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  // Fire due reminders (claim first so a second open tab never double-notifies).
  useEffect(() => {
    if (!ready) return;
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const due = reminders.filter(
      (r) =>
        r.status === "pending" &&
        r.channel !== "ntfy" &&
        new Date(r.snoozed_until ?? r.remind_at).getTime() <= now &&
        !firing.current.has(r.id),
    );
    if (!due.length) return;
    due.forEach((r) => firing.current.add(r.id));

    void (async () => {
      const loud: { r: TaskReminder; task: WorkboardTask }[] = [];
      for (const r of due) {
        const task = taskById.get(r.task_id);
        if (!task) {
          firing.current.delete(r.id);
          continue;
        }
        const closed = isClosed(task.status);
        const { data, error } = await (supabase.from("task_reminders" as any) as any)
          .update(
            closed
              ? { status: "dismissed" }
              : { status: "fired", fired_at: new Date().toISOString() },
          )
          .eq("id", r.id)
          .eq("status", "pending")
          .select("id");
        if (error) {
          firing.current.delete(r.id);
          continue;
        }
        if (!data?.length || closed) continue;
        const age = Date.now() - new Date(r.snoozed_until ?? r.remind_at).getTime();
        if (age <= LOUD_WINDOW_MS) loud.push({ r, task });
      }

      if (loud.length > 3) {
        toast.warning(`${loud.length} pengingat task jatuh tempo`, {
          description: "Buka panel Peringatan Dini untuk detailnya.",
          duration: 20000,
        });
        pushNotification(
          `Pengingat: ${loud.length} task`,
          "Buka Workboard untuk melihat detailnya.",
          "workboard-reminders-batch",
        );
      } else {
        for (const { r, task } of loud) {
          const eff = effectiveDueMs(task, dueAtRef.current[task.id]);
          const detail = [
            clientNameRef.current(task.client_id),
            eff ? dueLabel(eff, Date.now()) : "",
          ]
            .filter(Boolean)
            .join(" · ");
          toast.warning(`Pengingat: ${task.title}`, {
            description: `${offsetLabel(r.offset_minutes)} · ${detail}`,
            duration: 20000,
          });
          pushNotification(`Pengingat: ${task.title}`, detail, `reminder-${r.id}`);
        }
      }
      void refresh().catch(() => undefined);
    })();
  }, [ready, reminders, tasks, now, refresh]);

  const saveSchedule = useCallback(
    async (input: { taskId: string; date: string; time: string; offsets: number[] }) => {
      const due = new Date(`${input.date}T${input.time}:00`);
      if (Number.isNaN(due.getTime())) throw new Error("Tanggal atau jam tidak valid.");

      const { data, error } = await (supabase.from("client_tasks" as any) as any)
        .update({
          due_date: input.date,
          due_at: due.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.taskId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Task tidak ditemukan atau akses ditolak oleh kebijakan keamanan.");

      const del = await (supabase.from("task_reminders" as any) as any)
        .delete()
        .eq("task_id", input.taskId)
        .eq("status", "pending");
      if (del.error) throw del.error;

      const unique = [...new Set(input.offsets)];
      const nowMs = Date.now();
      const rows = unique
        .map((minutes) => ({
          task_id: input.taskId,
          offset_minutes: minutes,
          remind_at: new Date(due.getTime() - minutes * 60_000).toISOString(),
          channel: "ntfy",
        }))
        .filter((row) => new Date(row.remind_at).getTime() > nowMs);
      if (rows.length) {
        const ins = await (supabase.from("task_reminders" as any) as any).insert(rows);
        if (ins.error) throw ins.error;
      }
      await Promise.all([refresh(), onChangedRef.current()]);
      return { created: rows.length, skipped: unique.length - rows.length };
    },
    [refresh],
  );

  const snooze = useCallback(
    async (id: string, minutes: number) => {
      const { error } = await (supabase.from("task_reminders" as any) as any)
        .update({
          status: "pending",
          snoozed_until: new Date(Date.now() + minutes * 60_000).toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      firing.current.delete(id);
      await refresh();
    },
    [refresh],
  );

  const dismiss = useCallback(
    async (id: string) => {
      const { error } = await (supabase.from("task_reminders" as any) as any)
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const removeReminder = useCallback(
    async (id: string) => {
      const { error } = await (supabase.from("task_reminders" as any) as any).delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return {
    reminders,
    dueAtById,
    ready,
    unavailable,
    now,
    saveSchedule,
    snooze,
    dismiss,
    removeReminder,
  };
}
