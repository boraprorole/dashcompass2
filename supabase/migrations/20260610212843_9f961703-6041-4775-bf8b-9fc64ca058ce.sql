ALTER TABLE public.schedule_events 
  ADD COLUMN drive_link TEXT,
  ADD COLUMN social_network TEXT,
  ADD COLUMN objective TEXT,
  ADD COLUMN format TEXT,
  ADD COLUMN kanban_stage TEXT DEFAULT 'Idéia' CHECK (kanban_stage IN ('Idéia', 'Em produção', 'Pronto', 'Postado'));

-- Atualiza GRANTs just in case
GRANT ALL ON public.schedule_events TO authenticated;
GRANT ALL ON public.schedule_events TO service_role;
