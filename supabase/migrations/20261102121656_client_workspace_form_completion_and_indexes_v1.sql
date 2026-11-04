
alter table public.client_brand_profiles
  add column if not exists vault_notes text;

-- Cover owner-scoped composite foreign keys and common client detail lookups.
create index if not exists client_brand_assets_client_owner_idx on public.client_brand_assets(client_id,user_id);
create index if not exists client_brand_assets_user_idx on public.client_brand_assets(user_id);
create index if not exists client_design_comments_client_owner_idx on public.client_design_comments(client_id,user_id);
create index if not exists client_design_comments_version_owner_idx on public.client_design_comments(version_id,user_id);
create index if not exists client_design_comments_user_idx on public.client_design_comments(user_id);
create index if not exists client_design_reviews_client_owner_idx on public.client_design_reviews(client_id,user_id);
create index if not exists client_design_reviews_version_owner_idx on public.client_design_reviews(version_id,user_id);
create index if not exists client_design_versions_client_owner_idx on public.client_design_versions(client_id,user_id);
create index if not exists client_design_versions_user_idx on public.client_design_versions(user_id);
create index if not exists client_digital_assets_client_owner_idx on public.client_digital_assets(client_id,user_id);
create index if not exists client_documents_client_owner_idx on public.client_documents(client_id,user_id);
create index if not exists client_task_notes_client_owner_idx on public.client_task_notes(client_id,user_id);
create index if not exists client_task_notes_task_owner_idx on public.client_task_notes(task_id,user_id);
create index if not exists client_tasks_client_owner_idx on public.client_tasks(client_id,user_id);
create index if not exists client_timeline_events_client_owner_idx on public.client_timeline_events(client_id,user_id);
create index if not exists client_timeline_events_user_idx on public.client_timeline_events(user_id);

-- Avoid per-row auth.uid() evaluation in legacy owner policies.
drop policy if exists client_brand_assets_owner_all on public.client_brand_assets;
create policy client_brand_assets_owner_all on public.client_brand_assets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists client_design_comments_owner_all on public.client_design_comments;
create policy client_design_comments_owner_all on public.client_design_comments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists client_design_versions_owner_all on public.client_design_versions;
create policy client_design_versions_owner_all on public.client_design_versions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists client_timeline_events_owner_all on public.client_timeline_events;
create policy client_timeline_events_owner_all on public.client_timeline_events
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
