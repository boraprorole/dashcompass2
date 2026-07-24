
CREATE TABLE public.ga_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  ga_property_id TEXT NOT NULL,
  label TEXT,
  google_email TEXT,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (report_id, ga_property_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ga_connections TO authenticated;
GRANT ALL ON public.ga_connections TO service_role;

ALTER TABLE public.ga_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ga_connections"
  ON public.ga_connections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ga_connections_updated_at
  BEFORE UPDATE ON public.ga_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
