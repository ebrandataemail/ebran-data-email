alter table vault_private.gmail_oauth_states set schema public;
alter table vault_private.gmail_mailbox_connections set schema public;
alter table public.gmail_oauth_states enable row level security;
alter table public.gmail_mailbox_connections enable row level security;
revoke all on public.gmail_oauth_states, public.gmail_mailbox_connections from public, anon, authenticated;
grant all on public.gmail_oauth_states, public.gmail_mailbox_connections to service_role;
