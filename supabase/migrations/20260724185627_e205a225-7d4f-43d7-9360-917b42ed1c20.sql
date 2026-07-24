CREATE TABLE IF NOT EXISTS public.gsc_connections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    google_email text,
    refresh_token text NOT NULL,
    site_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(report_id)
);

CREATE TABLE IF NOT EXISTS public.google_ads_connections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    google_email text,
    refresh_token text NOT NULL,
    customer_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(report_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsc_connections TO authenticated;
GRANT ALL ON public.gsc_connections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_ads_connections TO authenticated;
GRANT ALL ON public.google_ads_connections TO service_role;

ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage GSC connections" ON public.gsc_connections;
CREATE POLICY "Admins can manage GSC connections" ON public.gsc_connections
    FOR ALL TO authenticated USING (
      public.has_role(auth.uid(), 'admin_global') OR 
      EXISTS (
        SELECT 1 FROM public.reports r 
        WHERE r.id = report_id 
        AND (
          r.created_by = auth.uid() OR 
          r.agency_id IN (SELECT agency_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        )
      )
    );

DROP POLICY IF EXISTS "Admins can manage Google Ads connections" ON public.google_ads_connections;
CREATE POLICY "Admins can manage Google Ads connections" ON public.google_ads_connections
    FOR ALL TO authenticated USING (
      public.has_role(auth.uid(), 'admin_global') OR 
      EXISTS (
        SELECT 1 FROM public.reports r 
        WHERE r.id = report_id 
        AND (
          r.created_by = auth.uid() OR 
          r.agency_id IN (SELECT agency_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        )
      )
    );
