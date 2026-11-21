-- AI Task Intake & Generation pipeline. Existing client_tasks remains the canonical task table.
alter table public.client_tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists parent_task_id uuid references public.client_tasks(id) on delete set null,
  add column if not exists source_kind text,
  add column if not exists source_reference text;

create index if not exists client_tasks_project_id_idx on public.client_tasks(project_id);
create index if not exists client_tasks_parent_task_id_idx on public.client_tasks(parent_task_id);
create index if not exists client_tasks_source_kind_idx on public.client_tasks(source_kind);

create table if not exists public.task_intake_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  source_type text not null check (source_type in ('text','file','image','audio','video','url','email','chat','meeting','form','integration','webhook','manual')),
  source_label text not null default 'Manual input',
  source_uri text,
  file_name text,
  mime_type text,
  storage_path text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processing','processed','failed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_intake_sources_owner_created_idx on public.task_intake_sources(user_id, created_at desc);
create index if not exists task_intake_sources_client_idx on public.task_intake_sources(client_id, created_at desc);

create table if not exists public.task_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.task_intake_sources(id) on delete cascade,
  model text,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  prompt_version text not null default 'task-generator-v1',
  input_tokens integer,
  output_tokens integer,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists task_generation_runs_owner_created_idx on public.task_generation_runs(user_id, created_at desc);

create table if not exists public.task_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.task_intake_sources(id) on delete cascade,
  run_id uuid not null references public.task_generation_runs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null default 'AI task draft',
  summary text not null default '',
  status text not null default 'pending_review' check (status in ('pending_review','partially_approved','approved','rejected','expired')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  review_notes text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_drafts_owner_status_idx on public.task_drafts(user_id, status, created_at desc);
create index if not exists task_drafts_client_idx on public.task_drafts(client_id, created_at desc);

create table if not exists public.task_draft_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.task_drafts(id) on delete cascade,
  parent_draft_item_id uuid references public.task_draft_items(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  assignee text,
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','created')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  missing_information text[] not null default '{}',
  duplicate_hint text,
  created_task_id uuid references public.client_tasks(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists task_draft_items_draft_order_idx on public.task_draft_items(draft_id, sort_order);
create index if not exists task_draft_items_parent_idx on public.task_draft_items(parent_draft_item_id);

create table if not exists public.task_automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('gmail','outlook','whatsapp','telegram','slack','teams','calendar','zoom','figma','github','zendesk','intercom','webhook','manual')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{"mode":"draft_for_approval"}'::jsonb,
  enabled boolean not null default false,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_automation_rules_owner_enabled_idx on public.task_automation_rules(user_id, enabled);

create table if not exists public.task_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  task_id uuid references public.client_tasks(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('overdue','dependency','subtask','recurring','priority','follow_up','duplicate')),
  title text not null,
  description text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','accepted','dismissed','expired')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists task_ai_suggestions_owner_status_idx on public.task_ai_suggestions(user_id, status, created_at desc);

create table if not exists public.task_source_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.client_tasks(id) on delete cascade,
  source_id uuid references public.task_intake_sources(id) on delete set null,
  draft_item_id uuid references public.task_draft_items(id) on delete set null,
  source_label text not null default 'AI Task Generator',
  source_uri text,
  excerpt text,
  created_at timestamptz not null default now(),
  unique(task_id, source_id, draft_item_id)
);
create index if not exists task_source_links_task_idx on public.task_source_links(task_id);
create index if not exists task_source_links_owner_idx on public.task_source_links(user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['task_intake_sources','task_generation_runs','task_drafts','task_draft_items','task_automation_rules','task_ai_suggestions','task_source_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_all', t);
  end loop;
end $$;

grant select, insert, update, delete on public.client_tasks to authenticated;
