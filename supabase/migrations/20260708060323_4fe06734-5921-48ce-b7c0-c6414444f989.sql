CREATE TABLE public.linkedin_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  organization_urn text,
  organization_name text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_connections TO authenticated;
GRANT ALL ON public.linkedin_connections TO service_role;

ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage linkedin_connections"
  ON public.linkedin_connections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_linkedin_connections_updated_at
  BEFORE UPDATE ON public.linkedin_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();