-- Gmail OAuth token storage. This schema is intentionally not exposed through the Data API.
create schema if not exists vault_private;
revoke all on schema vault_private from public, anon, authenticated;
grant usage on schema vault_private to service_role;

create table if not exists vault_private.gmail_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_account_id uuid not null references public.email_accounts(id) on delete cascade,
  redirect_after text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists gmail_oauth_states_expires_at_idx
  on vault_private.gmail_oauth_states (expires_at);

create table if not exists vault_private.gmail_mailbox_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_account_id uuid not null unique references public.email_accounts(id) on delete cascade,
  google_email text not null,
  google_subject text,
  refresh_token_ciphertext text not null,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','reauth_required','revoked')),
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, google_email)
);
create index if not exists gmail_mailbox_connections_user_id_idx
  on vault_private.gmail_mailbox_connections (user_id);

revoke all on all tables in schema vault_private from public, anon, authenticated;
grant all on all tables in schema vault_private to service_role;
