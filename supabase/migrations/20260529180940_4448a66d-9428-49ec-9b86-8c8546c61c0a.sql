CREATE TABLE public.report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  title text NOT NULL,
  embed_code text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_sections TO authenticated;
GRANT ALL ON public.report_sections TO service_role;

ALTER TABLE public.report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sections"
ON public.report_sections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view sections of assigned reports"
ON public.report_sections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.report_assignments ra
    WHERE ra.report_id = report_sections.report_id
      AND ra.user_id = auth.uid()
  )
);

CREATE TRIGGER set_report_sections_updated_at
BEFORE UPDATE ON public.report_sections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_report_sections_report_id ON public.report_sections(report_id);