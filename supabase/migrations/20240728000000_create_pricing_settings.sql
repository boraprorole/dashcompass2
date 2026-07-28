CREATE TABLE public.pricing_settings (
    key TEXT PRIMARY KEY,
    value_brl NUMERIC NOT NULL DEFAULT 0,
    value_usd NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_settings TO authenticated;
GRANT ALL ON public.pricing_settings TO service_role;
GRANT SELECT ON public.pricing_settings TO anon;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.pricing_settings FOR SELECT USING (true);
CREATE POLICY "Allow global admin write access" ON public.pricing_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_global'));

INSERT INTO public.pricing_settings (key, value_brl, value_usd) VALUES 
('starter', 99.00, 29.00),
('agency', 159.00, 99.00),
('agency_pro', 499.00, 249.00)
ON CONFLICT (key) DO NOTHING;
