-- Task Brief & Scope foundation v1
create table if not exists public.task_briefs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 client_id uuid not null, project_id uuid, task_id uuid not null, title text not null,
 status text not null default 'draft' check (status in ('draft','internal_review','approved','in_progress','change_requested','completed','archived')),
 sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections)='array'),
 ai_summary text, estimated_hours numeric(8,2), estimated_days numeric(8,2),
 priority_suggestion text check (priority_suggestion is null or priority_suggestion in ('urgent','high','medium','low')),
 budget_min numeric(14,2), budget_max numeric(14,2), currency text not null default 'IDR',
 suggested_tools jsonb not null default '[]'::jsonb check (jsonb_typeof(suggested_tools)='array'),
 work_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(work_steps)='array'),
 assumptions jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions)='array'),
 open_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(open_questions)='array'),
 current_version integer not null default 1 check (current_version>0),
 approved_at timestamptz, approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint task_briefs_id_user_key unique(id,user_id),
 constraint task_briefs_task_owner_fkey foreign key(task_id,user_id) references public.client_tasks(id,user_id) on delete cascade,
 constraint task_briefs_client_owner_fkey foreign key(client_id,user_id) references public.clients(id,user_id) on delete cascade,
 constraint task_briefs_project_owner_fkey foreign key(project_id,user_id) references public.projects(id,user_id) on delete set null,
 constraint task_briefs_one_per_task unique(task_id)
);
create table if not exists public.task_brief_deliverables (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, title text not null, description text,
 scope_type text not null default 'in_scope' check(scope_type in ('in_scope','out_of_scope','optional')),
 quantity integer not null default 1 check(quantity>0), format text,
 specifications jsonb not null default '{}'::jsonb check(jsonb_typeof(specifications)='object'),
 revision_quota integer not null default 2 check(revision_quota>=0), sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint task_brief_deliverables_id_user_key unique(id,user_id),
 constraint task_brief_deliverables_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade
);
create table if not exists public.task_brief_acceptance_criteria (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 deliverable_id uuid not null, criterion text not null, is_required boolean not null default true,
 is_completed boolean not null default false, sort_order integer not null default 0, created_at timestamptz not null default now(),
 constraint task_brief_acceptance_deliverable_owner_fkey foreign key(deliverable_id,user_id) references public.task_brief_deliverables(id,user_id) on delete cascade
);
create table if not exists public.task_brief_sources (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, source_type text not null check(source_type in ('internal','file','url','email','whatsapp','telegram','trello','canva','teams','google_drive','google_docs','google_sheets','google_slides','other')),
 title text not null, source_url text, storage_path text, extracted_text text,
 source_status text not null default 'added' check(source_status in ('added','processed','needs_review','failed')),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'), created_at timestamptz not null default now(),
 constraint task_brief_sources_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade
);
create table if not exists public.task_brief_versions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, version_number integer not null check(version_number>0),
 status text not null check(status in ('draft','internal_review','approved','change_requested','archived')),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'), change_note text,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 constraint task_brief_versions_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade,
 constraint task_brief_versions_number unique(brief_id,version_number)
);
create table if not exists public.task_brief_approvals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, version_number integer not null,
 decision text not null check(decision in ('approved','changes_requested')), note text,
 reviewer_id uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 constraint task_brief_approvals_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade
);
create table if not exists public.task_brief_revision_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, deliverable_id uuid,
 request_type text not null check(request_type in ('correction','minor_revision','major_revision','new_deliverable')),
 description text not null, round_number integer, quota_consumed boolean not null default false,
 status text not null default 'open' check(status in ('open','approved','rejected','completed')),
 estimated_extra_hours numeric(8,2), estimated_extra_cost numeric(14,2), created_at timestamptz not null default now(), resolved_at timestamptz,
 constraint task_brief_revisions_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade,
 constraint task_brief_revisions_deliverable_owner_fkey foreign key(deliverable_id,user_id) references public.task_brief_deliverables(id,user_id) on delete set null
);
create table if not exists public.task_brief_comments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, section_key text, comment text not null, created_at timestamptz not null default now(),
 constraint task_brief_comments_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade
);
create table if not exists public.task_brief_shares (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_id uuid not null, token_hash text not null unique, allow_comments boolean not null default false,
 allow_confirmation boolean not null default false, expires_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
 constraint task_brief_shares_brief_owner_fkey foreign key(brief_id,user_id) references public.task_briefs(id,user_id) on delete cascade
);
create index if not exists task_briefs_client_id_idx on public.task_briefs(client_id);
create index if not exists task_briefs_user_updated_idx on public.task_briefs(user_id,updated_at desc);
create index if not exists task_brief_deliverables_brief_idx on public.task_brief_deliverables(brief_id,sort_order);
create index if not exists task_brief_criteria_deliverable_idx on public.task_brief_acceptance_criteria(deliverable_id,sort_order);
create index if not exists task_brief_sources_brief_idx on public.task_brief_sources(brief_id,created_at desc);
create index if not exists task_brief_versions_brief_idx on public.task_brief_versions(brief_id,version_number desc);
create index if not exists task_brief_revisions_brief_idx on public.task_brief_revision_requests(brief_id,created_at desc);
create index if not exists task_brief_comments_brief_idx on public.task_brief_comments(brief_id,created_at desc);
do $$
declare t text;
begin
 foreach t in array array['task_briefs','task_brief_deliverables','task_brief_acceptance_criteria','task_brief_sources','task_brief_versions','task_brief_approvals','task_brief_revision_requests','task_brief_comments','task_brief_shares'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_owner_all',t);
  execute format('create policy %I on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t||'_owner_all',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.task_briefs;
  alter publication supabase_realtime add table public.task_brief_deliverables;
  alter publication supabase_realtime add table public.task_brief_acceptance_criteria;
  alter publication supabase_realtime add table public.task_brief_sources;
  alter publication supabase_realtime add table public.task_brief_versions;
  alter publication supabase_realtime add table public.task_brief_approvals;
  alter publication supabase_realtime add table public.task_brief_revision_requests;
  alter publication supabase_realtime add table public.task_brief_comments;
 end if;
exception when duplicate_object then null;
end $$;
