-- Daily rules-based Workboard Copilot suggestions; no external credentials required.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.refresh_workboard_copilot_suggestions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer := 0;
  v_count integer := 0;
begin
  insert into public.task_ai_suggestions (
    user_id, client_id, task_id, suggestion_type, title, description, evidence
  )
  select t.user_id, t.client_id, t.id, 'overdue',
    'Periksa task yang melewati deadline',
    t.title || ' melewati deadline ' || t.due_date::text || '. Perbarui status atau jadwal setelah memeriksa progres.',
    jsonb_build_object('dueDate', t.due_date, 'status', t.status, 'generatedBy', 'daily-copilot')
  from public.client_tasks t
  where t.due_date < current_date and t.status not in ('finished','cancel')
    and not exists (select 1 from public.task_ai_suggestions s where s.user_id=t.user_id and s.task_id=t.id and s.suggestion_type='overdue' and s.status='pending')
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  insert into public.task_ai_suggestions (
    user_id, client_id, task_id, suggestion_type, title, description, evidence
  )
  select t.user_id, t.client_id, t.id, 'follow_up',
    'Task lama perlu ditindaklanjuti',
    t.title || ' belum memiliki deadline dan sudah tersimpan lebih dari 14 hari. Periksa apakah masih aktif dan tetapkan langkah berikutnya.',
    jsonb_build_object('createdAt', t.created_at, 'status', t.status, 'generatedBy', 'daily-copilot')
  from public.client_tasks t
  where t.due_date is null and t.created_at < now() - interval '14 days'
    and t.status in ('things-to-do','pending','queue-on-process')
    and not exists (select 1 from public.task_ai_suggestions s where s.user_id=t.user_id and s.task_id=t.id and s.suggestion_type='follow_up' and s.status='pending')
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;
  return v_inserted;
end;
$$;
revoke all on function private.refresh_workboard_copilot_suggestions() from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'workboard-copilot-daily' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('workboard-copilot-daily','0 2 * * *','select private.refresh_workboard_copilot_suggestions();');
end $$;
