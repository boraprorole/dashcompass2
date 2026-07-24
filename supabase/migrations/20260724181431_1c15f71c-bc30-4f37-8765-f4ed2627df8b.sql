-- Habilitar RLS se não estiver
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos (opcional, mas recomendado se estivermos redefinindo)
-- DROP POLICY IF EXISTS "Global admins manage all" ON public.reports;
-- DROP POLICY IF EXISTS "Agency admins manage their reports" ON public.reports;

-- Política para Admin Global: Acesso total
CREATE POLICY "Global admins manage all"
ON public.reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin_global'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin_global'
  )
);

-- Política para Admin de Agência: Acesso aos relatórios da sua agência
CREATE POLICY "Agency admins manage their reports"
ON public.reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin_agencia'
      AND agency_id = public.reports.agency_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin_agencia'
      AND agency_id = public.reports.agency_id
  )
);

-- Política para visualização (equipe/usuários): Acesso se vinculado à agência ou empresa
CREATE POLICY "Users can view relevant reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (
        (role = 'admin_agencia' AND agency_id = public.reports.agency_id) OR
        (role IN ('team', 'equipe') AND agency_id = public.reports.agency_id)
      )
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND company_id = public.reports.company_id
  )
);
