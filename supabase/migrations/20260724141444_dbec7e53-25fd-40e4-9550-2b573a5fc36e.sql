-- Create table for settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage settings" 
ON public.app_settings 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin_global') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin_global') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Initial primary color
INSERT INTO public.app_settings (key, value)
VALUES ('primary_color', '"#3DFC03"')
ON CONFLICT (key) DO NOTHING;
