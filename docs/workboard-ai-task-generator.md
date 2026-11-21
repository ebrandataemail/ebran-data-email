# Workboard AI Task Intake & Automation

## Implemented in this increment
- Manual prompt, pasted brief, email/chat transcript and URL reference intake.
- PDF and image attachment support through the configured server-side AI model.
- Existing webhook sources can be processed into drafts without duplicating their intake record.
- Task approval is transactional through `approve_task_draft_items`: parent tasks are included when a selected subtask depends on them, task creation, provenance linking and draft state updates commit or roll back together.
- Webhook endpoint secrets are generated once, stored only as SHA-256 hashes, and never returned again by list/read APIs.
- The public webhook Edge Function accepts bounded JSON POST payloads with a per-endpoint Bearer secret, records idempotency event IDs and creates queued intake records.
- Workboard Copilot currently creates deterministic overdue and stale-task follow-up suggestions from owned task data. It does not yet use an LLM or claim autonomous scheduling.

## Webhook contract
- Method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/task-intake-webhook`
- Header: `Authorization: Bearer <one-time-secret>`
- Content type: `application/json`
- Optional idempotency: `event_id` or `X-Webhook-Event-Id`
- Text fields accepted in order: `text`, `body`, `message`, `content`, `transcript`, `description`, `subject`, `data`.
- Optional source link: `source_url`, `url`, or `permalink`.
- Maximum body: 1 MB. Intake content is truncated to 24,000 characters.
- New events enter Workboard's integration inbox. The user runs analysis and explicitly approves tasks.

## Security notes
- Do not put the endpoint Bearer secret in frontend source, query strings, logs, or screenshots.
- Rotate a webhook by disabling the old endpoint and creating a new one.
- Generic Bearer webhooks work with automation relays such as Make/n8n/Zapier. Direct provider webhooks that require OAuth or signature validation still need their own adapter; do not paste this Bearer token into a provider that cannot send it.
- Provider OAuth tokens belong in private encrypted storage, not these public tables.
- Webhook content is untrusted input and is only used as task context; no action is executed from it automatically.

## Remaining provider-specific work
- Gmail and Outlook: use the existing OAuth mailbox connection, add incremental message sync, scope checks and user-selected folders/labels.
- WhatsApp/Telegram/Slack/Teams/Zoom/Calendar/Figma/GitHub/Zendesk/Intercom: implement provider-specific OAuth/signature verification, event normalization and reconnect handling.
- Audio: configure an OpenAI-compatible transcription endpoint/model and implement transcription; video: extract frames and separately handle audio.
- Proactive recurrence/dependency recommendations need dependency fields, event history and a scheduled worker. Current Copilot suggestions are rules-based, user-visible and dismissible.
