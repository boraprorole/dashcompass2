
-- Garantir permissões básicas
GRANT INSERT, UPDATE, SELECT, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

-- Remover políticas possivelmente conflitantes
DROP POLICY IF EXISTS "Global admins manage all" ON public.reports;
DROP POLICY IF EXISTS "Agency admins manage their reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their company reports" ON public.reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.reports;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.reports;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.reports;

-- Habilitar RLS (caso não esteja)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 1. Política de INSERÇÃO
CREATE POLICY "Enable insert for authenticated users" 
ON public.reports 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Política de SELEÇÃO
CREATE POLICY "Enable select for authenticated users" 
ON public.reports 
FOR SELECT 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin_global') OR
  created_by = auth.uid() OR 
  agency_id IN (
    SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND agency_id IS NOT NULL
  ) OR
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

-- 3. Política de ATUALIZAÇÃO
CREATE POLICY "Enable update for authenticated users" 
ON public.reports 
FOR UPDATE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin_global') OR
  created_by = auth.uid() OR
  agency_id IN (
    SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND agency_id IS NOT NULL
  )
);

-- 4. Política de EXCLUSÃO
CREATE POLICY "Enable delete for authenticated users" 
ON public.reports 
FOR DELETE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin_global') OR
  created_by = auth.uid() OR
  agency_id IN (
    SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND agency_id IS NOT NULL
  )
);
