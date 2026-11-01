-- Durable review history for Graphic Workspace.
CREATE TABLE IF NOT EXISTS public.client_design_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  version_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','revision')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_design_reviews_client_owner_fkey
    FOREIGN KEY (client_id,user_id) REFERENCES public.clients(id,user_id) ON DELETE CASCADE,
  CONSTRAINT client_design_reviews_version_owner_fkey
    FOREIGN KEY (version_id,user_id) REFERENCES public.client_design_versions(id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS client_design_reviews_version_created_idx
  ON public.client_design_reviews(user_id,version_id,created_at DESC);
ALTER TABLE public.client_design_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.client_design_reviews TO authenticated;
DROP POLICY IF EXISTS client_design_reviews_owner_select ON public.client_design_reviews;
CREATE POLICY client_design_reviews_owner_select ON public.client_design_reviews
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS client_design_reviews_owner_insert ON public.client_design_reviews;
CREATE POLICY client_design_reviews_owner_insert ON public.client_design_reviews
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
