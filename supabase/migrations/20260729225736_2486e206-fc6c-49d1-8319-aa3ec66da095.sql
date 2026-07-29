CREATE TABLE public.bing_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    site_url TEXT NOT NULL,
    api_key TEXT,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (report_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bing_connections TO authenticated;
GRANT ALL ON public.bing_connections TO service_role;

ALTER TABLE public.bing_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bing_connections for their reports"
ON public.bing_connections
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.reports r
        JOIN public.companies c ON r.company_id = c.id
        WHERE r.id = bing_connections.report_id
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND (role IN ('admin_global', 'admin_agencia'))
                AND (agency_id IS NULL OR agency_id = c.agency_id)
            )
        )
    )
);

INSERT INTO public.app_features (key, label, enabled)
VALUES ('bing_webmaster', 'Bing Webmaster Tools', true)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;
