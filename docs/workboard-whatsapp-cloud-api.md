# WhatsApp Cloud API → Workboard

This adapter receives inbound WhatsApp Cloud API messages and stores them as `task_intake_sources` records. It does not create tasks automatically: users still click **Analisis**, review the generated draft, and approve selected items.

## Setup

1. In Workboard → Integrasi masuk, select a client and optional project, choose `whatsapp`, then create the endpoint.
2. Copy the displayed Callback URL and Meta Verify Token. The token is shown only once; if lost, create a new endpoint and disable/delete the old one.
3. In Meta for Developers, configure the WhatsApp product webhook callback with those values and subscribe to the `messages` field.
4. In Supabase Dashboard → Edge Functions → Secrets, set `WHATSAPP_APP_SECRET` to the App Secret from the Meta app that owns the WhatsApp webhook. Do not use the WhatsApp access token here; this secret validates `X-Hub-Signature-256`.
5. Send a test message to the connected WhatsApp Business number. It should appear in Workboard → Inbox integrasi. Click **Analisis**, review the result, then approve only the tasks you want created.

## Security and processing behavior

- `GET` subscription verification checks the endpoint ID, enabled WhatsApp endpoint, and SHA-256 hash of the Meta Verify Token.
- `POST` requests require a valid HMAC-SHA256 signature over the exact raw request body using `WHATSAPP_APP_SECRET`.
- The raw Verify Token is never stored in Postgres; only its SHA-256 hash is stored in `task_integration_endpoints.token_hash`.
- Incoming provider message IDs are deduplicated through `task_webhook_events`.
- Text, button, interactive reply, location, contact, and media captions are captured. Media binaries are not downloaded; audio is not transcribed in this adapter.
- Delivery/status callbacks and non-message webhook fields are ignored.
- One Meta App Secret is configured per Supabase project. If multiple independent Meta apps are needed, add per-endpoint encrypted credential storage and key management before enabling them.

## Required secret

```bash
WHATSAPP_APP_SECRET=<Meta App Secret>
```

Set it in Supabase Edge Function Secrets, never in GitHub, browser storage, or frontend environment variables.
