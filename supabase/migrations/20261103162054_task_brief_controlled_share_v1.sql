-- Public controlled-share endpoint. Only explicitly shared, client-safe fields are returned.
create table if not exists public.task_brief_share_feedback (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 share_id uuid not null references public.task_brief_shares(id) on delete cascade,
 client_name text not null, comment text, decision text check(decision is null or decision in ('confirmed','changes_requested')),
 created_at timestamptz not null default now()
);
create index if not exists task_brief_share_feedback_share_idx on public.task_brief_share_feedback(share_id,created_at desc);
alter table public.task_brief_share_feedback enable row level security;
create policy task_brief_share_feedback_owner_all on public.task_brief_share_feedback for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.task_brief_share_feedback to authenticated;
revoke all on public.task_brief_share_feedback from anon;
create or replace function public.get_shared_task_brief(p_token_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.task_brief_shares%rowtype; b public.task_briefs%rowtype; ds jsonb; secs jsonb;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
 select * into s from public.task_brief_shares where token_hash=p_token_hash and revoked_at is null and (expires_at is null or expires_at>now()) limit 1;
 if not found then return null; end if;
 select * into b from public.task_briefs where id=s.brief_id and user_id=s.user_id;
 if not found then return null; end if;
 select coalesce(jsonb_agg(section),'[]'::jsonb) into secs from jsonb_array_elements(b.sections) as section
 where section->>'key' in ('overview','background','objectives','scope','deliverables','specifications','acceptance','revisions','timeline');
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'description',d.description,'scope_type',d.scope_type,'quantity',d.quantity,'format',d.format,'specifications',d.specifications,'revision_quota',d.revision_quota,'acceptance_criteria',coalesce((select jsonb_agg(c.criterion order by c.sort_order) from public.task_brief_acceptance_criteria c where c.deliverable_id=d.id and c.user_id=d.user_id),'[]'::jsonb)) order by d.sort_order),'[]'::jsonb) into ds
 from public.task_brief_deliverables d where d.brief_id=b.id and d.user_id=b.user_id;
 return jsonb_build_object('title',b.title,'status',b.status,'version',b.current_version,'sections',secs,'deliverables',ds,
 'permissions',jsonb_build_object('allow_comments',s.allow_comments,'allow_confirmation',s.allow_confirmation));
end $$;
create or replace function public.submit_shared_task_brief_feedback(p_token_hash text,p_client_name text,p_comment text,p_decision text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.task_brief_shares%rowtype;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 if length(trim(coalesce(p_client_name,'')))<2 or length(p_client_name)>120 or length(coalesce(p_comment,''))>5000 then return false; end if;
 if p_decision is not null and p_decision not in ('confirmed','changes_requested') then return false; end if;
 select * into s from public.task_brief_shares where token_hash=p_token_hash and revoked_at is null and (expires_at is null or expires_at>now()) limit 1;
 if not found then return false; end if;
 if p_comment is not null and length(trim(p_comment))>0 and not s.allow_comments then return false; end if;
 if p_decision is not null and not s.allow_confirmation then return false; end if;
 insert into public.task_brief_share_feedback(user_id,share_id,client_name,comment,decision)
 values(s.user_id,s.id,trim(p_client_name),nullif(trim(p_comment),''),p_decision);
 return true;
end $$;
revoke all on function public.get_shared_task_brief(text) from public;
revoke all on function public.submit_shared_task_brief_feedback(text,text,text,text) from public;
grant execute on function public.get_shared_task_brief(text) to anon,authenticated;
grant execute on function public.submit_shared_task_brief_feedback(text,text,text,text) to anon,authenticated;
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.task_brief_share_feedback; end if; exception when duplicate_object then null; end $$;
