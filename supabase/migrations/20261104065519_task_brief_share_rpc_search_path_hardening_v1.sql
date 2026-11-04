-- Harden privileged token-share RPC resolution against search_path shadowing.
ALTER FUNCTION public.get_shared_task_brief(text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.submit_shared_task_brief_feedback(text, text, text, text)
  SET search_path = pg_catalog, public, pg_temp;
