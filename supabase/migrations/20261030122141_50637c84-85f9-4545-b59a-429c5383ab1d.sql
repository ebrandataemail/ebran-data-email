CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.email_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  provider text NOT NULL,
  password_enc text,
  alt_password_enc text,
  pw_fingerprint text,
  pw_length integer,
  pw_classes integer,
  pw_matches_email boolean NOT NULL DEFAULT false,
  pw_common_pattern boolean NOT NULL DEFAULT false,
  lovable_status text NOT NULL DEFAULT 'unknown'
    CHECK (lovable_status IN ('unknown', 'empty', 'has_project', 'not_registered')),
  usage_tag text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own email accounts" ON public.email_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own email accounts" ON public.email_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own email accounts" ON public.email_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own email accounts" ON public.email_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER email_accounts_set_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lovable_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovable_projects TO authenticated;
GRANT ALL ON public.lovable_projects TO service_role;

ALTER TABLE public.lovable_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own lovable projects" ON public.lovable_projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own lovable projects" ON public.lovable_projects
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.email_accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Users update own lovable projects" ON public.lovable_projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own lovable projects" ON public.lovable_projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER lovable_projects_set_updated_at
  BEFORE UPDATE ON public.lovable_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX email_accounts_user_idx ON public.email_accounts (user_id, email);
CREATE INDEX lovable_projects_account_idx ON public.lovable_projects (account_id);