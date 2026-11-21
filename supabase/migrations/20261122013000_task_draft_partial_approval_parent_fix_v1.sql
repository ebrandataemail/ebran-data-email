-- Allow a subtask to be approved after its parent draft item was approved in an earlier batch.
create or replace function public.approve_task_draft_items(p_draft_id uuid, p_item_ids uuid[])
returns uuid[]
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.task_drafts%rowtype;
  v_item record;
  v_selected_ids uuid[];
  v_parent_task_id uuid;
  v_task_id uuid;
  v_task_map jsonb := '{}'::jsonb;
  v_created_ids uuid[] := '{}'::uuid[];
  v_pending_count integer;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select * into v_draft from public.task_drafts
    where id = p_draft_id and user_id = v_user_id for update;
  if not found then raise exception 'Draft tidak ditemukan atau akses ditolak'; end if;
  if v_draft.status not in ('pending_review','partially_approved') then
    raise exception 'Draft sudah tidak dapat disetujui';
  end if;

  with recursive selected(id, parent_draft_item_id) as (
    select i.id, i.parent_draft_item_id
    from public.task_draft_items i
    where i.id = any(coalesce(p_item_ids, '{}'::uuid[]))
      and i.draft_id = p_draft_id and i.user_id = v_user_id and i.status = 'pending_review'
    union
    select parent.id, parent.parent_draft_item_id
    from public.task_draft_items parent
    join selected child on child.parent_draft_item_id = parent.id
    where parent.draft_id = p_draft_id and parent.user_id = v_user_id
      and parent.status = 'pending_review'
  )
  select array_agg(distinct id) into v_selected_ids from selected;

  if coalesce(array_length(v_selected_ids, 1), 0) = 0 then
    raise exception 'Pilih minimal satu task yang masih menunggu persetujuan';
  end if;

  for v_item in
    with recursive selected(id, parent_draft_item_id) as (
      select i.id, i.parent_draft_item_id
      from public.task_draft_items i
      where i.id = any(v_selected_ids) and i.draft_id = p_draft_id
        and i.user_id = v_user_id and i.status = 'pending_review'
    ),
    depths(id, depth) as (
      select s.id, 0 from selected s where s.parent_draft_item_id is null
      union all
      select child.id, parent.depth + 1
      from selected child
      join selected parent_item on parent_item.id = child.parent_draft_item_id
      join depths parent on parent.id = parent_item.id
    )
    select i.*, coalesce(d.depth, 0) as item_depth
    from public.task_draft_items i
    left join depths d on d.id = i.id
    where i.id = any(v_selected_ids) and i.draft_id = p_draft_id
      and i.user_id = v_user_id and i.status = 'pending_review'
    order by coalesce(d.depth, 0), i.sort_order, i.created_at
  loop
    v_parent_task_id := null;
    if v_item.parent_draft_item_id is not null then
      v_parent_task_id := nullif(v_task_map ->> v_item.parent_draft_item_id::text, '')::uuid;
      if v_parent_task_id is null then
        select parent.created_task_id into v_parent_task_id
        from public.task_draft_items parent
        where parent.id = v_item.parent_draft_item_id
          and parent.draft_id = p_draft_id
          and parent.user_id = v_user_id
          and parent.status = 'created';
      end if;
      if v_parent_task_id is null then
        raise exception 'Parent task belum tersedia untuk subtask %', v_item.title;
      end if;
    end if;

    insert into public.client_tasks (
      user_id, client_id, project_id, parent_task_id, title, description,
      status, priority, due_date, assignee, task_type, source_kind, source_reference
    ) values (
      v_user_id, v_draft.client_id, v_draft.project_id, v_parent_task_id,
      left(v_item.title, 160), v_item.description, 'things-to-do', v_item.priority,
      v_item.due_date, v_item.assignee, 'general', 'ai_generated', v_draft.source_id::text
    ) returning id into v_task_id;

    v_task_map := v_task_map || jsonb_build_object(v_item.id::text, v_task_id::text);
    v_created_ids := array_append(v_created_ids, v_task_id);

    insert into public.task_source_links (
      user_id, task_id, source_id, draft_item_id, source_label
    ) values (
      v_user_id, v_task_id, v_draft.source_id, v_item.id, 'Ebran AI Task Generator'
    );

    update public.task_draft_items
      set status = 'created', created_task_id = v_task_id
      where id = v_item.id and user_id = v_user_id;
  end loop;

  select count(*) into v_pending_count from public.task_draft_items
    where draft_id = p_draft_id and user_id = v_user_id and status = 'pending_review';

  update public.task_drafts set
    status = case when v_pending_count = 0 then 'approved' else 'partially_approved' end,
    approved_at = case when v_pending_count = 0 then now() else null end,
    updated_at = now()
  where id = p_draft_id and user_id = v_user_id;

  return v_created_ids;
end;
$$;

revoke all on function public.approve_task_draft_items(uuid,uuid[]) from public, anon;
grant execute on function public.approve_task_draft_items(uuid,uuid[]) to authenticated;
