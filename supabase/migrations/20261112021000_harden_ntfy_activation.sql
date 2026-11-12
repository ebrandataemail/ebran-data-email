-- Harden ntfy setup: topic creation alone never enables delivery.
alter table public.user_ntfy_channels alter column enabled set default false;
update public.user_ntfy_channels set enabled = false where enabled = true;

create or replace function public.get_or_create_my_ntfy_topic()
returns table(topic text, enabled boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  insert into public.user_ntfy_channels(user_id, topic, enabled)
  values (v_user_id, 'ebran-wb-' || encode(extensions.gen_random_bytes(24), 'hex'), false)
  on conflict (user_id) do nothing;
  return query select c.topic, c.enabled from public.user_ntfy_channels c where c.user_id = v_user_id;
end;
$$;
revoke all on function public.get_or_create_my_ntfy_topic() from public, anon;
grant execute on function public.get_or_create_my_ntfy_topic() to authenticated;
