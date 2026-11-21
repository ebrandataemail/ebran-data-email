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
  insert into public.task_ai_suggestions (user_id,client_id,task_id,suggestion_type,title,description,evidence)
  select t.user_id,t.client_id,t.id,'overdue','Periksa task yang melewati deadline',
    t.title || ' melewati deadline ' || t.due_date::text || '. Perbarui status atau jadwal setelah memeriksa progres.',
    jsonb_build_object('dueDate',t.due_date,'status',t.status,'generatedBy','daily-copilot')
  from public.client_tasks t
  where t.due_date < current_date and t.status not in ('finished','cancel')
    and not exists (select 1 from public.task_ai_suggestions s where s.user_id=t.user_id and s.task_id=t.id and s.suggestion_type='overdue' and s.status='pending')
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  insert into public.task_ai_suggestions (user_id,client_id,task_id,suggestion_type,title,description,evidence)
  select t.user_id,t.client_id,t.id,'follow_up','Task lama perlu ditindaklanjuti',
    t.title || ' belum memiliki deadline dan sudah tersimpan lebih dari 14 hari. Periksa apakah masih aktif dan tetapkan langkah berikutnya.',
    jsonb_build_object('createdAt',t.created_at,'status',t.status,'generatedBy','daily-copilot')
  from public.client_tasks t
  where t.due_date is null and t.created_at < now() - interval '14 days'
    and t.status in ('things-to-do','pending','queue-on-process')
    and not exists (select 1 from public.task_ai_suggestions s where s.user_id=t.user_id and s.task_id=t.id and s.suggestion_type='follow_up' and s.status='pending')
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  with repeated_tasks as (
    select t.user_id,t.client_id,(array_agg(t.id order by t.updated_at desc))[1] as representative_task_id,
      lower(regexp_replace(trim(t.title), '\s+', ' ', 'g')) as normalized_title,
      min(t.title) as display_title,count(*)::integer as completed_count,max(t.updated_at) as last_completed_at
    from public.client_tasks t
    where t.status='finished' and t.updated_at >= now() - interval '90 days'
    group by t.user_id,t.client_id,lower(regexp_replace(trim(t.title), '\s+', ' ', 'g'))
    having count(*) >= 3
  )
  insert into public.task_ai_suggestions (user_id,client_id,task_id,suggestion_type,title,description,evidence)
  select r.user_id,r.client_id,r.representative_task_id,'recurring','Pola pekerjaan berulang terdeteksi',
    'Task "' || r.display_title || '" telah diselesaikan ' || r.completed_count::text ||
      ' kali dalam 90 hari. Pertimbangkan membuat template atau jadwal berulang.',
    jsonb_build_object('normalizedTitle',r.normalized_title,'completedCount',r.completed_count,
      'lastCompletedAt',r.last_completed_at,'generatedBy','daily-copilot')
  from repeated_tasks r
  where not exists (
    select 1 from public.task_ai_suggestions s where s.user_id=r.user_id and s.task_id=r.representative_task_id
      and s.suggestion_type='recurring' and s.created_at >= now() - interval '90 days'
  )
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;
  return v_inserted;
end;
$$;
revoke all on function private.refresh_workboard_copilot_suggestions() from public, anon, authenticated;
