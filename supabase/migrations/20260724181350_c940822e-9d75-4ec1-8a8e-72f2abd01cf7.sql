-- Garantir que a role 'authenticated' tenha permissões nas tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_sections TO authenticated;

-- Garantir acesso ao service_role também
GRANT ALL ON public.reports TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.report_sections TO service_role;
