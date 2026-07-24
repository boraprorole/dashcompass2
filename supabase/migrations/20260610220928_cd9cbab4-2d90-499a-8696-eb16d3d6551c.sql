ALTER TABLE public.schedule_events ADD COLUMN IF NOT EXISTS funnel_stage TEXT;
COMMENT ON COLUMN public.schedule_events.funnel_stage IS 'Etapa do funil de vendas (Topo, Meio, Fundo)';
