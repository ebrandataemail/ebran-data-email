-- Ads & Marketing vault: platform accounts and encrypted advertising credentials.
CREATE TABLE public.ads_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid,
  platform text NOT NULL CHECK (platform IN ('meta','google','tiktok','youtube','other')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  account_identifier text,
  website_url text,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production','staging','development','local','other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','expired','revoked','maintenance','draft')),
  expires_at date,
  value_enc text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ads_assets_project_owner_fkey FOREIGN KEY (project_id,user_id)
    REFERENCES public.projects(id,user_id) ON DELETE SET NULL (project_id)
);
CREATE INDEX ads_assets_user_platform_idx ON public.ads_assets(user_id,platform);
CREATE INDEX ads_assets_user_project_idx ON public.ads_assets(user_id,project_id);
CREATE INDEX ads_assets_project_user_idx ON public.ads_assets(project_id,user_id);
ALTER TABLE public.ads_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ads assets" ON public.ads_assets FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY "Users can insert their own ads assets" ON public.ads_assets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY "Users can update their own ads assets" ON public.ads_assets FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY "Users can delete their own ads assets" ON public.ads_assets FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON TABLE public.ads_assets FROM anon,public;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.ads_assets TO authenticated;
