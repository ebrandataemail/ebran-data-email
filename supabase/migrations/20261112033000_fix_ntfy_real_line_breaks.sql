-- Fix actual newline handling in Workboard ntfy notifications.
-- Use chr(10) so the message contains real line breaks, not literal backslash-n.
create or replace function public.dispatch_due_task_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r record;
  v_request_id bigint;
  v_count integer := 0;
  v_message text;
  v_title text;
begin
  for r in
    select
      tr.id,
      tr.user_id,
      tr.task_id,
      tr.remind_at,
      tr.offset_minutes,
      ct.title as task_title,
      ct.status as task_status,
      ct.priority as task_priority,
      ct.task_type,
      ct.due_at,
      ct.due_date,
      c.name as client_name,
      ch.topic
    from public.task_reminders tr
    join public.client_tasks ct
      on ct.id = tr.task_id
     and ct.user_id = tr.user_id
    join public.user_ntfy_channels ch
      on ch.user_id = tr.user_id
     and ch.enabled = true
    left join public.clients c
      on c.id = ct.client_id
     and c.user_id = ct.user_id
    where tr.channel = 'ntfy'
      and tr.status = 'pending'
      and coalesce(tr.snoozed_until, tr.remind_at) <= now()
      and tr.ntfy_attempts < 5
    order by coalesce(tr.snoozed_until, tr.remind_at), tr.created_at
    limit 100
    for update of tr skip locked
  loop
    update public.task_reminders
       set status = 'fired',
           fired_at = now(),
           ntfy_attempts = ntfy_attempts + 1
     where id = r.id
       and status = 'pending';

    if not found then
      continue;
    end if;

    v_title := left(
      'Pengingat Workboard: ' || coalesce(nullif(btrim(r.task_title), ''), 'Tugas'),
      100
    );

    v_message := concat_ws(
      chr(10),
      'WAKTUNYA CEK TUGAS',
      '',
      'Tugas   : ' || coalesce(nullif(btrim(r.task_title), ''), 'Tanpa judul'),
      case when nullif(btrim(r.client_name), '') is not null
        then 'Client  : ' || btrim(r.client_name) else null end,
      case when nullif(btrim(r.task_type), '') is not null
        then 'Jenis   : ' || initcap(replace(r.task_type, '_', ' ')) else null end,
      case when nullif(btrim(r.task_status), '') is not null
        then 'Status  : ' || initcap(replace(r.task_status, '_', ' ')) else null end,
      case when nullif(btrim(r.task_priority), '') is not null
        then 'Prioritas: ' || initcap(r.task_priority) else null end,
      case
        when r.due_at is not null then
          'Deadline: ' || to_char(r.due_at at time zone 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') || ' WIB'
        when r.due_date is not null then
          'Deadline: ' || to_char(r.due_date, 'DD Mon YYYY')
        else null
      end,
      'Diingatkan: ' || to_char(now() at time zone 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') || ' WIB',
      '',
      'Buka Workboard untuk melihat detail tugas.'
    );

    begin
      v_request_id := net.http_post(
        url := 'https://ntfy.sh/' || r.topic,
        body := jsonb_build_object(
          'topic', r.topic,
          'title', v_title,
          'message', v_message,
          'priority', 4,
          'tags', jsonb_build_array('alarm_clock', 'briefcase'),
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
      update public.task_reminders
         set status = 'pending',
             fired_at = null,
             ntfy_last_error = left(sqlerrm, 500)
       where id = r.id;
    end;
  end loop;

  return v_count;
end;
$function$;
