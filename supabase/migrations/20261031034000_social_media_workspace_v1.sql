-- Social Media workspace: manual records plus OAuth/API-ready connection metadata.
CREATE TABLE public.social_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 project_id uuid, platform text NOT NULL CHECK(platform IN ('instagram','tiktok','youtube','facebook','x','linkedin','threads','other')),
 account_type text NOT NULL DEFAULT 'business' CHECK(account_type IN ('personal','creator','business','channel','page','other')),
 display_name text NOT NULL CHECK(char_length(trim(display_name)) BETWEEN 1 AND 120), username text, profile_url text, avatar_url text, bio text,
 connection_mode text NOT NULL DEFAULT 'manual' CHECK(connection_mode IN ('manual','oauth')),
 connection_status text NOT NULL DEFAULT 'manual' CHECK(connection_status IN ('manual','pending','connected','expired','revoked','error','unsupported')),
 provider_account_id text, connected_at timestamptz, last_synced_at timestamptz, sync_error text,
 followers_count bigint CHECK(followers_count IS NULL OR followers_count>=0), following_count bigint CHECK(following_count IS NULL OR following_count>=0),
 posts_count bigint CHECK(posts_count IS NULL OR posts_count>=0), total_views bigint CHECK(total_views IS NULL OR total_views>=0), total_likes bigint CHECK(total_likes IS NULL OR total_likes>=0),
 notes text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT social_accounts_project_owner_fkey FOREIGN KEY(project_id,user_id) REFERENCES public.projects(id,user_id) ON DELETE SET NULL(project_id)
);
CREATE TABLE public.social_account_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE, captured_at timestamptz NOT NULL DEFAULT now(),
 followers_count bigint, following_count bigint, posts_count bigint, total_views bigint, total_likes bigint, reach_count bigint, impressions_count bigint, profile_visits bigint,
 source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','api')), metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object')
);
CREATE TABLE public.social_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE, platform_post_id text, permalink text,
 media_type text NOT NULL DEFAULT 'other' CHECK(media_type IN ('image','video','reel','short','carousel','story','text','live','other')),
 caption text, thumbnail_url text, published_at timestamptz, views_count bigint CHECK(views_count IS NULL OR views_count>=0),
 likes_count bigint CHECK(likes_count IS NULL OR likes_count>=0), comments_count bigint CHECK(comments_count IS NULL OR comments_count>=0),
 shares_count bigint CHECK(shares_count IS NULL OR shares_count>=0), saves_count bigint CHECK(saves_count IS NULL OR saves_count>=0), reach_count bigint CHECK(reach_count IS NULL OR reach_count>=0),
 engagement_rate numeric(8,4), source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','api')), metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(social_account_id,platform_post_id)
);
CREATE TABLE public.social_sync_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL, platform text NOT NULL,
 status text NOT NULL CHECK(status IN ('started','success','partial','failed','skipped')), records_synced integer NOT NULL DEFAULT 0 CHECK(records_synced>=0),
 message text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object')
);
CREATE INDEX social_accounts_user_platform_idx ON public.social_accounts(user_id,platform);
CREATE INDEX social_accounts_user_project_idx ON public.social_accounts(user_id,project_id);
CREATE INDEX social_snapshots_account_time_idx ON public.social_account_snapshots(social_account_id,captured_at DESC);
CREATE INDEX social_posts_user_account_date_idx ON public.social_posts(user_id,social_account_id,published_at DESC);
CREATE INDEX social_posts_user_views_idx ON public.social_posts(user_id,views_count DESC NULLS LAST);
CREATE INDEX social_posts_user_likes_idx ON public.social_posts(user_id,likes_count DESC NULLS LAST);
CREATE INDEX social_sync_logs_user_started_idx ON public.social_sync_logs(user_id,started_at DESC);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.social_account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.social_sync_logs ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['social_accounts','social_account_snapshots','social_posts','social_sync_logs'] LOOP
 EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id)',t||'_select_own',t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id)',t||'_insert_own',t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id)',t||'_update_own',t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id)',t||'_delete_own',t);
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,public',t); EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO authenticated',t);
 END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.set_social_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();
CREATE TRIGGER social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();
REVOKE ALL ON FUNCTION public.set_social_updated_at() FROM PUBLIC,anon,authenticated;
