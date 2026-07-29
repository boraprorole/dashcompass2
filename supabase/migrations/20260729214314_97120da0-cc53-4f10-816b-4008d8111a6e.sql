
-- Drop unique constraints to allow multiple connections per report
ALTER TABLE public.gsc_connections DROP CONSTRAINT IF EXISTS gsc_connections_report_id_key;
ALTER TABLE public.google_ads_connections DROP CONSTRAINT IF EXISTS google_ads_connections_report_id_key;
ALTER TABLE public.ga_connections DROP CONSTRAINT IF EXISTS ga_connections_report_id_key;

-- Add helper columns for distinguishing connections
ALTER TABLE public.gsc_connections ADD COLUMN IF NOT EXISTS type text DEFAULT 'web';
ALTER TABLE public.gsc_connections ADD COLUMN IF NOT EXISTS label text;

-- Re-apply grants just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsc_connections TO authenticated;
GRANT ALL ON public.gsc_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_ads_connections TO authenticated;
GRANT ALL ON public.google_ads_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ga_connections TO authenticated;
GRANT ALL ON public.ga_connections TO service_role;
