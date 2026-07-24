
CREATE TABLE public.pipedrive_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  company_domain text NOT NULL,
  api_domain text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  pd_user_id bigint,
  pd_user_name text,
  pd_user_email text,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipedrive_connections TO authenticated;
GRANT ALL ON public.pipedrive_connections TO service_role;

ALTER TABLE public.pipedrive_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pipedrive connections"
  ON public.pipedrive_connections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Report members can view pipedrive connection"
  ON public.pipedrive_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      LEFT JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = pipedrive_connections.report_id
        AND (public.has_role(auth.uid(), 'admin') OR p.company_id = r.company_id)
    )
  );

CREATE TRIGGER pipedrive_connections_updated_at
  BEFORE UPDATE ON public.pipedrive_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
