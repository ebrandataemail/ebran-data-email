// Single switch point for the AI runtime used by Ebran's server-side client AI features.
// Today this is the AI runtime already configured on `main` (Lovable AI Gateway).
// To move to an external OpenAI-compatible provider, change ONLY this file, e.g.:
//   export { createAiModel, toAiError } from "./provider.server";
//   export const aiProviderOptions = (_effort?: "low" | "medium") => ({});
export { createAiModel, aiProviderOptions, toAiError } from "./lovable.server";
