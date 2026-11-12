# Workboard Integrations — Repository Audit & Implementation Plan

Audit date: 2026-11-12  
Repository: `ebrandataemail/ebran-data-email`  
Branch: `main`  
Current audited HEAD: `a398274f230da21be2e6776d1c25d1f06e442cf0`

## User decisions

- Ingestion mode: manual and automatic.
- WhatsApp: personal and Business, using separate supported paths.
- AI task creation: extract to a review queue; never create a Workboard task until the user approves it.

## Confirmed repository layout

### Workboard frontend
- `src/components/workboard/WorkboardView.tsx` — Workboard page composition; loads client/project/task/document/activity/design data and wires TaskBoard to GraphicWorkspace.
- `src/components/workboard/TaskBoard.tsx` — task board, task draft form, status/priority actions, reminders.
- `src/components/workboard/useWorkboardData.ts` — Supabase reads and task CRUD.
- `src/components/workboard/GraphicWorkspace.tsx` — task/design workspace UI.
- `src/components/workboard/TaskBriefWorkspace.tsx` — brief and scope workspace.
- `src/components/workboard/TaskDeliverableWorkspace.tsx` — deliverables UI.
- `src/components/workboard/BottomPanels.tsx` — calendar, work list and AI secretary panels.
- `src/components/workboard/WorkboardSettingsView.tsx` — reminder settings.
- `src/components/workboard/AlertCenter.tsx` — alert center component.
- `src/components/workboard/taskSchedule.ts`, `reminders.ts`, `status.ts` — task scheduling and status helpers.
- `src/components/vault/AppSidebar.tsx` — global navigation.
- `src/routes/_authenticated/workboard.tsx` — Workboard route.
- `src/routes/_authenticated/workboard-settings.tsx` — Workboard settings route.
- `src/routeTree.gen.ts` — generated TanStack Router route tree; regenerate through the project tooling rather than hand-editing.

### Gmail account frontend/backend
- `src/components/vault/accounts/GmailInboxMonitor.tsx` — Gmail inbox monitor UI.
- `src/components/vault/accounts/AccountsView.tsx` and `use-accounts.ts` — account view/data hook.
- `supabase/functions/gmail-oauth/index.ts` — Gmail OAuth and mailbox actions.
- `supabase/migrations/20261104170000_gmail_mailbox_oauth_private_storage_v1.sql` — initial private Gmail OAuth storage.
- `supabase/migrations/20261104171000_expose_gmail_private_tables_safely_v1.sql` — moves the Gmail tables into public schema but revokes client access and grants service role.

### Supabase schema history
Migrations live in `supabase/migrations/`. Relevant existing migrations include:
- `20261031053000_client_task_queue_status.sql`
- `20261102090000_graphic_workspace_review_history_v1.sql`
- `20261103161651_task_brief_scope_foundation_v1.sql`
- `20261104134447_universal_task_workspace_deliverables_v1.sql`
- `20261104170000_gmail_mailbox_oauth_private_storage_v1.sql`
- `20261104171000_expose_gmail_private_tables_safely_v1.sql`
- `20261112010000_task_schedule_and_reminders_v1.sql`
- `20261112020000_workboard_ntfy_server_reminders.sql`
- `20261112021000_harden_ntfy_activation.sql`
- `20261112022000_route_existing_pending_reminders_to_ntfy.sql`
- `20261112030000_format_workboard_ntfy_notifications.sql`
- `20261112033000_fix_ntfy_real_line_breaks.sql`

## Existing database assets confirmed

- `public.client_tasks` is the existing task source of truth. It currently contains `client_id`, `title`, `description`, `status`, `priority`, `due_date`, `assignee`, `sort_order`, `task_type`, and `due_at`.
- Existing task-related tables include `client_task_notes`, `task_activities`, `task_comments`, `task_deliverables`, `task_deliverable_versions`, `task_reviews`, and task brief tables.
- `public.task_reminders` and `public.user_ntfy_channels` already support Workboard reminders.
- Gmail tables exist: `public.gmail_oauth_states` and `public.gmail_mailbox_connections`. The Gmail connection table stores encrypted refresh tokens, not plaintext.
- The existing database has client/project/task structures; do not create a parallel task table.

## Audit findings requiring remediation

