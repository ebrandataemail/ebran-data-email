# External AI provider configuration

Ebran uses the OpenAI API directly from its server-side AI adapter. It does not use `LOVABLE_API_KEY`, a Lovable token, or the Lovable AI Gateway.

OpenAI is the default provider:
- `AI_BASE_URL=https://api.openai.com/v1`
- `AI_MODEL=gpt-4.1`
- `AI_API_KEY`: required private API key

The endpoint and model can be overridden for another OpenAI-compatible Chat Completions provider. Keep all values server-side. Never prefix them with `VITE_`, put them in browser code, or commit real credentials to Git.

Add `AI_API_KEY` to the production hosting environment as a secret, then redeploy/restart the server runtime so it reads the new value. If the key is missing, AI endpoints return HTTP 503. Invalid credentials return HTTP 401; exhausted provider quota may return HTTP 402 or 429.

The AI adapter uses the Chat Completions API. Other application features such as database, client profiles, tasks, timelines, and files remain available even when AI is not configured.
