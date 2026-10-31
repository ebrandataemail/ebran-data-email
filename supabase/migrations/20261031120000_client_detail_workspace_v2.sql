create table if not exists public.client_brand_assets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, client_id uuid not null,
 asset_type text not null check (asset_type in ('logo','color','font','guideline','template','other')),
 name text not null check (char_length(trim(name)) between 1 and 160), value text, file_path text, notes text, created_at timestamptz not null default now(),
 constraint client_brand_assets_client_owner_fkey foreign key (client_id,user_id) references public.clients(id,user_id) on delete cascade
);
create table if not exists public.client_design_versions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, client_id uuid not null,
 title text not null check (char_length(trim(title)) between 1 and 160), version_label text not null default 'V1', file_path text not null, file_name text not null,
 mime_type text, status text not null default 'pending' check (status in ('pending','approved','revision')), created_at timestamptz not null default now(), reviewed_at timestamptz,
 constraint client_design_versions_client_owner_fkey foreign key (client_id,user_id) references public.clients(id,user_id) on delete cascade,
 constraint client_design_versions_id_owner_key unique (id,user_id)
);
create table if not exists public.client_design_comments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, client_id uuid not null, version_id uuid not null,
 comment text not null check (char_length(trim(comment)) between 1 and 2000), x numeric(5,2), y numeric(5,2), created_at timestamptz not null default now(),
 constraint client_design_comments_client_owner_fkey foreign key (client_id,user_id) references public.clients(id,user_id) on delete cascade,
 constraint client_design_comments_version_owner_fkey foreign key (version_id,user_id) references public.client_design_versions(id,user_id) on delete cascade,
 constraint client_design_comments_pin_bounds check ((x is null and y is null) or (x between 0 and 100 and y between 0 and 100))
);
create table if not exists public.client_timeline_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, client_id uuid not null,
 event_type text not null default 'note' check (event_type in ('note','meeting','email','call','project','system')),
 title text not null check (char_length(trim(title)) between 1 and 160), description text, occurred_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'), created_at timestamptz not null default now(),
 constraint client_timeline_events_client_owner_fkey foreign key (client_id,user_id) references public.clients(id,user_id) on delete cascade
);
create index if not exists client_brand_assets_client_created_idx on public.client_brand_assets(client_id,created_at desc);
create index if not exists client_design_versions_client_created_idx on public.client_design_versions(client_id,created_at desc);
create index if not exists client_design_comments_version_created_idx on public.client_design_comments(version_id,created_at);
create index if not exists client_timeline_events_client_occurred_idx on public.client_timeline_events(client_id,occurred_at desc);
alter table public.client_brand_assets enable row level security;
alter table public.client_design_versions enable row level security;
alter table public.client_design_comments enable row level security;
alter table public.client_timeline_events enable row level security;
drop policy if exists "client_brand_assets_owner_all" on public.client_brand_assets;
create policy "client_brand_assets_owner_all" on public.client_brand_assets for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "client_design_versions_owner_all" on public.client_design_versions;
create policy "client_design_versions_owner_all" on public.client_design_versions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "client_design_comments_owner_all" on public.client_design_comments;
create policy "client_design_comments_owner_all" on public.client_design_comments for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "client_timeline_events_owner_all" on public.client_timeline_events;
create policy "client_timeline_events_owner_all" on public.client_timeline_events for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
