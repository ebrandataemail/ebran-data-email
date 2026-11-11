-- Task schedule (time of day) + reminders: early-warning foundation v1.
-- Idempotent on purpose so it is safe to re-run.
ALTER TABLE public.client_tasks ADD COLUMN IF NOT EXISTS due_at timestamptz;

CREATE TABLE IF NOT EXISTS public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL,
  remind_at timestamptz NOT NULL,
  offset_minutes integer NOT NULL DEFAULT 0 CHECK (offset_minutes BETWEEN 0 AND 525600),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','browser','email')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fired','dismissed')),
  snoozed_until timestamptz,
  fired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_reminders_task_owner_fkey FOREIGN KEY (task_id,user_id)
    REFERENCES public.client_tasks(id,user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS task_reminders_owner_status_remind_idx
  ON public.task_reminders(user_id,status,remind_at);
CREATE INDEX IF NOT EXISTS task_reminders_task_owner_idx
  ON public.task_reminders(task_id,user_id);

ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reminders TO authenticated;

DROP POLICY IF EXISTS task_reminders_select_own ON public.task_reminders;
DROP POLICY IF EXISTS task_reminders_insert_own ON public.task_reminders;
DROP POLICY IF EXISTS task_reminders_update_own ON public.task_reminders;
DROP POLICY IF EXISTS task_reminders_delete_own ON public.task_reminders;
CREATE POLICY task_reminders_select_own ON public.task_reminders
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY task_reminders_insert_own ON public.task_reminders
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY task_reminders_update_own ON public.task_reminders
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY task_reminders_delete_own ON public.task_reminders
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- If the deadline DATE changes without a new time, the old time/reminders are stale: reset them.
CREATE OR REPLACE FUNCTION public.client_tasks_reset_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.due_date IS DISTINCT FROM OLD.due_date
     AND NEW.due_at IS NOT DISTINCT FROM OLD.due_at THEN
    NEW.due_at := NULL;
    DELETE FROM public.task_reminders
     WHERE task_id = NEW.id AND user_id = NEW.user_id AND status = 'pending';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS client_tasks_reset_schedule ON public.client_tasks;
CREATE TRIGGER client_tasks_reset_schedule
  BEFORE UPDATE OF due_date ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.client_tasks_reset_schedule();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_reminders;
  END IF;
END $$;
