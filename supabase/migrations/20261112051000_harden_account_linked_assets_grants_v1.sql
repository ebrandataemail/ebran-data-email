revoke all on table public.account_linked_assets from anon;
grant select, insert, update, delete on table public.account_linked_assets to authenticated;
revoke all on function public.set_account_linked_assets_updated_at() from public, anon, authenticated;
