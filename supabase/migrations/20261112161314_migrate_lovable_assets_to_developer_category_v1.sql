insert into public.account_linked_assets
  (user_id, email_account_id, category, provider, display_name, website_url, status, note, metadata, created_at, updated_at)
select ea.user_id, ea.id, 'developer', 'Lovable',
  coalesce(nullif(trim(lp.name), ''), 'Lovable Workspace'),
  lp.url, 'manual', nullif(trim(lp.note), ''),
  jsonb_build_object('legacy_source','lovable_projects','legacy_project_id',lp.id,'legacy_lovable_status',ea.lovable_status),
  coalesce(lp.created_at, now()), coalesce(lp.updated_at, now())
from public.lovable_projects lp
join public.email_accounts ea on ea.id = lp.account_id
where not exists (
  select 1 from public.account_linked_assets la
  where la.email_account_id = ea.id and la.category = 'developer'
    and la.provider = 'Lovable' and la.metadata->>'legacy_project_id' = lp.id::text
);

insert into public.account_linked_assets
  (user_id, email_account_id, category, provider, display_name, status, note, metadata)
select ea.user_id, ea.id, 'developer', 'Lovable', 'Akun / Workspace Lovable',
  'manual', 'Status Lovable sebelumnya: ' || ea.lovable_status,
  jsonb_build_object('legacy_source','email_accounts.lovable_status','legacy_lovable_status',ea.lovable_status)
from public.email_accounts ea
where ea.lovable_status <> 'unknown'
  and not exists (select 1 from public.lovable_projects lp where lp.account_id = ea.id)
  and not exists (
    select 1 from public.account_linked_assets la
    where la.email_account_id = ea.id and la.category = 'developer'
      and la.provider = 'Lovable' and la.metadata->>'legacy_source' = 'email_accounts.lovable_status'
  );