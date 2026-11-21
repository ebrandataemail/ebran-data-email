-- Gmail rule-based Workboard automation cursor and idempotency.
alter table public.task_automation_rules
  add column if not exists last_checked_at timestamptz;

create index if not exists task_automation_rules_gmail_enabled_idx
  on public.task_automation_rules(user_id, enabled, last_checked_at)
  where source_type = 'gmail';

create unique index if not exists task_intake_sources_gmail_message_unique
  on public.task_intake_sources(user_id, (metadata->>'gmail_message_id'))
  where metadata ? 'gmail_message_id';

comment on column public.task_automation_rules.last_checked_at is
  'Cursor for the last Gmail inbox scan performed for this automation rule.';
