# Gmail → Automatic Workboard Task

Gmail automation rules scan incoming Inbox messages, match the configured criteria, import matching messages into Workboard, and run the existing AI Task Generator. AI-generated tasks are saved as drafts and remain pending user approval.

## Configure an automation rule

1. Connect the Gmail mailbox in Account → Gmail using the existing read-only OAuth connection.
2. Open Workboard → Integrasi masuk → Otomatisasi Gmail → Task Workboard.
3. Select the Gmail mailbox, Client, and optional Project.
4. Define one or more positive match criteria:
   - **Subject contains**: for example [TASK], [BRIEF], [REVISI].
   - **Sender contains**: for example client@example.com or @client-domain.com.
   - **Email body contains**: for example "tolong buatkan", "deadline", "mohon revisi".
5. Choose **OR** to match when any configured term appears, or **AND** to require every configured term.
6. Save and activate the rule.

Terms are case-insensitive. Separate multiple terms with commas or new lines. At least one positive term is required. Only messages in Gmail Inbox are scanned. Messages are deduplicated per mailbox and Gmail message ID.

## Background schedule

The database cron job workboard-gmail-task-automation runs every five minutes. It invokes the gmail-oauth Edge Function with the privileged Supabase key stored in Vault. The cron job is already installed but safely does nothing until the Vault key below is added.

project_url has already been added to Vault. Add the existing Supabase **Secret API key** (Settings → API Keys → Secret keys; do not use the publishable key) as a Vault secret named gmail_task_sync_key.

Run this in Supabase SQL Editor, replacing the placeholder locally. Never send the key through chat, commit it to Git, or put it in browser environment variables:

```sql
select vault.create_secret('sb_secret_REPLACE_WITH_YOUR_SECRET_KEY', 'gmail_task_sync_key');
```

If your project still uses the legacy API key model, use the existing service_role key instead of an sb_secret_... key. The value must match the Edge Function's configured default secret/service-role key.

## AI review behavior

- The scheduled scan imports matching email content and queues a generation run.
- When Workboard is open, the client also checks every 60 seconds and automatically calls the existing server-side AI Task Generator for matching email sources.
- AI extracts a task title, detailed description, priority, explicit deadline and assignee, plus subtasks where useful. It does not invent missing dates or people.
- The generated draft is persisted and appears under **Draft Task menunggu persetujuan**, including after a page refresh.
- The user must review and approve the draft before rows are inserted into the canonical client_tasks table.
- If Workboard is closed during the scheduled scan, the email is still imported; AI analysis starts automatically when Workboard is opened again. The current implementation does not run the AI model as a headless background worker while the browser is closed.

## Current boundaries

- Gmail OAuth remains read-only; no email is sent, moved, deleted, or marked read.
- The scanner reads message headers, snippet, and text/plain or text/html body. Attachments are not downloaded or parsed.
- It scans up to 50 recent messages per rule per cycle. If a mailbox receives more than 50 messages between scans, a later pagination enhancement may be needed.
- Rules are scoped to one Gmail account, client, and optional project.
- One email message is imported once per mailbox even if multiple rules match it. The first rule that imports it determines the client/project destination.
- Duplicate prevention uses a unique database index scoped to user, mailbox, and Gmail message ID.
