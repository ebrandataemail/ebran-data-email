ALTER TABLE public.hermes_chat_messages RENAME TO ai_chat_messages;
ALTER INDEX public.hermes_chat_messages_thread_idx RENAME TO ai_chat_messages_thread_idx;

ALTER POLICY "Users read their own Hermes chat" ON public.ai_chat_messages RENAME TO "Users read their own AI chat";
ALTER POLICY "Users add to their own Hermes chat" ON public.ai_chat_messages RENAME TO "Users add to their own AI chat";
ALTER POLICY "Users clear their own Hermes chat" ON public.ai_chat_messages RENAME TO "Users clear their own AI chat";

GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;