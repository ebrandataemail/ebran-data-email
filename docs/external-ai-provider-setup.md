# External AI provider configuration

Ebran does not use `LOVABLE_API_KEY` or the Lovable AI Gateway.

The server-side AI adapter accepts an OpenAI-compatible endpoint selected by the project owner. It has no default provider and never falls back to OpenAI or Lovable.

Configure these as **server-only environment variables** in the hosting runtime:

- `AI_BASE_URL`: provider API base URL, including the version path when required (for example, `https://provider.example/v1`).
- `AI_API_KEY`: private API key issued by the selected provider.
- `AI_MODEL`: model identifier supported by that provider.

Do not prefix these with `VITE_`, do not put them in frontend code, and do not commit real values to Git.

If one of these variables is missing, AI endpoints return HTTP 503 with a configuration message. Client database, client profile, task, timeline, and file features remain available.

This adapter is provider-neutral at the application layer, but the selected endpoint must implement the OpenAI-compatible Chat Completions API. It does not imply that the provider is OpenAI.
