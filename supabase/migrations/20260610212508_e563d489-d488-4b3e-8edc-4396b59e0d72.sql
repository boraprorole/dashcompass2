-- Adiciona coluna company_id na tabela reports
ALTER TABLE public.reports ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Atualiza GRANTs para garantir que service_role e authenticated possam acessar
GRANT ALL ON public.reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

-- Migração de dados: Tenta vincular relatórios existentes às empresas pelo nome (se possível)
UPDATE public.reports r
SET company_id = c.id
FROM public.companies c
WHERE r.title ILIKE '%' || c.name || '%';

-- Observação: Campos 'title', 'description' e 'url' permanecem na tabela para evitar perda de dados, 
-- mas a UI será alterada para não exigi-los/mostrá-los conforme solicitado.
