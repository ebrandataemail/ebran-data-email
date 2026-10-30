ALTER TABLE public.client_tasks DROP CONSTRAINT IF EXISTS client_tasks_status_check;
ALTER TABLE public.client_tasks ADD CONSTRAINT client_tasks_status_check
  CHECK (status IN ('things-to-do','queue-on-process','on-process','pending','revision','finished','cancel'));