-- Adiciona a coluna logo_url à tabela companies se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- Atualiza a função createReportImpl para herdar o logo da empresa caso o relatório não tenha um
CREATE OR REPLACE FUNCTION public.sync_report_logo_with_company()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NOT NULL AND NEW.logo_url IS NULL THEN
        SELECT logo_url INTO NEW.logo_url FROM public.companies WHERE id = NEW.company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_report_logo ON public.reports;
CREATE TRIGGER tr_sync_report_logo
BEFORE INSERT OR UPDATE OF company_id ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.sync_report_logo_with_company();
