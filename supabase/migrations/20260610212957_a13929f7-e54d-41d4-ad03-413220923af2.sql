-- Remove as políticas que dependem da tabela report_assignments
DROP POLICY IF EXISTS "Users view assigned reports" ON public.reports;
DROP POLICY IF EXISTS "Users view sections of assigned reports" ON public.report_sections;

-- Agora podemos remover a tabela com segurança
DROP TABLE IF EXISTS public.report_assignments;

-- Atualiza as políticas de RLS para Relatórios baseadas em Empresa
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR 
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Atualiza as políticas de RLS para Seções de Relatórios
ALTER TABLE public.report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company report sections" ON public.report_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id AND (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
        r.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- Atualiza as políticas de RLS para o Cronograma (Schedule Events)
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all schedule events" ON public.schedule_events;
DROP POLICY IF EXISTS "Users can view relevant schedule events" ON public.schedule_events;

CREATE POLICY "Users can view company schedule events" ON public.schedule_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR 
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );
