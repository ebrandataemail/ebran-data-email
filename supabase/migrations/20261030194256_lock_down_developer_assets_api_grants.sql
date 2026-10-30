-- Keep the encrypted developer credential table inaccessible to anonymous API clients.
REVOKE ALL ON TABLE public.developer_assets FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.developer_assets TO authenticated;