1. **Gmail connection status mismatch.** The database constraint on `gmail_mailbox_connections.status` allows `connected`, `reauth_required`, and `revoked`, but the deployed Gmail Edge Function writes `reauthorize_required` on refresh failure. Align the Edge Function to the existing `reauth_required` value (or use a carefully reviewed migration if a new state is truly needed).
2. **Gmail private tables intentionally have no client RLS policies.** Supabase Advisor flags them because RLS is enabled with no policies. This is consistent with the migration's design: revoke all access from public/anon/authenticated and allow only service_role. Keep them inaccessible from browser clients; verify effective grants and schema exposure rather than adding broad user policies just to silence the warning.
3. **ntfy topic table intentionally has no client policy.** The table is service-only and is accessed through narrowly scoped RPCs. Review advisor output for each security-definer function and preserve explicit grants, fixed search_path, and auth.uid() ownership checks.
4. **Security-definer RPCs need function-by-function review.** Advisor reported public execution of shared task brief RPCs and authenticated execution of ntfy RPCs. Some may be intentional, but verify grants and token protections; do not revoke blindly.
5. **Gmail OAuth redirects are hard-coded to the Lovable app domain.** Verify the actual production frontend domain and Google OAuth redirect URI configuration before changing; mismatches can cause redirect_uri_mismatch.
6. **Repository root contains a tracked `.env` file and `.gitignore` does not exclude `.env`.** Do not read or reproduce its contents. Treat this as a potential secret exposure: inspect repository access/history privately, move required values to managed server secrets, add `.env` to `.gitignore`, remove the tracked file in a separate reviewed commit, and rotate any credentials that were real. Never put secrets in this audit document.
7. **Frontend fallback demo tasks.** `WorkboardView.tsx` displays local demo tasks when a client exists but the real task query is empty. Keep clearly marked demo mode; ensure demo IDs can never be passed to update/delete or treated as persisted records.

## Integration architecture

All source providers feed a single ingestion pipeline:

1. Provider adapter / manual share input receives an event.
2. Server validates the user, provider connection, source ownership and webhook signature where applicable.
3. Persist source metadata and a deduplication key.
4. Extract task candidates with AI; preserve original source reference and evidence.
5. Store candidate in Workboard Inbox with status `pending_review`.
6. User reviews, edits, merges, approves or rejects.
7. Approval creates `client_tasks` and source relation atomically; rejection never creates a task.
8. Record sync cursor, retry state and audit log.

AI must not invent deadlines or client/project matches. Unknown fields remain null and are highlighted for review. Preserve source links and only store message content needed for the user's chosen workflow.

### Provider paths

- Gmail: existing Gmail OAuth read-only connection; incremental sync using Gmail history/watch where configured, plus manual email-to-Inbox action.
- Outlook and Teams: Microsoft Graph OAuth with least-privilege delegated scopes; mail/calendar and Teams chat/channel access are separate permissions and may require admin consent. Add subscription renewal and delta sync.
- WhatsApp personal: manual share/forward or copy/paste into the authenticated Inbox. Do not scrape WhatsApp Web or request personal session credentials.
- WhatsApp Business: official Meta Cloud API webhook for the business number; validate webhook signatures and comply with Meta policies/pricing.
- Canva: use supported Canva Connect API capabilities and user-granted scopes; manual design-link capture remains available where API access is limited.

## Proposed incremental schema

First inspect existing migrations and live constraints, then add only missing structures:
- `integration_connections`: owner, provider, external account identity, encrypted credential reference, scopes, status, last sync.
- `integration_sources`: provider event/message identity, source metadata, minimal captured content, dedupe hash, timestamps.
- `workboard_inbox`: candidate task fields, extraction confidence/evidence, review status, reviewer, reviewed_at, resulting task_id.
- `workboard_task_sources`: many-to-many relation between approved task and one or more source records.
- `integration_sync_cursors`: provider-specific incremental cursor per connection.
- `integration_sync_logs`: safe operational logs without access tokens or raw secrets.

All tables must have owner isolation, explicit RLS, unique constraints for deduplication, foreign keys, useful indexes, and server-only access to credentials. Use RPC/transactional server code for approval to prevent duplicate tasks.

## Frontend implementation targets

- Add an Inbox view and authenticated route, with pending count in Workboard navigation.
- Add a manual capture action (paste text, URL, email content or message export) with source type and optional client/project.
- Add integration settings with provider connection state, permissions, last sync and disconnect controls.
- Inbox review screen: source preview, extracted title/description, client/project, priority, deadline, confidence, edit, approve, reject, merge.
- On approval, navigate to the created task in existing Graphic Workspace.
- Keep Workboard task CRUD and Graphic Workspace on the existing `client_tasks` data model.

## Delivery order

1. Remediate verified security/configuration issues and tests.
2. Implement schema + server-side ingestion and transactional approval.
3. Implement Inbox UI and manual capture first.
4. Connect Gmail, then Outlook/Teams.
5. Add WhatsApp personal manual capture and official WhatsApp Business webhook.
6. Add Canva capture/API features.
7. Add end-to-end tests for authorization, dedupe, retry, approval, rejection and task linkage.

## Scope and deployment notes

This document records the audit and intended implementation architecture. It does not claim that provider OAuth credentials, webhook subscriptions, frontend screens, schema additions, or deployments have been configured. Supabase changes require their own migration/deployment step. Lovable tokens or Lovable AI Gateway are not required for this architecture.
