<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Vault UI lives in `src/components/vault/` (sidebar, header, insight rail, one file per detail tab under `tabs/`); shared field/copy/reveal primitives sit in `primitives.tsx` so every tab renders credentials the same way.
- Dummy asset data lives in `src/data/asset.ts` until real asset storage exists, so swapping in real data touches one module.
- Hermes AI runs on Lovable AI (Responses API) server-side only: provider/error helpers in `src/lib/ai/lovable.server.ts`, prompts in `src/lib/hermes/hermes.server.ts`, RPCs in `hermes.functions.ts`, streaming chat at `/api/hermes/chat` — so the model, keys and prompts never reach the browser.
- AI prompts receive asset data only through `buildAssetBrief` in `src/lib/hermes/context.ts`, which strips raw secrets (tested in `src/test/hermes-context.test.ts`); client code fills secret values locally (e.g. the .env formatter only gets variable names from AI).
- The vault page lives under `src/routes/_authenticated/` and every AI endpoint requires a Supabase bearer token, so AI credits and saved chats are never reachable signed-out.
- Hermes chat history is loaded and saved server-side per user + asset in `hermes_chat_messages`; the client sends only the newest message, so history can't be forged from the browser.
- Email vault: `email_accounts` + `lovable_projects`; passwords are AES-GCM encrypted server-side with the `HERMES_VAULT_KEY` secret (`src/lib/vault/crypto.server.ts`) and only decrypted on explicit reveal, so the database and list responses never hold plaintext.
- Password-risk facts (length, pattern, keyed fingerprint for reuse) are computed at write time and stored, so audits and the UI never need to decrypt.
- CSV import is a pure normalizer (`src/lib/vault/normalize.ts`, tested) shared by the browser preview and the server; import upserts by (user, email) so re-importing a sheet syncs instead of duplicating.
- All AI cues (sparkles, AI badges, AI buttons) use the `ai*` tokens and `ai` / `ai-outline` / `ai-ghost` button variants defined in `src/styles.css`, never ad-hoc colors.
