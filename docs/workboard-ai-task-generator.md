# Workboard AI Task Intake & Automation

## Implemented
- Manual prompts, pasted briefs, chat and meeting notes, URL references, TXT/MD/CSV/HTML/JSON text files, PDF and image attachments.
- Audio uploads are transcribed server-side using the OpenAI-compatible `/audio/transcriptions` endpoint. Default model: `whisper-1`; override with server env `AI_TRANSCRIPTION_MODEL`.
- Video uploads are sampled into up to five frames in the browser and analyzed visually. Video audio is not transcribed; upload the audio track separately.
- Gmail import reuses the existing Gmail OAuth connection and its read-only scope. The Workboard action fetches up to 10 recent inbox messages from the last 14 days, deduplicates by Gmail message ID, and stores them in the integration inbox as queued sources.
- Secure webhook endpoints use one-time random Bearer secrets; only SHA-256 hashes are stored. Webhook event IDs are idempotent.
- Existing webhook and Gmail sources can be processed into task drafts without duplicating their intake records.
- Task approval is transactional through `approve_task_draft_items`. Selected child items include their pending parent items; task creation, provenance links, draft-item status and draft status commit or roll back together.
- Workboard Copilot has immediate rules-based overdue/stale suggestions and a daily `pg_cron` job at 02:00 UTC (09:00 WIB) for overdue, stale and repeated-completion patterns. Repeated titles completed at least three times in 90 days can produce a recurring-template suggestion.

## Gmail sync
- Requires the existing Gmail OAuth connection to be `connected` with the read-only Gmail scope.
- User chooses a Gmail account and a Workboard client/project, then requests a recent inbox sync.
- Email body text, sender, subject, date and Gmail message URL are stored as source provenance. No task is created automatically; the user analyzes the source and approves the resulting draft.
- Gmail access tokens remain encrypted in the existing private mailbox connection store.

## Webhook contract
- Method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/task-intake-webhook`
- Header: `Authorization: Bearer <one-time-secret>`
- Content type: `application/json`
- Optional idempotency: `event_id` or `X-Webhook-Event-Id`
- Text fields accepted: `text`, `body`, `message`, `content`, `transcript`, `description`, `subject`, `data`.
- Optional source link: `source_url`, `url`, or `permalink`.
- Maximum body: 1 MB; extracted text is capped at 24,000 characters.
- New events enter the Workboard integration inbox; users run analysis and explicitly approve tasks.

## Security and limitations
- Do not put webhook Bearer secrets in frontend source, query strings, logs or screenshots. Rotate by disabling the old endpoint and creating a new one.
- Generic Bearer webhooks work with Make, n8n, Zapier or systems supporting custom headers. Direct provider webhooks requiring provider-specific OAuth/signature verification still need their own adapter.
- Provider OAuth tokens stay in encrypted/private storage, not public task tables.
- Uploaded/webhook content is untrusted context. It cannot trigger external actions or publish/send anything automatically.
- DOCX/XLSX parsing, native Outlook/WhatsApp/Telegram/Slack/Teams/Zoom/Calendar/Figma/GitHub/Zendesk/Intercom OAuth adapters, automatic background AI processing of webhook inbox items, video audio transcription, dependency graph UI and model-generated recurring-pattern suggestions remain follow-up work. The current Copilot is deterministic and data-driven, not an LLM-generated task plan.
