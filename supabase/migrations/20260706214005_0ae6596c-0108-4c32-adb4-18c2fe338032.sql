
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pauta',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT ALL ON public.demandas TO service_role;

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admins can view demandas" ON public.demandas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can insert demandas" ON public.demandas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can update demandas" ON public.demandas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can delete demandas" ON public.demandas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER demandas_updated_at BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX demandas_status_idx ON public.demandas(status);
CREATE INDEX demandas_assignee_idx ON public.demandas(assignee_id);
