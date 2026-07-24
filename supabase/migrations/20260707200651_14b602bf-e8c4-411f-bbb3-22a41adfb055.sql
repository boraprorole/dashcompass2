
CREATE TABLE public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  year smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  quantity integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO authenticated;
GRANT ALL ON public.entregas TO service_role;

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage entregas"
  ON public.entregas
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view company entregas"
  ON public.entregas
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX entregas_company_year_idx ON public.entregas (company_id, year);

CREATE TRIGGER entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
