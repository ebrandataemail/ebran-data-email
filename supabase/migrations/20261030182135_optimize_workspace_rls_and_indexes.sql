-- Optimize owner-scoped RLS evaluation and composite foreign-key lookups.
CREATE INDEX IF NOT EXISTS email_accounts_project_owner_idx
  ON public.email_accounts (project_id, user_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS projects_client_owner_idx
  ON public.projects (client_id, user_id) WHERE client_id IS NOT NULL;

DROP POLICY IF EXISTS "Users read own email accounts" ON public.email_accounts;
CREATE POLICY "Users read own email accounts" ON public.email_accounts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users add own email accounts" ON public.email_accounts;
CREATE POLICY "Users add own email accounts" ON public.email_accounts
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users update own email accounts" ON public.email_accounts;
CREATE POLICY "Users update own email accounts" ON public.email_accounts
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users delete own email accounts" ON public.email_accounts;
CREATE POLICY "Users delete own email accounts" ON public.email_accounts
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read own lovable projects" ON public.lovable_projects;
CREATE POLICY "Users read own lovable projects" ON public.lovable_projects
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users add own lovable projects" ON public.lovable_projects;
CREATE POLICY "Users add own lovable projects" ON public.lovable_projects
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.email_accounts a WHERE a.id = account_id AND a.user_id = (SELECT auth.uid()))
  );
DROP POLICY IF EXISTS "Users update own lovable projects" ON public.lovable_projects;
CREATE POLICY "Users update own lovable projects" ON public.lovable_projects
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users delete own lovable projects" ON public.lovable_projects;
CREATE POLICY "Users delete own lovable projects" ON public.lovable_projects
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read their own AI chat" ON public.ai_chat_messages;
CREATE POLICY "Users read their own AI chat" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users add to their own AI chat" ON public.ai_chat_messages;
CREATE POLICY "Users add to their own AI chat" ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users clear their own AI chat" ON public.ai_chat_messages;
CREATE POLICY "Users clear their own AI chat" ON public.ai_chat_messages
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
