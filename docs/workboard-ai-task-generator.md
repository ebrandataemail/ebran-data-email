# Workboard AI Task Intake — audit & implementation notes

## Current architecture audit
- `client_tasks` is the canonical task table and already stores client, title, description, status, priority, due date, assignee, task type, sort order and timestamps.
- `clients` and `projects` are existing user-owned tables. Task Brief already uses the server-only AI adapter in `src/lib/ai/provider.server.ts` and `runObject` from `src/lib/assistant/assistant.server.ts`.
- Workboard reads Supabase data through `useWorkboardData`; `WorkboardView` owns the overall page composition and Graphic Workspace / Task Board components.
- The new intake flow keeps `client_tasks` canonical; intake sources, generation runs, drafts, draft items, automation rules, suggestions and provenance links are supporting workflow tables.

## Phase coverage
1. **Phase 1 — manual intake:** prompt, pasted brief/chat/meeting transcript, URL reference, PDF/image/TXT/MD/CSV/HTML/JSON upload; AI extracts tasks and subtasks; user reviews and approves selected rows.
2. **Phase 2 — multimodal foundation:** image/PDF file parts are sent server-side to the configured model; audio/video are represented in the source taxonomy for future transcription / frame extraction adapters. This commit does not claim that raw audio/video transcription is active.
3. **Phase 3 — integration foundation:** source types and per-user automation-rule storage cover Gmail, Outlook, WhatsApp, Telegram, Slack, Teams, Calendar, Zoom, Figma, GitHub, Zendesk, Intercom and webhooks. Live OAuth/webhook adapters still require provider credentials, scopes, verification and endpoint configuration.
4. **Phase 4 — copilot foundation:** persistent AI suggestions support overdue, dependency, subtask, recurring, priority, follow-up and duplicate suggestion categories. A scheduler/worker and suggestion-generation job are required before proactive suggestions run automatically.

## Security and correctness
- All new public tables enable RLS and restrict all operations to `auth.uid() = user_id`.
- Server functions validate ownership of the selected client and project before generation; approval rechecks draft/item ownership.
- Source content is treated as untrusted input; prompt-injection text in attachments is not followed.
- Missing deadline/assignee remain null; no silent inference. Task generation creates drafts only; selected tasks become `client_tasks` after explicit approval.
- Source provenance is preserved through `task_source_links` and task source metadata.
- URL is stored as reference only in this iteration; the server does not fetch arbitrary URLs, avoiding SSRF and avoiding false claims that a page was read.

## Deployment requirements / next integration wiring
- Configure a server-side model that accepts the supported file parts through existing `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`.
- To activate real integrations, connect provider OAuth scopes/webhooks and implement provider-specific ingestion adapters. Never store provider tokens in these public tables; use encrypted/private secret storage.
- For recurring/proactive copilot, deploy a scheduled worker/Edge Function and persist its outputs in `task_ai_suggestions`.
- Audio/video require transcription and frame-extraction adapters; do not mark a raw media file as transcribed until a worker has actually processed it.
