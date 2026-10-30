-- Client workspace: richer client profiles, private documents, digital assets,
-- client task Kanban, and task reminder notes. Applied to the connected project.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS company_profile text,
  ADD COLUMN IF NOT EXISTS scope_of_work text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS client_status text NOT NULL DEFAULT 'active'
    CHECK (client_status IN ('prospect','active','on-hold','completed','inactive'));

CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL, title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  document_type text NOT NULL DEFAULT 'other' CHECK (document_type IN ('contract','proposal','invoice','brief','report','nda','other')),
  file_path text NOT NULL, file_name text NOT NULL, mime_type text, file_size bigint, document_date date, expiry_date date, notes text, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_documents_client_owner_fkey FOREIGN KEY (client_id,user_id) REFERENCES public.clients(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.client_digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL, asset_name text NOT NULL CHECK (char_length(trim(asset_name)) BETWEEN 1 AND 160),
  asset_type text NOT NULL DEFAULT 'other' CHECK (asset_type IN ('domain','website','email','social','ads','hosting','analytics','design','other')),
  platform text, asset_url text, username text, owner_email text, notes text, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_digital_assets_client_owner_fkey FOREIGN KEY (client_id,user_id) REFERENCES public.clients(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL, title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160), description text,
  status text NOT NULL DEFAULT 'things-to-do' CHECK (status IN ('things-to-do','queue-on-process','on-process','pending','revision','finished','cancel')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')), due_date date, assignee text, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_tasks_id_user_id_key UNIQUE (id,user_id),
  CONSTRAINT client_tasks_client_owner_fkey FOREIGN KEY (client_id,user_id) REFERENCES public.clients(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.client_task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL, task_id uuid, note text NOT NULL CHECK (char_length(trim(note)) BETWEEN 1 AND 1000),
  color text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow','blue','pink','green')), created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_task_notes_client_owner_fkey FOREIGN KEY (client_id,user_id) REFERENCES public.clients(id,user_id) ON DELETE CASCADE,
  CONSTRAINT client_task_notes_task_owner_fkey FOREIGN KEY (task_id,user_id) REFERENCES public.client_tasks(id,user_id) ON DELETE CASCADE
);
CREATE INDEX client_documents_owner_client_idx ON public.client_documents(user_id,client_id,created_at DESC);
CREATE INDEX client_digital_assets_owner_client_idx ON public.client_digital_assets(user_id,client_id,created_at DESC);
CREATE INDEX client_tasks_owner_client_status_idx ON public.client_tasks(user_id,client_id,status,sort_order);
CREATE INDEX client_task_notes_owner_client_idx ON public.client_task_notes(user_id,client_id,created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_documents','client_digital_assets','client_tasks','client_task_notes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)', t || '_delete_own', t);
  END LOOP;
END $$;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('client-files','client-files',false,20971520,ARRAY['image/png','image/jpeg','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Client files select own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Client files insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Client files update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) WITH CHECK (bucket_id = 'client-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Client files delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);