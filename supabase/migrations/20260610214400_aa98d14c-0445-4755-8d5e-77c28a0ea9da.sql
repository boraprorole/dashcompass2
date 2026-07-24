CREATE TABLE public.schedule_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('social_network', 'objective', 'format')),
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(type, label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_config TO authenticated;
GRANT ALL ON public.schedule_config TO service_role;

ALTER TABLE public.schedule_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedule config" ON public.schedule_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage schedule config" ON public.schedule_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE TRIGGER update_schedule_config_updated_at
BEFORE UPDATE ON public.schedule_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns valores padrão
INSERT INTO public.schedule_config (type, label) VALUES
('social_network', 'Instagram'),
('social_network', 'TikTok'),
('social_network', 'LinkedIn'),
('social_network', 'Facebook'),
('objective', 'Engajamento'),
('objective', 'Conversão'),
('objective', 'Alcance'),
('format', 'Reels'),
('format', 'Carrossel'),
('format', 'Estático'),
('format', 'Stories')
ON CONFLICT DO NOTHING;