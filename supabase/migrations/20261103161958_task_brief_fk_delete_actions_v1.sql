alter table public.task_briefs drop constraint if exists task_briefs_project_owner_fkey;
alter table public.task_briefs add constraint task_briefs_project_owner_fkey
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete set null (project_id);
alter table public.task_brief_revision_requests drop constraint if exists task_brief_revisions_deliverable_owner_fkey;
alter table public.task_brief_revision_requests add constraint task_brief_revisions_deliverable_owner_fkey
 foreign key(deliverable_id,user_id) references public.task_brief_deliverables(id,user_id) on delete cascade;
