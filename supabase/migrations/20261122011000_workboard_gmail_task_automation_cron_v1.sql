-- Schedule rule-based Gmail intake every five minutes.
-- The job remains safely paused until project_url and gmail_task_sync_key
-- are added to Supabase Vault. The key is sent only as the apikey header.
create or replace function private.dispatch_gmail_task_automation()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_url text;
  sync_key text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into sync_key
  from vault.decrypted_secrets
  where name = 'gmail_task_sync_key'
  limit 1;

  if coalesce(project_url, '') = '' or coalesce(sync_key, '') = '' then
    raise notice 'Gmail automation is paused until project_url and gmail_task_sync_key are configured in Supabase Vault.';
    return;
  end if;

  perform net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/gmail-oauth',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', sync_key
    ),
    body := jsonb_build_object('action', 'scheduled-task-auto-sync'),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.dispatch_gmail_task_automation() from public, anon, authenticated;

select cron.schedule(
  'workboard-gmail-task-automation',
  '*/5 * * * *',
  'select private.dispatch_gmail_task_automation();'
);
