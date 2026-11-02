
-- Normalize structured client brand/profile data so every field in the
-- Client creation form has a durable, queryable source of truth.
create table if not exists public.client_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  primary_color text not null default '#C9A75D',
  secondary_color text not null default '#003837',
  tone_of_voice text,
  company_overview text,
  pain_points text,
  agency_goals text,
  do_rules text,
  dont_rules text,
  important_notes text,
  tags text[] not null default '{}',
  service_priority text not null default 'standard'
    check (service_priority in ('standard','priority','enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_brand_profiles_client_unique unique (client_id),
  constraint client_brand_profiles_client_owner_fkey
    foreign key (client_id,user_id)
    references public.clients(id,user_id) on delete cascade,
  constraint client_brand_profiles_primary_color_check
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint client_brand_profiles_secondary_color_check
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists client_brand_profiles_user_client_idx
  on public.client_brand_profiles(user_id,client_id);

drop trigger if exists client_brand_profiles_set_updated_at on public.client_brand_profiles;
create trigger client_brand_profiles_set_updated_at
before update on public.client_brand_profiles
for each row execute function public.set_updated_at();

alter table public.client_brand_profiles enable row level security;

drop policy if exists client_brand_profiles_select_own on public.client_brand_profiles;
create policy client_brand_profiles_select_own
on public.client_brand_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists client_brand_profiles_insert_own on public.client_brand_profiles;
create policy client_brand_profiles_insert_own
on public.client_brand_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists client_brand_profiles_update_own on public.client_brand_profiles;
create policy client_brand_profiles_update_own
on public.client_brand_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists client_brand_profiles_delete_own on public.client_brand_profiles;
create policy client_brand_profiles_delete_own
on public.client_brand_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.client_brand_profiles from anon;
grant select,insert,update,delete on public.client_brand_profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='client_brand_profiles'
  ) then
    alter publication supabase_realtime add table public.client_brand_profiles;
  end if;
end $$;
