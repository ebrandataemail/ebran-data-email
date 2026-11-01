DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_design_versions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_design_versions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_design_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_design_comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_design_reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_design_reviews;
  END IF;
END $$;
