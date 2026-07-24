ALTER TABLE public.ai_messages ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.ai_messages ALTER COLUMN id DROP DEFAULT;