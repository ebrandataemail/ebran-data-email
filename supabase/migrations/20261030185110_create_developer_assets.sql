-- Developer tools asset vault: app/web/API/AI/agent/robot credentials.
CREATE TABLE public.developer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid,
  type text NOT NULL CHECK (type IN (
    'api_key','webhook','env_var','ssh_key','db_connection','app_account','website',
    'domain','hosting','repository','package','oauth_app','cloud_service',
    'ai_model','ai_agent','robot','automation','other'
  )),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  provider text,
  website_url text,
  username text,
  environment text NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production','staging','development','local','other')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','expired','revoked','maintenance','draft')),
  expires_at date,
  value_enc text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT developer_assets_project_owner_fkey
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id)
    ON DELETE SET NULL (project_id)
);
CREATE INDEX developer_assets_user_type_idx ON public.developer_assets(user_id, type);
CREATE INDEX developer_assets_user_project_idx ON public.developer_assets(user_id, project_id)
  WHERE project_id IS NOT NULL;
CREATE INDEX developer_assets_user_status_idx ON public.developer_assets(user_id, status);
ALTER TABLE public.developer_assets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_assets TO authenticated;
CREATE POLICY "Users read own dev assets" ON public.developer_assets
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own dev assets" ON public.developer_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own dev assets" ON public.developer_assets
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own dev assets" ON public.developer_assets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE TRIGGER developer_assets_set_updated_at
  BEFORE UPDATE ON public.developer_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
