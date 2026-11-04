-- Restrict privileged share RPCs to anonymous public-link visitors and service role.
-- These SECURITY DEFINER functions intentionally support token-based public shares.
REVOKE EXECUTE ON FUNCTION public.get_shared_task_brief(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_shared_task_brief(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_task_brief(text) TO anon, service_role;

REVOKE EXECUTE ON FUNCTION public.submit_shared_task_brief_feedback(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_shared_task_brief_feedback(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_shared_task_brief_feedback(text, text, text, text) TO anon, service_role;

-- Cover the composite FK (brief_id, version_number) on task_brief_shares.
CREATE INDEX IF NOT EXISTS task_brief_shares_version_fk_idx
  ON public.task_brief_shares (brief_id, version_number);
