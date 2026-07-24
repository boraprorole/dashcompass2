
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fb_user_id text,
  fb_user_name text,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  scope text,
  discovered_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_connections_report ON public.meta_connections(report_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_connections TO authenticated;
GRANT ALL ON public.meta_connections TO service_role;

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta_connections"
  ON public.meta_connections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Conexoes can view own company meta_connections"
  ON public.meta_connections FOR SELECT
  USING (
    public.has_role(auth.uid(), 'conexoes'::app_role)
    AND report_id IN (
      SELECT r.id FROM public.reports r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.company_id = p.company_id
    )
  );

CREATE POLICY "Conexoes can insert own company meta_connections"
  ON public.meta_connections FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'conexoes'::app_role)
    AND report_id IN (
      SELECT r.id FROM public.reports r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.company_id = p.company_id
    )
  );

CREATE POLICY "Conexoes can delete own company meta_connections"
  ON public.meta_connections FOR DELETE
  USING (
    public.has_role(auth.uid(), 'conexoes'::app_role)
    AND report_id IN (
      SELECT r.id FROM public.reports r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.company_id = p.company_id
    )
  );

CREATE TRIGGER meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
