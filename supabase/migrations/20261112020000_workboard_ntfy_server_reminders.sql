-- Workboard server-side ntfy delivery v1.
-- Topics are per-user bearer secrets. They are generated only when the owner explicitly
-- requests setup through get_or_create_my_ntfy_topic(); no message is sent by this migration.

create table if not exists public.user_ntfy_channels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  topic text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ntfy_channels enable row level security;
revoke all on public.user_ntfy_channels from anon, authenticated;
drop policy if exists user_ntfy_channels_no_client_access on public.user_ntfy_channels;

alter table public.task_reminders
  drop constraint if exists task_reminders_channel_check;
alter table public.task_reminders
  add constraint task_reminders_channel_check
  check (channel in ('in_app','browser','email','ntfy'));

alter table public.task_reminders
  add column if not exists ntfy_request_id bigint,
  add column if not exists ntfy_requested_at timestamptz,
  add column if not exists ntfy_attempts integer not null default 0,
  add column if not exists ntfy_last_error text;

create index if not exists task_reminders_ntfy_pending_idx
  on public.task_reminders(status, remind_at)
  where channel = 'ntfy' and status = 'pending';

create or replace function public.get_or_create_my_ntfy_topic()
returns table(topic text, enabled boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_ntfy_channels(user_id, topic)
  values (v_user_id, 'ebran-wb-' || encode(gen_random_bytes(24), 'hex'))
  on conflict (user_id) do nothing;

  return query
    select c.topic, c.enabled
    from public.user_ntfy_channels c
    where c.user_id = v_user_id;
end;
$$;

revoke all on function public.get_or_create_my_ntfy_topic() from public, anon;
grant execute on function public.get_or_create_my_ntfy_topic() to authenticated;

create or replace function public.set_my_ntfy_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.user_ntfy_channels
     set enabled = p_enabled, updated_at = now()
   where user_id = v_user_id;

  return found;
end;
$$;

revoke all on function public.set_my_ntfy_enabled(boolean) from public, anon;
grant execute on function public.set_my_ntfy_enabled(boolean) to authenticated;

create or replace function public.dispatch_due_task_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_request_id bigint;
  v_count integer := 0;
begin
  for r in
    select tr.id, tr.user_id, tr.task_id, tr.remind_at, tr.offset_minutes,
           ct.title, c.topic
      from public.task_reminders tr
      join public.client_tasks ct
        on ct.id = tr.task_id and ct.user_id = tr.user_id
      join public.user_ntfy_channels c
        on c.user_id = tr.user_id and c.enabled = true
     where tr.channel = 'ntfy'
       and tr.status = 'pending'
       and coalesce(tr.snoozed_until, tr.remind_at) <= now()
       and tr.ntfy_attempts < 5
     order by coalesce(tr.snoozed_until, tr.remind_at), tr.created_at
     limit 100
     for update of tr skip locked
  loop
    -- Claim before dispatch; the row lock and status predicate prevent duplicate sends
    -- from overlapping cron invocations.
    update public.task_reminders
       set status = 'fired',
           fired_at = now(),
           ntfy_attempts = ntfy_attempts + 1
     where id = r.id and status = 'pending';

    if not found then
      continue;
    end if;

    begin
      v_request_id := net.http_post(
        url := 'https://ntfy.sh/' || r.topic,
        body := jsonb_build_object(
          'topic', r.topic,
          'title', 'Pengingat Workboard',
          'message', coalesce(r.title, 'Task') || ' — waktu pengingat Anda telah tiba.',
          'priority', 4,
          'tags', jsonb_build_array('alarm_clock', 'workboard'),
          'click', 'https://ebran-data-email.lovable.app/workboard'
        ),
        headers := jsonb_build_object('Content-Type', 'application/json'),
        timeout_milliseconds := 10000
      );

      update public.task_reminders
         set ntfy_request_id = v_request_id,
             ntfy_requested_at = now(),
             ntfy_last_error = null
       where id = r.id;
      v_count := v_count + 1;
    exception when others then
      -- Do not mark as successfully dispatched; return it to pending for bounded retry.
      update public.task_reminders
         set status = 'pending',
             fired_at = null,
             ntfy_last_error = left(sqlerrm, 500)
       where id = r.id;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.dispatch_due_task_reminders() from public, anon, authenticated;

-- Idempotent one-minute scheduler. This schedules work only; no message is sent at setup time.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'workboard-ntfy-reminders'
   limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'workboard-ntfy-reminders',
    '* * * * *',
    'select public.dispatch_due_task_reminders();'
  );
end;
$$;
