-- Workspace foundation: clients, projects, and secure email-account assignment.
-- This migration is already applied to the connected Supabase project; keep this file
-- in Git so fresh environments can reproduce the same schema.

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT clients_user_id_name_key UNIQUE (user_id, name)
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT projects_user_id_name_key UNIQUE (user_id, name),
  CONSTRAINT projects_client_owner_fkey FOREIGN KEY (client_id, user_id)
    REFERENCES public.clients(id, user_id) ON DELETE RESTRICT
);

ALTER TABLE public.email_accounts ADD COLUMN project_id uuid;
ALTER TABLE public.email_accounts
  ADD CONSTRAINT email_accounts_project_owner_fkey
  FOREIGN KEY (project_id, user_id) REFERENCES public.projects(id, user_id)
  ON DELETE SET NULL (project_id);

CREATE INDEX clients_user_name_idx ON public.clients(user_id, name);
CREATE INDEX projects_user_client_idx ON public.projects(user_id, client_id, name);
CREATE INDEX email_accounts_project_idx ON public.email_accounts(project_id) WHERE project_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own clients" ON public.clients
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own clients" ON public.clients
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own clients" ON public.clients
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users read own projects" ON public.projects
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own projects" ON public.projects
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own projects" ON public.projects
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
