
CREATE TABLE public.google_ads_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  period_start date,
  period_end date,
  currency text NOT NULL DEFAULT 'BRL',
  source_filename text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_label)
);

CREATE TABLE public.google_ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.google_ads_datasets(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  status text,
  campaign_type text,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  avg_cpc numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  top_impression_share numeric,
  abs_top_impression_share numeric,
  conversions numeric NOT NULL DEFAULT 0,
  view_conversions numeric NOT NULL DEFAULT 0,
  cost_per_conv numeric NOT NULL DEFAULT 0,
  conv_rate numeric NOT NULL DEFAULT 0
);

CREATE INDEX ON public.google_ads_datasets (company_id);
CREATE INDEX ON public.google_ads_campaigns (dataset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_ads_datasets TO authenticated;
GRANT ALL ON public.google_ads_datasets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_ads_campaigns TO authenticated;
GRANT ALL ON public.google_ads_campaigns TO service_role;

ALTER TABLE public.google_ads_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Datasets readable by company members"
ON public.google_ads_datasets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'team')
  OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Datasets writable by admin"
ON public.google_ads_datasets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Campaigns readable via dataset"
ON public.google_ads_campaigns FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.google_ads_datasets d
    WHERE d.id = google_ads_campaigns.dataset_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'team')
        OR d.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
  )
);

CREATE POLICY "Campaigns writable by admin"
ON public.google_ads_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_google_ads_datasets_updated
BEFORE UPDATE ON public.google_ads_datasets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
