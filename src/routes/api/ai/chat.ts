import { createFileRoute } from "@tanstack/react-router";

import { handleHermesChat } from "@/lib/hermes/chat.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: { handlers: { POST: ({ request }) => handleHermesChat(request) } },
});
