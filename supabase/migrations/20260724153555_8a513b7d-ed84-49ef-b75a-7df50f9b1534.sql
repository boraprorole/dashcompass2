-- Adicionar coluna agency_id na tabela companies se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.companies'::regclass AND attname = 'agency_id') THEN
        ALTER TABLE public.companies ADD COLUMN agency_id uuid REFERENCES public.agencies(id);
    END IF;
END $$;

-- Atualizar políticas de RLS para companies
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- Política para Admin Global: Pode fazer tudo
CREATE POLICY "Global admins can manage all companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_global'))
WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

-- Política para Admin Agência: Pode gerenciar apenas as empresas da sua agência
CREATE POLICY "Agency admins can manage their own companies"
ON public.companies
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin_agencia') AND 
    agency_id IN (
        SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_agencia'
    )
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin_agencia') AND 
    agency_id IN (
        SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_agencia'
    )
);

-- Política para Inserção (necessária separada para garantir que o agency_id seja o correto do usuário)
CREATE POLICY "Agency admins can insert companies for their agency"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin_agencia') AND 
    agency_id IN (
        SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_agencia'
    )
);

-- Política de Leitura: Usuários veem empresas da sua agência ou se forem admin global
CREATE POLICY "Users can view relevant companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin_global') OR
    agency_id IN (
        SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
);
