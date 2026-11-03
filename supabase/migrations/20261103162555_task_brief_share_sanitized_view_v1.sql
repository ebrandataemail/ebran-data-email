create or replace function public.get_shared_task_brief(p_token_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.task_brief_shares%rowtype; b public.task_briefs%rowtype; ds jsonb; secs jsonb;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
 select * into s from public.task_brief_shares
 where token_hash=p_token_hash and revoked_at is null and (expires_at is null or expires_at>now()) limit 1;
 if not found then return null; end if;
 select * into b from public.task_briefs where id=s.brief_id and user_id=s.user_id;
 if not found then return null; end if;
 select coalesce(jsonb_agg(section),'[]'::jsonb) into secs
 from jsonb_array_elements(b.sections) as section
 where section->>'key' in ('overview','background','objectives','scope','deliverables','specifications','acceptance','revisions','timeline');
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',d.id,'title',d.title,'description',d.description,'scope_type',d.scope_type,
   'quantity',d.quantity,'format',d.format,'specifications',d.specifications,'revision_quota',d.revision_quota,
   'acceptance_criteria',coalesce((select jsonb_agg(c.criterion order by c.sort_order)
     from public.task_brief_acceptance_criteria c where c.deliverable_id=d.id and c.user_id=d.user_id),'[]'::jsonb)
 ) order by d.sort_order),'[]'::jsonb) into ds
 from public.task_brief_deliverables d where d.brief_id=b.id and d.user_id=b.user_id;
 return jsonb_build_object('title',b.title,'status',b.status,'version',b.current_version,
   'sections',secs,'deliverables',ds,
   'permissions',jsonb_build_object('allow_comments',s.allow_comments,'allow_confirmation',s.allow_confirmation));
end $$;
revoke all on function public.get_shared_task_brief(text) from public;
grant execute on function public.get_shared_task_brief(text) to anon,authenticated;
