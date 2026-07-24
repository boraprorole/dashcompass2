
CREATE TABLE public.ai_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  mode TEXT NOT NULL DEFAULT 'general',
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai threads"
  ON public.ai_threads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_threads_user_updated_idx ON public.ai_threads (user_id, updated_at DESC);

CREATE TRIGGER ai_threads_set_updated_at
  BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai messages"
  ON public.ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_threads t
      WHERE t.id = ai_messages.thread_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_threads t
      WHERE t.id = ai_messages.thread_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX ai_messages_thread_created_idx ON public.ai_messages (thread_id, created_at ASC);
