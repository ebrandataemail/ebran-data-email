-- Existing pending Workboard alarms should use the new server-side channel too.
update public.task_reminders
   set channel = 'ntfy'
 where status = 'pending'
   and channel in ('in_app','browser');