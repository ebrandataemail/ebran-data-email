alter table public.client_tasks
  add column if not exists task_type text not null default 'general';
alter table public.client_tasks drop constraint if exists client_tasks_task_type_check;
alter table public.client_tasks add constraint client_tasks_task_type_check check (task_type in (
  'design','content','social_media','video','website','ads_marketing','seo','research','strategy','analytics','branding','general'
));
alter table public.client_design_versions add column if not exists task_id uuid null;
alter table public.client_design_versions drop constraint if exists client_design_versions_task_owner_fkey;
alter table public.client_design_versions add constraint client_design_versions_task_owner_fkey
  foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete set null (task_id);
create index if not exists client_design_versions_task_created_idx on public.client_design_versions(task_id,created_at desc) where task_id is not null;
create table if not exists public.task_deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  deliverable_type text not null default 'document' check (deliverable_type in ('document','file','url','calendar','report','code','dataset','other')),
  description text, content text, url text, file_path text, file_name text, mime_type text,
  status text not null default 'draft' check (status in ('draft','in_review','approved','revision','published','archived')),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint task_deliverables_task_owner_fkey foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete cascade,
  constraint task_deliverables_id_user_key unique (id,user_id)
);
create table if not exists public.task_deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null, deliverable_id uuid not null,
  version_number integer not null check (version_number > 0), title text not null,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  change_note text, created_at timestamptz not null default now(),
  constraint task_deliverable_versions_task_owner_fkey foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete cascade,
  constraint task_deliverable_versions_deliverable_owner_fkey foreign key (deliverable_id,user_id) references public.task_deliverables(id,user_id) on delete cascade,
  constraint task_deliverable_versions_number_key unique (deliverable_id,version_number)
);
create table if not exists public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null, deliverable_id uuid,
  decision text not null check (decision in ('approved','revision_requested','rejected')),
  note text, created_at timestamptz not null default now(),
  constraint task_reviews_task_owner_fkey foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete cascade,
  constraint task_reviews_deliverable_owner_fkey foreign key (deliverable_id,user_id) references public.task_deliverables(id,user_id) on delete cascade
);
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null, deliverable_id uuid,
  comment text not null check (char_length(trim(comment)) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint task_comments_task_owner_fkey foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete cascade,
  constraint task_comments_deliverable_owner_fkey foreign key (deliverable_id,user_id) references public.task_deliverables(id,user_id) on delete cascade
);
create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null, event_type text not null, title text not null, description text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint task_activities_task_owner_fkey foreign key (task_id,user_id) references public.client_tasks(id,user_id) on delete cascade
);
create index if not exists task_deliverables_task_updated_idx on public.task_deliverables(task_id,updated_at desc);
create index if not exists task_deliverable_versions_task_created_idx on public.task_deliverable_versions(task_id,created_at desc);
create index if not exists task_reviews_task_created_idx on public.task_reviews(task_id,created_at desc);
create index if not exists task_comments_task_created_idx on public.task_comments(task_id,created_at desc);
create index if not exists task_activities_task_created_idx on public.task_activities(task_id,created_at desc);
alter table public.task_deliverables enable row level security;
alter table public.task_deliverable_versions enable row level security;
alter table public.task_reviews enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activities enable row level security;
drop policy if exists task_deliverables_owner_all on public.task_deliverables;
create policy task_deliverables_owner_all on public.task_deliverables for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists task_deliverable_versions_owner_all on public.task_deliverable_versions;
create policy task_deliverable_versions_owner_all on public.task_deliverable_versions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists task_reviews_owner_all on public.task_reviews;
create policy task_reviews_owner_all on public.task_reviews for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists task_comments_owner_all on public.task_comments;
create policy task_comments_owner_all on public.task_comments for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists task_activities_owner_select on public.task_activities;
create policy task_activities_owner_select on public.task_activities for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists task_activities_owner_insert on public.task_activities;
create policy task_activities_owner_insert on public.task_activities for insert to authenticated with check ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.task_deliverables to authenticated;
grant select,insert,update,delete on public.task_deliverable_versions to authenticated;
grant select,insert,update,delete on public.task_reviews to authenticated;
grant select,insert,update,delete on public.task_comments to authenticated;
grant select,insert on public.task_activities to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_deliverables') then alter publication supabase_realtime add table public.task_deliverables; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_deliverable_versions') then alter publication supabase_realtime add table public.task_deliverable_versions; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_reviews') then alter publication supabase_realtime add table public.task_reviews; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_comments') then alter publication supabase_realtime add table public.task_comments; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_activities') then alter publication supabase_realtime add table public.task_activities; end if;
end $$;