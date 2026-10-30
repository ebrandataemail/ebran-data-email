CREATE TABLE public.hermes_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id text NOT NULL,
  message_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_id, message_id)
);

GRANT SELECT, INSERT, DELETE ON public.hermes_chat_messages TO authenticated;
GRANT ALL ON public.hermes_chat_messages TO service_role;

ALTER TABLE public.hermes_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own Hermes chat"
  ON public.hermes_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add to their own Hermes chat"
  ON public.hermes_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users clear their own Hermes chat"
  ON public.hermes_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX hermes_chat_messages_thread_idx
  ON public.hermes_chat_messages (user_id, asset_id, seq);