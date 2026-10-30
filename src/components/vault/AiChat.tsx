import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Eraser, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import hermesMark from "@/assets/hermes-mark.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { asset } from "@/data/asset";
import { supabase } from "@/integrations/supabase/client";
import { aiChatHistory, aiClearChat } from "@/lib/assistant/assistant.functions";
import { errorMessage } from "./use-ai";

const SUGGESTIONS = [
  "Apa risiko keamanan terbesar akun ini?",
  "Kapan token API harus dirotasi?",
  "Ringkas status akun ini untuk tim.",
];

function AiAvatar({ className = "size-7" }: { className?: string }) {
  return <img src={hermesMark} alt="Hermes" width={28} height={28} className={className} />;
}

function ChatWindow({ initialMessages }: { initialMessages: UIMessage[] }) {
  const queryClient = useQueryClient();
  const clearFn = useServerFn(aiClearChat);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            body: { assetId: asset.id, message: messages.at(-1) },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: `ai-${asset.id}`,
    messages: initialMessages,
    transport,
    onError: (err) => {
      let description = err.message;
      try {
        const parsed = JSON.parse(err.message) as { error?: string };
        if (parsed.error) description = parsed.error;
      } catch {
        /* plain text error */
      }
      toast.error("AI tidak bisa menjawab", { description });
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "chat", asset.id] });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
  };

  const clear = async () => {
    try {
      await clearFn({ data: { assetId: asset.id } });
      setMessages([]);
      queryClient.setQueryData(["ai", "chat", asset.id], { json: "[]" });
      toast("Riwayat chat dihapus");
    } catch (err) {
      toast.error("Gagal menghapus", { description: errorMessage(err) });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 px-5 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-3">
                <AiAvatar className="size-12" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-foreground">Tanya AI tentang aset ini</p>
                  <p className="text-xs text-muted-foreground">
                    AI membaca data akun (tanpa password & kode rahasia) lalu menjawab.
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                {m.role === "assistant" && <AiAvatar className="size-6" />}
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type === "reasoning" && part.text.trim() && m.role === "assistant") {
                      return (
                        <details key={i} className="rounded-md border border-border bg-subtle px-3 py-2 text-xs text-muted-foreground">
                          <summary className="cursor-pointer select-none font-medium">Proses berpikir AI</summary>
                          <p className="mt-1.5 whitespace-pre-wrap">{part.text}</p>
                        </details>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <AiAvatar className="size-6" />
              <MessageContent>
                <Shimmer>AI sedang berpikir…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && status === "error" && (
            <p className="text-center text-xs text-destructive">Pesan terakhir gagal. Kirim ulang untuk mencoba lagi.</p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-4">
        <PromptInput
          onSubmit={(msg: PromptInputMessage) => send(msg.text)}
          className="rounded-xl"
        >
          <PromptInputTextarea ref={textareaRef} placeholder="Tanya apa saja tentang akun ini…" autoFocus />
          <PromptInputFooter className="justify-between">
            <Button type="button" variant="ghost" size="xs" onClick={clear} disabled={busy || messages.length === 0}>
              <Eraser />
              Hapus riwayat
            </Button>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function ChatLoader() {
  const historyFn = useServerFn(aiChatHistory);
  const history = useQuery({
    queryKey: ["ai", "chat", asset.id],
    queryFn: () => historyFn({ data: { assetId: asset.id } }),
    staleTime: Infinity,
    retry: false,
  });

  if (history.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Memuat riwayat…
      </div>
    );
  }
  if (history.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        {errorMessage(history.error)}
        <Button variant="outline" size="sm" onClick={() => history.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }
  return <ChatWindow initialMessages={JSON.parse(history.data.json) as UIMessage[]} />;
}

export function AiChatSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 pr-12">
          <AiAvatar className="size-8" />
          <div className="min-w-0">
            <SheetTitle className="text-sm">Asisten AI</SheetTitle>
            <SheetDescription className="truncate text-xs">{asset.title}</SheetDescription>
          </div>
        </div>
        {open && <ChatLoader />}
      </SheetContent>
    </Sheet>
  );
}
