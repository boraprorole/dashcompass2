CREATE TABLE public.rdstation_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  account_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id)
);

GRANT ALL ON public.rdstation_connections TO service_role;

ALTER TABLE public.rdstation_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can see/manage connections directly; server functions use service role
CREATE POLICY "Admins manage rdstation_connections"
  ON public.rdstation_connections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rdstation_connections TO authenticated;

CREATE TRIGGER trg_rdstation_connections_updated_at
  BEFORE UPDATE ON public.rdstation_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();