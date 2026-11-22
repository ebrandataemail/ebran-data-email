alter table public.task_generation_runs add column if not exists analysis_result jsonb not null default '{}'::jsonb;

create or replace function public.complete_task_intake_analysis(p_run_id uuid, p_analysis jsonb)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_run public.task_generation_runs%rowtype;
  v_source public.task_intake_sources%rowtype;
  v_draft uuid;
  v_parent uuid;
  v_child uuid;
  v_task jsonb;
  v_subtask jsonb;
  v_items jsonb := '[]'::jsonb;
  v_order integer := 0;
  v_child_order integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_run from public.task_generation_runs where id=p_run_id and user_id=v_user and status='processing' for update;
  if not found then raise exception 'Analysis run is not active'; end if;
  select * into v_source from public.task_intake_sources where id=v_run.source_id and user_id=v_user and status='processing' for update;
  if not found then raise exception 'Source is not active'; end if;
  if not exists(select 1 from public.clients where id=v_source.client_id and user_id=v_user) then raise exception 'Client access denied'; end if;
  if v_source.project_id is not null and not exists(select 1 from public.projects where id=v_source.project_id and client_id=v_source.client_id and user_id=v_user) then raise exception 'Project access denied'; end if;
  if jsonb_typeof(p_analysis->'tasks') is distinct from 'array' then raise exception 'Invalid tasks'; end if;
  if jsonb_array_length(p_analysis->'tasks') > 30 then raise exception 'Too many tasks'; end if;
  insert into public.task_drafts(user_id,source_id,run_id,client_id,project_id,title,summary,status)
  values(v_user,v_source.id,v_run.id,v_source.client_id,v_source.project_id,coalesce(p_analysis->'tasks'->0->>'title','Tidak ada pekerjaan teridentifikasi'),coalesce(p_analysis->>'summary',''),'pending_review') returning id into v_draft;
  for v_task in select value from jsonb_array_elements(p_analysis->'tasks') loop
    insert into public.task_draft_items(user_id,draft_id,title,description,priority,due_date,assignee,confidence,missing_information,sort_order)
    values(v_user,v_draft,v_task->>'title',coalesce(v_task->>'description',''),v_task->>'priority',nullif(v_task->>'dueDate','')::date,v_task->>'assignee',(v_task->>'confidence')::numeric,array(select jsonb_array_elements_text(coalesce(v_task->'missingInformation','[]'::jsonb))),v_order) returning id into v_parent;
    v_items := v_items || jsonb_build_array((v_task - 'subtasks') || jsonb_build_object('id',v_parent,'parentDraftItemId',null));
    v_child_order := 0;
    for v_subtask in select value from jsonb_array_elements(coalesce(v_task->'subtasks','[]'::jsonb)) loop
      insert into public.task_draft_items(user_id,draft_id,parent_draft_item_id,title,description,priority,due_date,assignee,confidence,missing_information,sort_order)
      values(v_user,v_draft,v_parent,v_subtask->>'title',coalesce(v_subtask->>'description',''),v_subtask->>'priority',nullif(v_subtask->>'dueDate','')::date,v_subtask->>'assignee',(v_subtask->>'confidence')::numeric,array(select jsonb_array_elements_text(coalesce(v_subtask->'missingInformation','[]'::jsonb))),v_child_order) returning id into v_child;
      v_items := v_items || jsonb_build_array(v_subtask || jsonb_build_object('id',v_child,'parentDraftItemId',v_parent));
      v_child_order := v_child_order+1;
    end loop;
    v_order := v_order+1;
  end loop;
  update public.task_generation_runs set status='completed',completed_at=now(),analysis_result=p_analysis-'tasks',error_message=null,error_code=null where id=v_run.id and user_id=v_user;
  update public.task_intake_sources set status='processed',updated_at=now() where id=v_source.id and user_id=v_user;
  return (p_analysis-'tasks') || jsonb_build_object('draftId',v_draft,'sourceId',v_source.id,'runId',v_run.id,'items',v_items);
end $$;
revoke all on function public.complete_task_intake_analysis(uuid,jsonb) from public,anon;
grant execute on function public.complete_task_intake_analysis(uuid,jsonb) to authenticated;
