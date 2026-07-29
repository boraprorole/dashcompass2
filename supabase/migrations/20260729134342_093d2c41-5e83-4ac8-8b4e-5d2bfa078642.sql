
CREATE TABLE public.tiktok_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    tiktok_advertiser_id text,
    label text,
    access_token text,
    refresh_token text,
    tiktok_email text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(report_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;

ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage TikTok connections"
ON public.tiktok_connections
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'admin_global') OR
    EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.id = report_id
    )
);

INSERT INTO public.app_features (key, label, enabled)
VALUES ('tiktok', 'Relatórios do TikTok Ads', true)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;
