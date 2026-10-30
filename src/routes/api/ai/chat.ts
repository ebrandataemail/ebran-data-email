import { createFileRoute } from "@tanstack/react-router";

import { handleAiChat } from "@/lib/assistant/chat.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: { handlers: { POST: ({ request }) => handleAiChat(request) } },
});
