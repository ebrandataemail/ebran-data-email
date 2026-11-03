alter table public.clients drop constraint if exists clients_brand_profile_object;
alter table public.clients drop column if exists brand_profile;