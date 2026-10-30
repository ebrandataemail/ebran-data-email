-- Migration: create_developer_assets
CREATE TABLE public.developer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('api_key', 'webhook', 'env_var', 'ssh_key', 'db_connection', 'other')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  value_enc text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.developer_assets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users read own dev assets" ON public.developer_assets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own dev assets" ON public.developer_assets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dev assets" ON public.developer_assets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own dev assets" ON public.developer_assets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX dev_assets_user_type_idx ON public.developer_assets(user_id, type);
CREATE INDEX dev_assets_project_idx ON public.developer_assets(project_id) WHERE project_id IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_developer_assets_updated_at
BEFORE UPDATE ON public.developer_assets
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
