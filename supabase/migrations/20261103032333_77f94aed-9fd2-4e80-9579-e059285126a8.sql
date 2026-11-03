alter table public.clients
  add column if not exists brand_profile jsonb not null default '{}'::jsonb;
alter table public.clients drop constraint if exists clients_brand_profile_object;
alter table public.clients
  add constraint clients_brand_profile_object check (jsonb_typeof(brand_profile) = 'object');