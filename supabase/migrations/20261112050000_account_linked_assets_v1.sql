create table if not exists public.account_linked_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_account_id uuid not null references public.email_accounts(id) on delete cascade,
  category text not null check (category in ('social','developer','ads','finance','contact','entertainment','ai_automation','custom')),
  provider text not null,
  display_name text not null,
  username text,
  login_email text,
  phone text,
  website_url text,
  login_url text,
  password_enc text,
  secret_enc text,
  status text not null default 'manual' check (status in ('manual','connected','needs_attention','disabled')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_linked_assets_owner_parent_fk unique (id, user_id, email_account_id)
);
create index if not exists account_linked_assets_parent_category_idx on public.account_linked_assets (email_account_id, category, updated_at desc);
create index if not exists account_linked_assets_user_idx on public.account_linked_assets (user_id);
alter table public.account_linked_assets enable row level security;
grant select, insert, update, delete on public.account_linked_assets to authenticated;
create policy "Users manage linked assets of their email accounts"
on public.account_linked_assets for all to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.email_accounts ea where ea.id = email_account_id and ea.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and exists (select 1 from public.email_accounts ea where ea.id = email_account_id and ea.user_id = (select auth.uid())));
create or replace function public.set_account_linked_assets_updated_at()
returns trigger language plpgsql set search_path = pg_catalog
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists account_linked_assets_updated_at on public.account_linked_assets;
create trigger account_linked_assets_updated_at before update on public.account_linked_assets for each row execute function public.set_account_linked_assets_updated_at();