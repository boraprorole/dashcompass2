
CREATE TABLE public.windsor_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  connector TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, connector, account_id)
);

CREATE INDEX ON public.windsor_connections (report_id);

GRANT SELECT ON public.windsor_connections TO authenticated;
GRANT ALL ON public.windsor_connections TO service_role;

ALTER TABLE public.windsor_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage windsor connections"
  ON public.windsor_connections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view windsor connections of accessible reports"
  ON public.windsor_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports r
      JOIN public.profiles p ON p.company_id = r.company_id
      WHERE r.id = windsor_connections.report_id
        AND p.id = auth.uid()
    )
  );
