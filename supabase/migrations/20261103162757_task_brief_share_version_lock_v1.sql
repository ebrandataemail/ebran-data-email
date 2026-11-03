alter table public.task_brief_shares
  add column if not exists version_number integer not null default 1;
alter table public.task_brief_shares
  drop constraint if exists task_brief_shares_version_fkey;
alter table public.task_brief_shares
  add constraint task_brief_shares_version_fkey
  foreign key (brief_id,version_number)
  references public.task_brief_versions(brief_id,version_number)
  on delete restrict;

create or replace function public.get_shared_task_brief(p_token_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  s public.task_brief_shares%rowtype;
  b public.task_briefs%rowtype;
  snap jsonb;
  secs jsonb;
  ds jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into s from public.task_brief_shares
  where token_hash=p_token_hash and revoked_at is null and (expires_at is null or expires_at>now()) limit 1;
  if not found then return null; end if;
  select * into b from public.task_briefs where id=s.brief_id and user_id=s.user_id;
  if not found then return null; end if;
  select snapshot into snap from public.task_brief_versions
  where brief_id=s.brief_id and version_number=s.version_number and user_id=s.user_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(section),'[]'::jsonb) into secs
  from jsonb_array_elements(coalesce(snap->'sections','[]'::jsonb)) as section
  where section->>'key' in ('overview','background','objectives','scope','deliverables','specifications','acceptance','revisions','timeline');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d->>'id','title',d->>'title','description',d->>'description','scope_type',d->>'scope_type',
    'quantity',coalesce((d->>'quantity')::integer,1),'format',d->>'format',
    'specifications',d->'specifications','revision_quota',coalesce((d->>'revision_quota')::integer,0),
    'acceptance_criteria',coalesce(d->'acceptance_criteria','[]'::jsonb)
  )),'[]'::jsonb) into ds
  from jsonb_array_elements(coalesce(snap->'deliverables','[]'::jsonb)) as d;
  return jsonb_build_object('title',coalesce(snap->>'title',b.title),'status',snap->>'status','version',s.version_number,
    'sections',secs,'deliverables',ds,
    'permissions',jsonb_build_object('allow_comments',s.allow_comments,'allow_confirmation',s.allow_confirmation));
end $$;
revoke all on function public.get_shared_task_brief(text) from public;
grant execute on function public.get_shared_task_brief(text) to anon,authenticated;
