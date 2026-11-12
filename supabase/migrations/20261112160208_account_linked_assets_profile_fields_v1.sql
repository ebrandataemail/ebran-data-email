alter table public.account_linked_assets
  add column if not exists owner_name text,
  add column if not exists account_reference text,
  add column if not exists recovery_contact text,
  add column if not exists security_method text;
