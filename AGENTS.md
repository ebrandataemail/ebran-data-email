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
- Dummy asset data lives in `src/data/asset.ts` until the Hermes Agent backend exists, so swapping in real data touches one module.
- All AI cues (sparkles, AI badges, AI buttons) use the `ai*` tokens and `ai` / `ai-outline` / `ai-ghost` button variants defined in `src/styles.css`, never ad-hoc colors.
