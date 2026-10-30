-- Prevent a user from attaching their own post/snapshot/log to another user's social account.
ALTER TABLE public.social_accounts ADD CONSTRAINT social_accounts_id_user_unique UNIQUE (id,user_id);
ALTER TABLE public.social_account_snapshots DROP CONSTRAINT social_account_snapshots_social_account_id_fkey;
ALTER TABLE public.social_account_snapshots ADD CONSTRAINT social_snapshots_account_owner_fkey FOREIGN KEY (social_account_id,user_id) REFERENCES public.social_accounts(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.social_posts DROP CONSTRAINT social_posts_social_account_id_fkey;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_account_owner_fkey FOREIGN KEY (social_account_id,user_id) REFERENCES public.social_accounts(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.social_sync_logs DROP CONSTRAINT social_sync_logs_social_account_id_fkey;
ALTER TABLE public.social_sync_logs ADD CONSTRAINT social_sync_logs_account_owner_fkey FOREIGN KEY (social_account_id,user_id) REFERENCES public.social_accounts(id,user_id) ON DELETE SET NULL (social_account_id);
CREATE INDEX social_accounts_project_owner_idx ON public.social_accounts(project_id,user_id);
CREATE INDEX social_snapshots_user_idx ON public.social_account_snapshots(user_id);
CREATE INDEX social_sync_logs_account_owner_idx ON public.social_sync_logs(social_account_id,user_id);
CREATE INDEX social_sync_logs_user_idx ON public.social_sync_logs(user_id);
