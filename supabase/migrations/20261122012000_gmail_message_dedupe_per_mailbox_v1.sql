-- Gmail message IDs are mailbox-scoped; deduplicate within each connected mailbox.
drop index if exists public.task_intake_sources_gmail_message_unique;
create unique index task_intake_sources_gmail_message_unique
  on public.task_intake_sources(user_id, (metadata->>'email_account_id'), (metadata->>'gmail_message_id'))
  where metadata ? 'gmail_message_id' and metadata ? 'email_account_id';
